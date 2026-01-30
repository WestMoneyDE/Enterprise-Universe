// =============================================================================
// Lead Scoring Engine - Real Implementation
// =============================================================================
// Engagement-heavy scoring: 40% Engagement, 30% Behavioral, 20% Demographic, 10% Firmographic
// Scores update in real-time on every engagement event

import { db, contacts, contactActivities, deals, eq, and, gte, desc, sql } from "@nexus/db";

// =============================================================================
// TYPES
// =============================================================================

export interface LeadScore {
  contactId: string;
  total: number; // 0-100
  grade: "A" | "B" | "C" | "D";
  breakdown: {
    engagement: number; // 0-100, weight 40%
    behavioral: number; // 0-100, weight 30%
    demographic: number; // 0-100, weight 20%
    firmographic: number; // 0-100, weight 10%
  };
  signals: ScoreSignal[];
  calculatedAt: Date;
  previousScore?: number;
  previousGrade?: "A" | "B" | "C" | "D";
}

export interface ScoreSignal {
  category: "engagement" | "behavioral" | "demographic" | "firmographic";
  signal: string;
  points: number;
  occurredAt?: Date;
  decayedPoints?: number;
}

export interface ScoringConfig {
  weights: {
    engagement: number;
    behavioral: number;
    demographic: number;
    firmographic: number;
  };
  thresholds: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
  decayEnabled: boolean;
  decayPeriodDays: number;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const DEFAULT_CONFIG: ScoringConfig = {
  weights: {
    engagement: 0.4,
    behavioral: 0.3,
    demographic: 0.2,
    firmographic: 0.1,
  },
  thresholds: {
    A: 80,
    B: 60,
    C: 40,
    D: 0,
  },
  decayEnabled: true,
  decayPeriodDays: 7, // Points decay over 7 days
};

// =============================================================================
// SCORING RULES
// =============================================================================

// Engagement signals (40% weight)
const ENGAGEMENT_SIGNALS: Record<string, { points: number; decay: number }> = {
  email_opened: { points: 5, decay: 1 }, // -1 per week
  email_clicked: { points: 10, decay: 2 },
  presentation_viewed: { points: 15, decay: 2 },
  presentation_completed: { points: 25, decay: 3 },
  website_visit: { points: 3, decay: 1 },
  multiple_sessions: { points: 10, decay: 2 },
  document_viewed: { points: 8, decay: 1 },
  video_watched: { points: 12, decay: 2 },
  webinar_attended: { points: 20, decay: 3 },
  chat_interaction: { points: 7, decay: 1 },
};

// Behavioral signals (30% weight)
const BEHAVIORAL_SIGNALS: Record<string, number> = {
  contact_form_submitted: 20,
  bauherren_pass_requested: 30,
  kundenkarte_created: 25,
  meeting_scheduled: 35,
  quote_requested: 40,
  document_downloaded: 15,
  pricing_page_viewed: 12,
  demo_requested: 35,
  trial_started: 30,
  referral_made: 25,
  callback_requested: 20,
  whatsapp_contact: 15,
};

// Demographic signals (20% weight)
const DEMOGRAPHIC_SIGNALS: Record<string, number> = {
  dach_region: 15, // DE/AT/CH
  valid_phone: 10,
  company_provided: 10,
  decision_maker_title: 20,
  linkedin_profile: 5,
  complete_profile: 10, // All basic fields filled
  verified_email: 10,
  business_email: 8, // Not gmail/yahoo
};

// Firmographic signals (10% weight)
const FIRMOGRAPHIC_SIGNALS: Record<string, number> = {
  b2b_company: 15,
  construction_industry: 25,
  real_estate_industry: 20,
  company_size_10_500: 15,
  company_size_500_plus: 10,
  has_website: 5,
  established_company: 10, // >5 years
  dach_headquarters: 15,
};

// Decision maker job titles
const DECISION_MAKER_TITLES = [
  "ceo", "cfo", "cto", "coo", "cmo", "geschäftsführer", "inhaber", "owner",
  "director", "direktor", "head of", "leiter", "manager", "vorstand",
  "partner", "vp", "vice president", "president", "founder", "gründer",
  "entscheider", "decision maker", "einkauf", "procurement", "bauleiter",
  "projektleiter", "project manager", "bauherr", "investor",
];

// DACH countries
const DACH_COUNTRIES = ["de", "at", "ch", "deutschland", "österreich", "schweiz", "germany", "austria", "switzerland"];

// Construction/Real Estate keywords
const CONSTRUCTION_KEYWORDS = [
  "bau", "construction", "immobilien", "real estate", "architektur", "architecture",
  "renovierung", "renovation", "sanierung", "hausbau", "wohnbau", "tiefbau",
  "hochbau", "bauträger", "developer", "projektentwicklung", "facility",
];

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

/**
 * Calculate engagement score from activities
 */
async function calculateEngagementScore(
  contactId: string,
  config: ScoringConfig
): Promise<{ score: number; signals: ScoreSignal[] }> {
  const signals: ScoreSignal[] = [];
  let rawScore = 0;

  // Get activities from last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const activities = await db.query.contactActivities.findMany({
    where: and(
      eq(contactActivities.contactId, contactId),
      gte(contactActivities.occurredAt, ninetyDaysAgo)
    ),
    orderBy: [desc(contactActivities.occurredAt)],
  });

  // Count activities by type
  const activityCounts: Record<string, { count: number; lastOccurred: Date }> = {};

  for (const activity of activities) {
    const type = activity.type.toLowerCase().replace(/-/g, "_");
    if (!activityCounts[type]) {
      activityCounts[type] = { count: 0, lastOccurred: activity.occurredAt };
    }
    activityCounts[type].count++;
    if (activity.occurredAt > activityCounts[type].lastOccurred) {
      activityCounts[type].lastOccurred = activity.occurredAt;
    }
  }

  // Calculate score with decay
  const now = new Date();

  for (const [type, data] of Object.entries(activityCounts)) {
    const signalDef = ENGAGEMENT_SIGNALS[type];
    if (!signalDef) continue;

    // Calculate days since last occurrence
    const daysSince = Math.floor(
      (now.getTime() - data.lastOccurred.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Apply decay if enabled
    let points = signalDef.points * Math.min(data.count, 5); // Cap at 5x
    let decayedPoints = points;

    if (config.decayEnabled && daysSince > 0) {
      const weeksOld = Math.floor(daysSince / config.decayPeriodDays);
      decayedPoints = Math.max(0, points - weeksOld * signalDef.decay * data.count);
    }

    if (decayedPoints > 0) {
      rawScore += decayedPoints;
      signals.push({
        category: "engagement",
        signal: type,
        points: signalDef.points,
        occurredAt: data.lastOccurred,
        decayedPoints,
      });
    }
  }

  // Check for multiple sessions (if more than 3 visits)
  const visitCount = activityCounts["website_visit"]?.count || 0;
  if (visitCount >= 3) {
    const bonus = ENGAGEMENT_SIGNALS.multiple_sessions.points;
    rawScore += bonus;
    signals.push({
      category: "engagement",
      signal: "multiple_sessions",
      points: bonus,
    });
  }

  // Normalize to 0-100
  const maxPossible = Object.values(ENGAGEMENT_SIGNALS).reduce(
    (sum, s) => sum + s.points * 5,
    0
  );
  const score = Math.min(100, Math.round((rawScore / maxPossible) * 100 * 2)); // Scale up

  return { score, signals };
}

/**
 * Calculate behavioral score from actions
 */
async function calculateBehavioralScore(
  contactId: string
): Promise<{ score: number; signals: ScoreSignal[] }> {
  const signals: ScoreSignal[] = [];
  let rawScore = 0;

  // Get activities that indicate behavioral signals
  const activities = await db.query.contactActivities.findMany({
    where: eq(contactActivities.contactId, contactId),
  });

  // Check for behavioral signals in activities
  const activityTypes = new Set(activities.map((a) => a.type.toLowerCase().replace(/-/g, "_")));

  for (const [signal, points] of Object.entries(BEHAVIORAL_SIGNALS)) {
    if (activityTypes.has(signal)) {
      rawScore += points;
      signals.push({
        category: "behavioral",
        signal,
        points,
      });
    }
  }

  // Check for associated deals (indicates quote/meeting)
  const contactDeals = await db.execute(
    sql`SELECT COUNT(*) as count FROM deal_contacts WHERE contact_id = ${contactId}`
  );
  const dealCount = (contactDeals.rows[0] as { count: number })?.count || 0;

  if (dealCount > 0) {
    rawScore += 30; // Has deal association
    signals.push({
      category: "behavioral",
      signal: "deal_associated",
      points: 30,
    });
  }

  // Normalize to 0-100
  const maxPossible = Object.values(BEHAVIORAL_SIGNALS).reduce((sum, p) => sum + p, 0);
  const score = Math.min(100, Math.round((rawScore / maxPossible) * 100 * 1.5));

  return { score, signals };
}

/**
 * Calculate demographic score from contact data
 */
async function calculateDemographicScore(
  contactId: string
): Promise<{ score: number; signals: ScoreSignal[] }> {
  const signals: ScoreSignal[] = [];
  let rawScore = 0;

  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
  });

  if (!contact) {
    return { score: 0, signals: [] };
  }

  // Check DACH region
  const country = (contact.country || "").toLowerCase();
  if (DACH_COUNTRIES.some((c) => country.includes(c))) {
    rawScore += DEMOGRAPHIC_SIGNALS.dach_region;
    signals.push({ category: "demographic", signal: "dach_region", points: DEMOGRAPHIC_SIGNALS.dach_region });
  }

  // Check valid phone
  if (contact.phone || contact.mobile) {
    rawScore += DEMOGRAPHIC_SIGNALS.valid_phone;
    signals.push({ category: "demographic", signal: "valid_phone", points: DEMOGRAPHIC_SIGNALS.valid_phone });
  }

  // Check company provided
  if (contact.company) {
    rawScore += DEMOGRAPHIC_SIGNALS.company_provided;
    signals.push({ category: "demographic", signal: "company_provided", points: DEMOGRAPHIC_SIGNALS.company_provided });
  }

  // Check decision maker title
  const position = (contact.position || "").toLowerCase();
  if (DECISION_MAKER_TITLES.some((title) => position.includes(title))) {
    rawScore += DEMOGRAPHIC_SIGNALS.decision_maker_title;
    signals.push({ category: "demographic", signal: "decision_maker_title", points: DEMOGRAPHIC_SIGNALS.decision_maker_title });
  }

  // Check LinkedIn profile
  if (contact.linkedinUrl) {
    rawScore += DEMOGRAPHIC_SIGNALS.linkedin_profile;
    signals.push({ category: "demographic", signal: "linkedin_profile", points: DEMOGRAPHIC_SIGNALS.linkedin_profile });
  }

  // Check verified email
  if (contact.emailStatus === "active" && contact.consentStatus === "confirmed") {
    rawScore += DEMOGRAPHIC_SIGNALS.verified_email;
    signals.push({ category: "demographic", signal: "verified_email", points: DEMOGRAPHIC_SIGNALS.verified_email });
  }

  // Check business email (not free provider)
  const emailDomain = contact.email.split("@")[1]?.toLowerCase();
  const freeProviders = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "gmx.de", "web.de"];
  if (emailDomain && !freeProviders.includes(emailDomain)) {
    rawScore += DEMOGRAPHIC_SIGNALS.business_email;
    signals.push({ category: "demographic", signal: "business_email", points: DEMOGRAPHIC_SIGNALS.business_email });
  }

  // Check complete profile
  if (contact.firstName && contact.lastName && contact.email && (contact.phone || contact.mobile) && contact.company) {
    rawScore += DEMOGRAPHIC_SIGNALS.complete_profile;
    signals.push({ category: "demographic", signal: "complete_profile", points: DEMOGRAPHIC_SIGNALS.complete_profile });
  }

  // Normalize to 0-100
  const maxPossible = Object.values(DEMOGRAPHIC_SIGNALS).reduce((sum, p) => sum + p, 0);
  const score = Math.min(100, Math.round((rawScore / maxPossible) * 100));

  return { score, signals };
}

/**
 * Calculate firmographic score from company data
 */
async function calculateFirmographicScore(
  contactId: string
): Promise<{ score: number; signals: ScoreSignal[] }> {
  const signals: ScoreSignal[] = [];
  let rawScore = 0;

  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
  });

  if (!contact) {
    return { score: 0, signals: [] };
  }

  const company = (contact.company || "").toLowerCase();
  const position = (contact.position || "").toLowerCase();
  const website = contact.website || "";

  // Check B2B indicators
  const b2bIndicators = ["gmbh", "ag", "kg", "ohg", "ug", "ltd", "inc", "corp", "llc", "se"];
  if (b2bIndicators.some((ind) => company.includes(ind))) {
    rawScore += FIRMOGRAPHIC_SIGNALS.b2b_company;
    signals.push({ category: "firmographic", signal: "b2b_company", points: FIRMOGRAPHIC_SIGNALS.b2b_company });
  }

  // Check construction/real estate industry
  if (CONSTRUCTION_KEYWORDS.some((kw) => company.includes(kw) || position.includes(kw))) {
    rawScore += FIRMOGRAPHIC_SIGNALS.construction_industry;
    signals.push({ category: "firmographic", signal: "construction_industry", points: FIRMOGRAPHIC_SIGNALS.construction_industry });
  }

  // Check has website
  if (website) {
    rawScore += FIRMOGRAPHIC_SIGNALS.has_website;
    signals.push({ category: "firmographic", signal: "has_website", points: FIRMOGRAPHIC_SIGNALS.has_website });
  }

  // Check DACH headquarters (from country)
  const country = (contact.country || "").toLowerCase();
  if (DACH_COUNTRIES.some((c) => country.includes(c))) {
    rawScore += FIRMOGRAPHIC_SIGNALS.dach_headquarters;
    signals.push({ category: "firmographic", signal: "dach_headquarters", points: FIRMOGRAPHIC_SIGNALS.dach_headquarters });
  }

  // Normalize to 0-100
  const maxPossible = Object.values(FIRMOGRAPHIC_SIGNALS).reduce((sum, p) => sum + p, 0);
  const score = Math.min(100, Math.round((rawScore / maxPossible) * 100));

  return { score, signals };
}

/**
 * Determine grade from total score
 */
function getGrade(score: number, thresholds: ScoringConfig["thresholds"]): "A" | "B" | "C" | "D" {
  if (score >= thresholds.A) return "A";
  if (score >= thresholds.B) return "B";
  if (score >= thresholds.C) return "C";
  return "D";
}

// =============================================================================
// MAIN SCORING FUNCTION
// =============================================================================

/**
 * Calculate complete lead score for a contact
 */
export async function calculateLeadScore(
  contactId: string,
  config: ScoringConfig = DEFAULT_CONFIG
): Promise<LeadScore> {
  // Get previous score for comparison
  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
    columns: { leadScore: true },
  });
  const previousScore = contact?.leadScore || undefined;

  // Calculate all component scores
  const [engagement, behavioral, demographic, firmographic] = await Promise.all([
    calculateEngagementScore(contactId, config),
    calculateBehavioralScore(contactId),
    calculateDemographicScore(contactId),
    calculateFirmographicScore(contactId),
  ]);

  // Calculate weighted total
  const total = Math.round(
    engagement.score * config.weights.engagement +
    behavioral.score * config.weights.behavioral +
    demographic.score * config.weights.demographic +
    firmographic.score * config.weights.firmographic
  );

  const grade = getGrade(total, config.thresholds);
  const previousGrade = previousScore ? getGrade(previousScore, config.thresholds) : undefined;

  // Combine all signals
  const signals = [
    ...engagement.signals,
    ...behavioral.signals,
    ...demographic.signals,
    ...firmographic.signals,
  ];

  return {
    contactId,
    total,
    grade,
    breakdown: {
      engagement: engagement.score,
      behavioral: behavioral.score,
      demographic: demographic.score,
      firmographic: firmographic.score,
    },
    signals,
    calculatedAt: new Date(),
    previousScore,
    previousGrade,
  };
}

/**
 * Calculate and save lead score to database
 */
export async function updateContactLeadScore(
  contactId: string,
  config: ScoringConfig = DEFAULT_CONFIG
): Promise<LeadScore> {
  const score = await calculateLeadScore(contactId, config);

  // Update contact's lead score
  await db
    .update(contacts)
    .set({
      leadScore: score.total,
      leadScoreUpdatedAt: score.calculatedAt,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, contactId));

  return score;
}

/**
 * Batch update lead scores for multiple contacts
 */
export async function batchUpdateLeadScores(
  contactIds: string[],
  config: ScoringConfig = DEFAULT_CONFIG,
  onProgress?: (current: number, total: number, score: LeadScore) => void
): Promise<LeadScore[]> {
  const scores: LeadScore[] = [];

  for (let i = 0; i < contactIds.length; i++) {
    const score = await updateContactLeadScore(contactIds[i], config);
    scores.push(score);

    if (onProgress) {
      onProgress(i + 1, contactIds.length, score);
    }

    // Small delay to avoid overwhelming the database
    if (i < contactIds.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  return scores;
}

/**
 * Get score distribution across all contacts
 */
export async function getScoreDistribution(
  organizationId?: string
): Promise<{
  A: number;
  B: number;
  C: number;
  D: number;
  total: number;
  unscored: number;
  averageScore: number;
}> {
  // Get all contacts with scores
  const result = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE lead_score >= 80) as grade_a,
      COUNT(*) FILTER (WHERE lead_score >= 60 AND lead_score < 80) as grade_b,
      COUNT(*) FILTER (WHERE lead_score >= 40 AND lead_score < 60) as grade_c,
      COUNT(*) FILTER (WHERE lead_score > 0 AND lead_score < 40) as grade_d,
      COUNT(*) FILTER (WHERE lead_score IS NULL OR lead_score = 0) as unscored,
      COUNT(*) as total,
      COALESCE(AVG(lead_score) FILTER (WHERE lead_score > 0), 0) as avg_score
    FROM contacts
    ${organizationId ? sql`WHERE organization_id = ${organizationId}` : sql``}
  `);

  const row = result.rows[0] as {
    grade_a: string;
    grade_b: string;
    grade_c: string;
    grade_d: string;
    unscored: string;
    total: string;
    avg_score: string;
  };

  return {
    A: parseInt(row.grade_a) || 0,
    B: parseInt(row.grade_b) || 0,
    C: parseInt(row.grade_c) || 0,
    D: parseInt(row.grade_d) || 0,
    total: parseInt(row.total) || 0,
    unscored: parseInt(row.unscored) || 0,
    averageScore: parseFloat(row.avg_score) || 0,
  };
}

/**
 * Get top scored leads (leaderboard)
 */
export async function getLeaderboard(
  limit: number = 10,
  grade?: "A" | "B" | "C" | "D",
  organizationId?: string
): Promise<Array<{
  contactId: string;
  contactName: string;
  contactEmail: string;
  score: number;
  grade: "A" | "B" | "C" | "D";
  lastCalculated: Date | null;
}>> {
  let gradeFilter = sql`lead_score > 0`;

  if (grade === "A") gradeFilter = sql`lead_score >= 80`;
  else if (grade === "B") gradeFilter = sql`lead_score >= 60 AND lead_score < 80`;
  else if (grade === "C") gradeFilter = sql`lead_score >= 40 AND lead_score < 60`;
  else if (grade === "D") gradeFilter = sql`lead_score > 0 AND lead_score < 40`;

  const result = await db.execute(sql`
    SELECT
      id as contact_id,
      COALESCE(first_name || ' ' || last_name, email) as contact_name,
      email as contact_email,
      lead_score as score,
      lead_score_updated_at as last_calculated
    FROM contacts
    WHERE ${gradeFilter}
    ${organizationId ? sql`AND organization_id = ${organizationId}` : sql``}
    ORDER BY lead_score DESC
    LIMIT ${limit}
  `);

  return result.rows.map((row: Record<string, unknown>) => ({
    contactId: row.contact_id as string,
    contactName: (row.contact_name as string) || "Unknown",
    contactEmail: row.contact_email as string,
    score: row.score as number,
    grade: getGrade(row.score as number, DEFAULT_CONFIG.thresholds),
    lastCalculated: row.last_calculated as Date | null,
  }));
}

/**
 * Get contacts with recent grade changes
 */
export async function getGradeChanges(
  days: number = 7,
  organizationId?: string
): Promise<Array<{
  contactId: string;
  contactName: string;
  previousGrade: "A" | "B" | "C" | "D";
  newGrade: "A" | "B" | "C" | "D";
  previousScore: number;
  newScore: number;
  changedAt: Date;
}>> {
  // This would require storing score history - for now return empty
  // TODO: Implement score history table for tracking changes
  return [];
}
