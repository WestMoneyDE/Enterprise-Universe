/**
 * Lead Scoring Service
 *
 * Calculates lead scores (0-100) based on multiple factors:
 * - Profile completeness
 * - Engagement level (messages, emails)
 * - Activity recency
 * - Deal involvement
 * - Consent status
 *
 * Grade classification:
 * - A: 80-100 (Hot lead, ready to convert)
 * - B: 60-79 (Warm lead, nurturing needed)
 * - C: 40-59 (Cool lead, early stage)
 * - D: 0-39 (Cold lead, minimal engagement)
 */

import {
  db,
  contacts,
  deals,
  messages,
  conversations,
  contactActivities,
  eq,
  and,
  desc,
  gte,
} from "@nexus/db";

// =============================================================================
// TYPES
// =============================================================================

export interface LeadScoreBreakdown {
  profileCompleteness: number; // 0-20 points
  engagementLevel: number; // 0-25 points
  activityRecency: number; // 0-20 points
  dealInvolvement: number; // 0-20 points
  consentStatus: number; // 0-10 points
  emailEngagement: number; // 0-5 points
}

export interface LeadScoreResult {
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D";
  breakdown: LeadScoreBreakdown;
  factors: ScoreFactor[];
  calculatedAt: Date;
}

export interface ScoreFactor {
  name: string;
  impact: "positive" | "negative" | "neutral";
  points: number;
  description: string;
}

export interface ScoringConfig {
  weights: {
    profileCompleteness: number;
    engagementLevel: number;
    activityRecency: number;
    dealInvolvement: number;
    consentStatus: number;
    emailEngagement: number;
  };
  thresholds: {
    recentActivityDays: number;
    highEngagementMessages: number;
    mediumEngagementMessages: number;
  };
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    profileCompleteness: 20,
    engagementLevel: 25,
    activityRecency: 20,
    dealInvolvement: 20,
    consentStatus: 10,
    emailEngagement: 5,
  },
  thresholds: {
    recentActivityDays: 30,
    highEngagementMessages: 10,
    mediumEngagementMessages: 5,
  },
};

// =============================================================================
// LEAD SCORING SERVICE
// =============================================================================

export class LeadScoringService {
  private config: ScoringConfig;

  constructor(config: Partial<ScoringConfig> = {}) {
    this.config = {
      ...DEFAULT_SCORING_CONFIG,
      ...config,
      weights: { ...DEFAULT_SCORING_CONFIG.weights, ...config.weights },
      thresholds: { ...DEFAULT_SCORING_CONFIG.thresholds, ...config.thresholds },
    };
  }

  /**
   * Calculate lead score for a contact
   */
  async calculateScore(contactId: string): Promise<LeadScoreResult> {
    // Get contact data
    const contact = await db.query.contacts.findFirst({
      where: eq(contacts.id, contactId),
    });

    if (!contact) {
      throw new Error(`Contact not found: ${contactId}`);
    }

    const factors: ScoreFactor[] = [];
    const breakdown: LeadScoreBreakdown = {
      profileCompleteness: 0,
      engagementLevel: 0,
      activityRecency: 0,
      dealInvolvement: 0,
      consentStatus: 0,
      emailEngagement: 0,
    };

    // Calculate each factor
    breakdown.profileCompleteness = this.calculateProfileCompleteness(contact, factors);
    breakdown.engagementLevel = await this.calculateEngagementLevel(contactId, factors);
    breakdown.activityRecency = await this.calculateActivityRecency(contactId, factors);
    breakdown.dealInvolvement = await this.calculateDealInvolvement(contactId, factors);
    breakdown.consentStatus = this.calculateConsentScore(contact, factors);
    breakdown.emailEngagement = await this.calculateEmailEngagement(contactId, factors);

    // Calculate total score
    const score = Math.round(
      breakdown.profileCompleteness +
        breakdown.engagementLevel +
        breakdown.activityRecency +
        breakdown.dealInvolvement +
        breakdown.consentStatus +
        breakdown.emailEngagement
    );

    // Determine grade
    const grade = this.calculateGrade(score);

    return {
      score: Math.min(100, Math.max(0, score)),
      grade,
      breakdown,
      factors,
      calculatedAt: new Date(),
    };
  }

  /**
   * Calculate profile completeness (0-20 points)
   */
  private calculateProfileCompleteness(
    contact: typeof contacts.$inferSelect,
    factors: ScoreFactor[]
  ): number {
    const maxPoints = this.config.weights.profileCompleteness;
    let points = 0;
    const fieldsToCheck = [
      { field: "email", weight: 3, name: "Email" },
      { field: "firstName", weight: 2, name: "First name" },
      { field: "lastName", weight: 2, name: "Last name" },
      { field: "phone", weight: 2, name: "Phone" },
      { field: "whatsappNumber", weight: 2, name: "WhatsApp number" },
      { field: "company", weight: 2, name: "Company" },
      { field: "jobTitle", weight: 2, name: "Job title" },
      { field: "address", weight: 1, name: "Address" },
      { field: "city", weight: 1, name: "City" },
      { field: "country", weight: 1, name: "Country" },
      { field: "tags", weight: 2, name: "Tags" },
    ];

    const totalWeight = fieldsToCheck.reduce((sum, f) => sum + f.weight, 0);

    for (const { field, weight, name } of fieldsToCheck) {
      const value = contact[field as keyof typeof contact];
      const hasValue = value && (Array.isArray(value) ? value.length > 0 : true);

      if (hasValue) {
        points += (weight / totalWeight) * maxPoints;
        factors.push({
          name: `Profile: ${name}`,
          impact: "positive",
          points: Math.round((weight / totalWeight) * maxPoints * 10) / 10,
          description: `${name} is filled`,
        });
      }
    }

    return Math.round(points * 10) / 10;
  }

  /**
   * Calculate engagement level based on messages (0-25 points)
   */
  private async calculateEngagementLevel(
    contactId: string,
    factors: ScoreFactor[]
  ): Promise<number> {
    const maxPoints = this.config.weights.engagementLevel;

    // Get conversations for this contact
    const contactConversations = await db.query.conversations.findMany({
      where: eq(conversations.contactId, contactId),
    });

    if (contactConversations.length === 0) {
      factors.push({
        name: "No conversations",
        impact: "negative",
        points: 0,
        description: "Contact has no message history",
      });
      return 0;
    }

    // Count inbound messages (from contact)
    let totalInboundMessages = 0;
    for (const conv of contactConversations) {
      const inboundMessages = await db.query.messages.findMany({
        where: and(eq(messages.conversationId, conv.id), eq(messages.direction, "inbound")),
      });
      totalInboundMessages += inboundMessages.length;
    }

    // Score based on message count
    let points = 0;
    if (totalInboundMessages >= this.config.thresholds.highEngagementMessages) {
      points = maxPoints;
      factors.push({
        name: "High engagement",
        impact: "positive",
        points: maxPoints,
        description: `${totalInboundMessages} messages (high engagement)`,
      });
    } else if (totalInboundMessages >= this.config.thresholds.mediumEngagementMessages) {
      points = maxPoints * 0.6;
      factors.push({
        name: "Medium engagement",
        impact: "positive",
        points: Math.round(maxPoints * 0.6 * 10) / 10,
        description: `${totalInboundMessages} messages (medium engagement)`,
      });
    } else if (totalInboundMessages > 0) {
      points = maxPoints * 0.3;
      factors.push({
        name: "Low engagement",
        impact: "neutral",
        points: Math.round(maxPoints * 0.3 * 10) / 10,
        description: `${totalInboundMessages} messages (low engagement)`,
      });
    }

    return Math.round(points * 10) / 10;
  }

  /**
   * Calculate activity recency (0-20 points)
   */
  private async calculateActivityRecency(
    contactId: string,
    factors: ScoreFactor[]
  ): Promise<number> {
    const maxPoints = this.config.weights.activityRecency;
    const recentDays = this.config.thresholds.recentActivityDays;

    // Get most recent activity
    const recentActivity = await db.query.contactActivities.findFirst({
      where: eq(contactActivities.contactId, contactId),
      orderBy: [desc(contactActivities.createdAt)],
    });

    // Also check recent messages
    const conversations_ = await db.query.conversations.findMany({
      where: eq(conversations.contactId, contactId),
    });

    let mostRecentDate: Date | null = recentActivity?.createdAt ?? null;

    for (const conv of conversations_) {
      if (conv.lastMessageAt) {
        if (!mostRecentDate || conv.lastMessageAt > mostRecentDate) {
          mostRecentDate = conv.lastMessageAt;
        }
      }
    }

    if (!mostRecentDate) {
      factors.push({
        name: "No recent activity",
        impact: "negative",
        points: 0,
        description: "No recorded activity",
      });
      return 0;
    }

    // Calculate days since last activity
    const daysSinceActivity = Math.floor(
      (Date.now() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let points = 0;
    if (daysSinceActivity <= 7) {
      points = maxPoints;
      factors.push({
        name: "Very recent activity",
        impact: "positive",
        points: maxPoints,
        description: `Active within the last week (${daysSinceActivity} days ago)`,
      });
    } else if (daysSinceActivity <= 14) {
      points = maxPoints * 0.7;
      factors.push({
        name: "Recent activity",
        impact: "positive",
        points: Math.round(maxPoints * 0.7 * 10) / 10,
        description: `Active within 2 weeks (${daysSinceActivity} days ago)`,
      });
    } else if (daysSinceActivity <= recentDays) {
      points = maxPoints * 0.4;
      factors.push({
        name: "Moderate activity",
        impact: "neutral",
        points: Math.round(maxPoints * 0.4 * 10) / 10,
        description: `Active within ${recentDays} days (${daysSinceActivity} days ago)`,
      });
    } else {
      points = maxPoints * 0.1;
      factors.push({
        name: "Stale activity",
        impact: "negative",
        points: Math.round(maxPoints * 0.1 * 10) / 10,
        description: `Last active ${daysSinceActivity} days ago`,
      });
    }

    return Math.round(points * 10) / 10;
  }

  /**
   * Calculate deal involvement (0-20 points)
   */
  private async calculateDealInvolvement(
    contactId: string,
    factors: ScoreFactor[]
  ): Promise<number> {
    const maxPoints = this.config.weights.dealInvolvement;

    // Get deals associated with this contact
    const contactDeals = await db.query.deals.findMany({
      where: eq(deals.contactId, contactId),
    });

    if (contactDeals.length === 0) {
      factors.push({
        name: "No deals",
        impact: "neutral",
        points: 0,
        description: "No deals associated with contact",
      });
      return 0;
    }

    // Calculate points based on deal status and value
    let points = 0;
    const hasWonDeal = contactDeals.some((d) => d.stage === "won" || d.status === "won");
    const hasActiveDeal = contactDeals.some(
      (d) => d.status === "open" || d.status === "active"
    );
    const totalDealValue = contactDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

    if (hasWonDeal) {
      points += maxPoints * 0.5;
      factors.push({
        name: "Won deal",
        impact: "positive",
        points: Math.round(maxPoints * 0.5 * 10) / 10,
        description: "Has at least one won deal",
      });
    }

    if (hasActiveDeal) {
      points += maxPoints * 0.3;
      factors.push({
        name: "Active deal",
        impact: "positive",
        points: Math.round(maxPoints * 0.3 * 10) / 10,
        description: "Has active deal in pipeline",
      });
    }

    if (totalDealValue > 10000) {
      points += maxPoints * 0.2;
      factors.push({
        name: "High deal value",
        impact: "positive",
        points: Math.round(maxPoints * 0.2 * 10) / 10,
        description: `Total deal value: €${totalDealValue.toLocaleString()}`,
      });
    } else if (totalDealValue > 0) {
      points += maxPoints * 0.1;
      factors.push({
        name: "Deal value",
        impact: "positive",
        points: Math.round(maxPoints * 0.1 * 10) / 10,
        description: `Total deal value: €${totalDealValue.toLocaleString()}`,
      });
    }

    return Math.min(maxPoints, Math.round(points * 10) / 10);
  }

  /**
   * Calculate consent status score (0-10 points)
   */
  private calculateConsentScore(
    contact: typeof contacts.$inferSelect,
    factors: ScoreFactor[]
  ): number {
    const maxPoints = this.config.weights.consentStatus;

    if (contact.consentStatus === "granted") {
      factors.push({
        name: "Consent granted",
        impact: "positive",
        points: maxPoints,
        description: "Contact has given marketing consent",
      });
      return maxPoints;
    } else if (contact.consentStatus === "pending") {
      factors.push({
        name: "Consent pending",
        impact: "neutral",
        points: maxPoints * 0.3,
        description: "Consent status is pending",
      });
      return maxPoints * 0.3;
    } else {
      factors.push({
        name: "No consent",
        impact: "negative",
        points: 0,
        description: "Contact has not granted consent or has revoked it",
      });
      return 0;
    }
  }

  /**
   * Calculate email engagement (0-5 points)
   */
  private async calculateEmailEngagement(
    contactId: string,
    factors: ScoreFactor[]
  ): Promise<number> {
    const maxPoints = this.config.weights.emailEngagement;

    // Get recent contact activities related to email
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const emailActivities = await db.query.contactActivities.findMany({
      where: and(
        eq(contactActivities.contactId, contactId),
        gte(contactActivities.createdAt, thirtyDaysAgo)
      ),
    });

    // Check for email opens and clicks
    const emailOpens = emailActivities.filter((a) => a.type === "email_opened").length;
    const emailClicks = emailActivities.filter((a) => a.type === "email_clicked").length;

    let points = 0;

    if (emailClicks > 0) {
      points += maxPoints * 0.6;
      factors.push({
        name: "Email clicks",
        impact: "positive",
        points: Math.round(maxPoints * 0.6 * 10) / 10,
        description: `${emailClicks} email link clicks`,
      });
    }

    if (emailOpens > 0) {
      points += maxPoints * 0.4;
      factors.push({
        name: "Email opens",
        impact: "positive",
        points: Math.round(maxPoints * 0.4 * 10) / 10,
        description: `${emailOpens} emails opened`,
      });
    }

    if (emailOpens === 0 && emailClicks === 0) {
      factors.push({
        name: "No email engagement",
        impact: "neutral",
        points: 0,
        description: "No email activity in the last 30 days",
      });
    }

    return Math.min(maxPoints, Math.round(points * 10) / 10);
  }

  /**
   * Calculate grade from score
   */
  private calculateGrade(score: number): "A" | "B" | "C" | "D" {
    if (score >= 80) return "A";
    if (score >= 60) return "B";
    if (score >= 40) return "C";
    return "D";
  }
}

// =============================================================================
// BULK SCORING
// =============================================================================

/**
 * Calculate scores for multiple contacts
 */
export async function calculateBulkScores(
  organizationId: string,
  options?: {
    limit?: number;
    recalculateAll?: boolean;
  }
): Promise<{
  processed: number;
  errors: number;
  results: Array<{ contactId: string; score: number; grade: string }>;
}> {
  const scoringService = new LeadScoringService();
  const results: Array<{ contactId: string; score: number; grade: string }> = [];
  let errors = 0;

  // Get contacts to score
  const contactsToScore = await db.query.contacts.findMany({
    where: eq(contacts.organizationId, organizationId),
    limit: options?.limit ?? 100,
  });

  for (const contact of contactsToScore) {
    try {
      const result = await scoringService.calculateScore(contact.id);

      // Update contact with new score
      await db
        .update(contacts)
        .set({
          leadScore: result.score,
          leadScoreGrade: result.grade,
          leadScoreUpdatedAt: result.calculatedAt,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, contact.id));

      results.push({
        contactId: contact.id,
        score: result.score,
        grade: result.grade,
      });
    } catch (error) {
      console.error(`Failed to score contact ${contact.id}:`, error);
      errors++;
    }
  }

  return {
    processed: results.length,
    errors,
    results,
  };
}

// =============================================================================
// SCORE HISTORY
// =============================================================================

/**
 * Get score history for a contact
 */
export async function getScoreHistory(
  contactId: string,
  days: number = 30
): Promise<
  Array<{
    score: number;
    grade: string;
    date: Date;
  }>
> {
  // Get contact activities related to score updates
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const scoreActivities = await db.query.contactActivities.findMany({
    where: and(
      eq(contactActivities.contactId, contactId),
      eq(contactActivities.type, "lead_score_updated"),
      gte(contactActivities.createdAt, startDate)
    ),
    orderBy: [desc(contactActivities.createdAt)],
  });

  return scoreActivities.map((activity) => {
    const metadata = activity.metadata as Record<string, unknown>;
    return {
      score: (metadata?.score as number) ?? 0,
      grade: (metadata?.grade as string) ?? "D",
      date: activity.createdAt,
    };
  });
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const leadScoringService = new LeadScoringService();
