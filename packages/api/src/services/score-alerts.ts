// =============================================================================
// Score Alerts Service
// =============================================================================
// Monitors lead score grade changes and triggers alerts for grade upgrades
// Supports email and WhatsApp notifications for hot leads

import { db, contacts, eq, desc, sql, and, gte } from "@nexus/db";
import { DEFAULT_CONFIG } from "./lead-scoring-engine";

// =============================================================================
// TYPES
// =============================================================================

export type Grade = "A" | "B" | "C" | "D";

export interface GradeChange {
  previousGrade: Grade;
  newGrade: Grade;
  isUpgrade: boolean;
  isDowngrade: boolean;
  changeLevel: number; // positive = upgrade, negative = downgrade
}

export interface ScoreAlert {
  id: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  previousGrade: Grade;
  newGrade: Grade;
  previousScore: number;
  newScore: number;
  alertType: "upgrade" | "downgrade";
  notificationsSent: {
    email: boolean;
    whatsapp: boolean;
  };
  createdAt: Date;
  organizationId?: string;
}

export interface AlertSubscription {
  id: string;
  userId: string;
  email: string;
  phone?: string;
  enableEmail: boolean;
  enableWhatsApp: boolean;
  gradeUpgrades: Grade[]; // Alert when contact upgrades TO these grades
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage for alerts and subscriptions (would be DB in production)
const alertsStore: ScoreAlert[] = [];
const subscriptionsStore: Map<string, AlertSubscription> = new Map();

// =============================================================================
// GRADE UTILITIES
// =============================================================================

const GRADE_ORDER: Record<Grade, number> = {
  D: 0,
  C: 1,
  B: 2,
  A: 3,
};

/**
 * Detect grade change between previous and new grades
 */
export function detectGradeChange(
  previousGrade: Grade,
  newGrade: Grade
): GradeChange {
  const previousOrder = GRADE_ORDER[previousGrade];
  const newOrder = GRADE_ORDER[newGrade];
  const changeLevel = newOrder - previousOrder;

  return {
    previousGrade,
    newGrade,
    isUpgrade: changeLevel > 0,
    isDowngrade: changeLevel < 0,
    changeLevel,
  };
}

/**
 * Check if a grade change is a significant upgrade (C->B or B->A)
 */
export function isHotLeadUpgrade(change: GradeChange): boolean {
  // C->B, C->A, B->A are hot lead upgrades
  return (
    change.isUpgrade &&
    (change.newGrade === "A" || change.newGrade === "B") &&
    change.previousGrade !== "A"
  );
}

// =============================================================================
// ALERT FUNCTIONS
// =============================================================================

const MAIL_ENGINE_URL = process.env.MAIL_ENGINE_URL || "http://localhost:3006";
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;

/**
 * Trigger alert for a grade change
 * Returns the created alert if an upgrade occurred, null otherwise
 */
export async function triggerAlert(params: {
  contactId: string;
  previousGrade: Grade;
  newGrade: Grade;
  previousScore: number;
  newScore: number;
  organizationId?: string;
}): Promise<ScoreAlert | null> {
  const change = detectGradeChange(params.previousGrade, params.newGrade);

  // Only create alerts for upgrades
  if (!change.isUpgrade) {
    return null;
  }

  // Get contact details
  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, params.contactId),
    columns: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      organizationId: true,
    },
  });

  if (!contact) {
    console.error(`[SCORE_ALERT] Contact not found: ${params.contactId}`);
    return null;
  }

  const contactName =
    contact.firstName && contact.lastName
      ? `${contact.firstName} ${contact.lastName}`
      : contact.email;

  // Create the alert
  const alert: ScoreAlert = {
    id: crypto.randomUUID(),
    contactId: params.contactId,
    contactName,
    contactEmail: contact.email,
    previousGrade: params.previousGrade,
    newGrade: params.newGrade,
    previousScore: params.previousScore,
    newScore: params.newScore,
    alertType: "upgrade",
    notificationsSent: {
      email: false,
      whatsapp: false,
    },
    createdAt: new Date(),
    organizationId: params.organizationId || contact.organizationId || undefined,
  };

  // Store the alert
  alertsStore.unshift(alert);

  // Keep only last 1000 alerts in memory
  if (alertsStore.length > 1000) {
    alertsStore.pop();
  }

  // Notify subscribers
  await notifySubscribers(alert);

  return alert;
}

/**
 * Notify all relevant subscribers about a grade upgrade
 */
async function notifySubscribers(alert: ScoreAlert): Promise<void> {
  const subscribers = Array.from(subscriptionsStore.values()).filter(
    (sub) =>
      sub.gradeUpgrades.includes(alert.newGrade) &&
      (sub.enableEmail || sub.enableWhatsApp)
  );

  for (const subscriber of subscribers) {
    try {
      if (subscriber.enableEmail) {
        const emailResult = await sendAlertEmail({
          to: subscriber.email,
          contactName: alert.contactName,
          contactEmail: alert.contactEmail,
          previousGrade: alert.previousGrade,
          newGrade: alert.newGrade,
          previousScore: alert.previousScore,
          newScore: alert.newScore,
        });
        if (emailResult.success) {
          alert.notificationsSent.email = true;
        }
      }

      if (subscriber.enableWhatsApp && subscriber.phone) {
        const whatsappResult = await sendAlertWhatsApp({
          to: subscriber.phone,
          contactName: alert.contactName,
          previousGrade: alert.previousGrade,
          newGrade: alert.newGrade,
          newScore: alert.newScore,
        });
        if (whatsappResult.success) {
          alert.notificationsSent.whatsapp = true;
        }
      }
    } catch (error) {
      console.error(
        `[SCORE_ALERT] Failed to notify subscriber ${subscriber.id}:`,
        error
      );
    }
  }
}

/**
 * Send email notification about a hot lead upgrade
 */
export async function sendAlertEmail(params: {
  to: string;
  contactName: string;
  contactEmail: string;
  previousGrade: Grade;
  newGrade: Grade;
  previousScore: number;
  newScore: number;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const gradeColors: Record<Grade, string> = {
    A: "#00ff88",
    B: "#3b82f6",
    C: "#f59e0b",
    D: "#ef4444",
  };

  const isHotLead = params.newGrade === "A";
  const subject = isHotLead
    ? `HOT LEAD ALERT: ${params.contactName} upgraded to Grade A!`
    : `Lead Upgrade: ${params.contactName} (${params.previousGrade} -> ${params.newGrade})`;

  try {
    const response = await fetch(`${MAIL_ENGINE_URL}/api/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: params.to,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%); color: #fff;">
            <div style="max-width: 600px; margin: 0 auto;">
              ${
                isHotLead
                  ? `<h1 style="color: #00ff88; text-align: center;">HOT LEAD ALERT</h1>`
                  : `<h1 style="color: #3b82f6; text-align: center;">LEAD UPGRADE</h1>`
              }

              <div style="background: rgba(0,255,136,0.1); border: 1px solid ${gradeColors[params.newGrade]}; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h2 style="color: #fff; margin-top: 0;">${params.contactName}</h2>
                <p><strong>Email:</strong> ${params.contactEmail}</p>

                <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin: 20px 0;">
                  <div style="text-align: center;">
                    <div style="font-size: 36px; font-weight: bold; color: ${gradeColors[params.previousGrade]};">${params.previousGrade}</div>
                    <div style="color: #888; font-size: 12px;">Score: ${params.previousScore}</div>
                  </div>
                  <div style="font-size: 24px; color: #888;">-></div>
                  <div style="text-align: center;">
                    <div style="font-size: 36px; font-weight: bold; color: ${gradeColors[params.newGrade]};">${params.newGrade}</div>
                    <div style="color: #888; font-size: 12px;">Score: ${params.newScore}</div>
                  </div>
                </div>

                ${
                  isHotLead
                    ? `<p style="color: #00ff88; text-align: center; font-weight: bold;">This contact is now a Grade A hot lead!</p>`
                    : ""
                }
              </div>

              <div style="text-align: center; padding: 20px;">
                <a href="#" style="display: inline-block; background: ${gradeColors[params.newGrade]}; color: #000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                  View Contact Details
                </a>
              </div>

              <hr style="border-color: #333;">
              <p style="color: #666; font-size: 12px; text-align: center;">
                Lead Scoring Alert | Nexus Command Center
              </p>
            </div>
          </div>
        `,
        text: `Lead Upgrade Alert\n\n${params.contactName} (${params.contactEmail})\nGrade: ${params.previousGrade} -> ${params.newGrade}\nScore: ${params.previousScore} -> ${params.newScore}`,
        source: "lead_score_alert",
        external_id: `score_alert_${Date.now()}`,
      }),
    });

    const data = await response.json();

    return {
      success: data.success === true,
      messageId: data.messageId,
      error: data.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

/**
 * Send WhatsApp notification about a hot lead upgrade (optional)
 */
export async function sendAlertWhatsApp(params: {
  to: string;
  contactName: string;
  previousGrade: Grade;
  newGrade: Grade;
  newScore: number;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // WhatsApp is optional - check if configured
  if (!WHATSAPP_API_URL) {
    return {
      success: false,
      error: "WhatsApp API not configured",
    };
  }

  const isHotLead = params.newGrade === "A";
  const emoji = isHotLead ? "!!" : "!";

  const message = isHotLead
    ? `HOT LEAD ALERT${emoji}\n\n${params.contactName} upgraded to Grade A!\nScore: ${params.newScore}/100\n\nTake action now!`
    : `Lead Upgrade${emoji}\n\n${params.contactName}\n${params.previousGrade} -> ${params.newGrade}\nScore: ${params.newScore}/100`;

  try {
    const response = await fetch(`${WHATSAPP_API_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: params.to,
        message,
        type: "text",
      }),
    });

    const data = await response.json();

    return {
      success: data.success === true,
      messageId: data.messageId,
      error: data.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send WhatsApp message",
    };
  }
}

// =============================================================================
// QUERY FUNCTIONS
// =============================================================================

/**
 * Get recent grade upgrade alerts
 */
export async function getRecentAlerts(params?: {
  limit?: number;
  offset?: number;
  grade?: Grade;
  organizationId?: string;
}): Promise<{
  alerts: ScoreAlert[];
  total: number;
  hasMore: boolean;
}> {
  const limit = params?.limit ?? 20;
  const offset = params?.offset ?? 0;

  let filtered = alertsStore;

  // Filter by organization if provided
  if (params?.organizationId) {
    filtered = filtered.filter(
      (a) => a.organizationId === params.organizationId
    );
  }

  // Filter by target grade if provided
  if (params?.grade) {
    filtered = filtered.filter((a) => a.newGrade === params.grade);
  }

  const total = filtered.length;
  const alerts = filtered.slice(offset, offset + limit);
  const hasMore = offset + limit < total;

  return {
    alerts,
    total,
    hasMore,
  };
}

/**
 * Get alert by ID
 */
export async function getAlertById(alertId: string): Promise<ScoreAlert | null> {
  return alertsStore.find((a) => a.id === alertId) || null;
}

/**
 * Get alerts for a specific contact
 */
export async function getContactAlerts(contactId: string): Promise<ScoreAlert[]> {
  return alertsStore.filter((a) => a.contactId === contactId);
}

// =============================================================================
// SUBSCRIPTION MANAGEMENT
// =============================================================================

/**
 * Subscribe to grade change alerts
 */
export async function subscribeToAlerts(params: {
  userId: string;
  email: string;
  phone?: string;
  enableEmail?: boolean;
  enableWhatsApp?: boolean;
  gradeUpgrades?: Grade[];
}): Promise<AlertSubscription> {
  const existingSubscription = subscriptionsStore.get(params.userId);

  const subscription: AlertSubscription = {
    id: existingSubscription?.id || crypto.randomUUID(),
    userId: params.userId,
    email: params.email,
    phone: params.phone,
    enableEmail: params.enableEmail ?? true,
    enableWhatsApp: params.enableWhatsApp ?? false,
    gradeUpgrades: params.gradeUpgrades ?? ["A", "B"], // Default: alert on A and B upgrades
    createdAt: existingSubscription?.createdAt || new Date(),
    updatedAt: new Date(),
  };

  subscriptionsStore.set(params.userId, subscription);

  return subscription;
}

/**
 * Unsubscribe from alerts
 */
export async function unsubscribeFromAlerts(userId: string): Promise<boolean> {
  return subscriptionsStore.delete(userId);
}

/**
 * Get user's alert subscription
 */
export async function getSubscription(
  userId: string
): Promise<AlertSubscription | null> {
  return subscriptionsStore.get(userId) || null;
}

/**
 * Update subscription preferences
 */
export async function updateSubscription(
  userId: string,
  updates: Partial<Omit<AlertSubscription, "id" | "userId" | "createdAt">>
): Promise<AlertSubscription | null> {
  const existing = subscriptionsStore.get(userId);
  if (!existing) {
    return null;
  }

  const updated: AlertSubscription = {
    ...existing,
    ...updates,
    updatedAt: new Date(),
  };

  subscriptionsStore.set(userId, updated);
  return updated;
}

// =============================================================================
// ALERT HISTORY
// =============================================================================

/**
 * Get alert history with filtering and pagination
 */
export async function getAlertHistory(params?: {
  startDate?: Date;
  endDate?: Date;
  grades?: Grade[];
  contactId?: string;
  organizationId?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  alerts: ScoreAlert[];
  total: number;
  summary: {
    totalUpgrades: number;
    gradeAUpgrades: number;
    gradeBUpgrades: number;
    emailsSent: number;
    whatsappSent: number;
  };
}> {
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;

  let filtered = alertsStore;

  // Apply filters
  if (params?.startDate) {
    filtered = filtered.filter((a) => a.createdAt >= params.startDate!);
  }
  if (params?.endDate) {
    filtered = filtered.filter((a) => a.createdAt <= params.endDate!);
  }
  if (params?.grades && params.grades.length > 0) {
    filtered = filtered.filter((a) => params.grades!.includes(a.newGrade));
  }
  if (params?.contactId) {
    filtered = filtered.filter((a) => a.contactId === params.contactId);
  }
  if (params?.organizationId) {
    filtered = filtered.filter((a) => a.organizationId === params.organizationId);
  }

  // Calculate summary
  const summary = {
    totalUpgrades: filtered.length,
    gradeAUpgrades: filtered.filter((a) => a.newGrade === "A").length,
    gradeBUpgrades: filtered.filter((a) => a.newGrade === "B").length,
    emailsSent: filtered.filter((a) => a.notificationsSent.email).length,
    whatsappSent: filtered.filter((a) => a.notificationsSent.whatsapp).length,
  };

  // Paginate
  const total = filtered.length;
  const alerts = filtered.slice(offset, offset + limit);

  return {
    alerts,
    total,
    summary,
  };
}

// =============================================================================
// INTEGRATION WITH LEAD SCORING
// =============================================================================

/**
 * Process a score update and trigger alerts if needed
 * Call this after updating a contact's lead score
 */
export async function processScoreUpdate(params: {
  contactId: string;
  previousScore: number | undefined;
  newScore: number;
  organizationId?: string;
}): Promise<ScoreAlert | null> {
  const thresholds = DEFAULT_CONFIG.thresholds;

  // Determine grades
  const getGrade = (score: number): Grade => {
    if (score >= thresholds.A) return "A";
    if (score >= thresholds.B) return "B";
    if (score >= thresholds.C) return "C";
    return "D";
  };

  const previousGrade = params.previousScore !== undefined
    ? getGrade(params.previousScore)
    : "D";
  const newGrade = getGrade(params.newScore);

  // Check if grade changed
  if (previousGrade === newGrade) {
    return null;
  }

  // Trigger alert for upgrade
  return triggerAlert({
    contactId: params.contactId,
    previousGrade,
    newGrade,
    previousScore: params.previousScore ?? 0,
    newScore: params.newScore,
    organizationId: params.organizationId,
  });
}
