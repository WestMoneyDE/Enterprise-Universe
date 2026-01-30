// =============================================================================
// DEAL STAGE AUTOMATION SERVICE
// =============================================================================
// Automatic deal stage progression based on actions and events
// Integrates with HubSpot for bi-directional sync

import {
  db,
  deals,
  dealActivities,
  pipelineStages,
  eq,
  and,
  desc,
  sql,
} from "@nexus/db";
import { HubSpotService, getHubSpotService } from "./hubspot";

// =============================================================================
// TYPES
// =============================================================================

export type TriggerAction =
  | "contact_form_submitted"
  | "meeting_scheduled"
  | "quote_sent"
  | "bauherren_pass_created"
  | "kundenkarte_created"
  | "email_opened"
  | "email_clicked"
  | "document_signed"
  | "payment_received"
  | "proposal_viewed"
  | "callback_requested"
  | "whatsapp_contact"
  | "site_visit_scheduled"
  | "contract_sent"
  | "custom";

export type TargetStage =
  | "lead"
  | "contacted"
  | "meeting_booked"
  | "qualified"
  | "quote_sent"
  | "proposal"
  | "negotiation"
  | "contract_sent"
  | "won"
  | "lost";

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  triggerAction: TriggerAction;
  targetStage: TargetStage;
  targetStageId?: string; // Pipeline stage UUID if using custom pipelines
  conditions?: AutomationCondition[];
  isActive: boolean;
  priority: number; // Lower = higher priority
  syncToHubSpot: boolean;
  createdAt: Date;
  updatedAt: Date;
  organizationId?: string;
}

export interface AutomationCondition {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "is_set" | "is_not_set";
  value?: string | number | boolean;
}

export interface StageChangeResult {
  success: boolean;
  dealId: string;
  previousStage: string | null;
  newStage: string;
  ruleId?: string;
  ruleName?: string;
  hubspotSynced: boolean;
  hubspotDealId?: string;
  error?: string;
  timestamp: Date;
}

export interface AutomationEvent {
  action: TriggerAction;
  dealId: string;
  organizationId: string;
  contactId?: string;
  metadata?: Record<string, unknown>;
  triggeredBy?: string; // User ID or system
  occurredAt?: Date;
}

// =============================================================================
// DEFAULT AUTOMATION RULES
// =============================================================================

const DEFAULT_RULES: Omit<AutomationRule, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "Contact Form to Contacted",
    description: "Move deal to Contacted stage when contact form is submitted",
    triggerAction: "contact_form_submitted",
    targetStage: "contacted",
    isActive: true,
    priority: 10,
    syncToHubSpot: true,
  },
  {
    name: "Meeting Scheduled to Meeting Booked",
    description: "Move deal to Meeting Booked stage when a meeting is scheduled",
    triggerAction: "meeting_scheduled",
    targetStage: "meeting_booked",
    isActive: true,
    priority: 20,
    syncToHubSpot: true,
  },
  {
    name: "Quote Sent Stage Update",
    description: "Move deal to Quote Sent stage when a quote is sent",
    triggerAction: "quote_sent",
    targetStage: "quote_sent",
    isActive: true,
    priority: 30,
    syncToHubSpot: true,
  },
  {
    name: "Bauherren-Pass to Qualified",
    description: "Move deal to Qualified stage when Bauherren-Pass is created",
    triggerAction: "bauherren_pass_created",
    targetStage: "qualified",
    isActive: true,
    priority: 15,
    syncToHubSpot: true,
  },
  {
    name: "Kundenkarte to Contacted",
    description: "Move deal to Contacted stage when Kundenkarte is created",
    triggerAction: "kundenkarte_created",
    targetStage: "contacted",
    isActive: true,
    priority: 12,
    syncToHubSpot: true,
  },
  {
    name: "Contract Sent Stage",
    description: "Move deal to Contract Sent stage when contract is sent",
    triggerAction: "contract_sent",
    targetStage: "contract_sent",
    isActive: true,
    priority: 40,
    syncToHubSpot: true,
  },
  {
    name: "Document Signed to Negotiation",
    description: "Move deal to Negotiation stage when document is signed",
    triggerAction: "document_signed",
    targetStage: "negotiation",
    isActive: true,
    priority: 35,
    syncToHubSpot: true,
  },
  {
    name: "Payment Received to Won",
    description: "Move deal to Won stage when payment is received",
    triggerAction: "payment_received",
    targetStage: "won",
    isActive: true,
    priority: 50,
    syncToHubSpot: true,
  },
];

// =============================================================================
// IN-MEMORY RULES STORE (can be replaced with DB persistence)
// =============================================================================

class AutomationRulesStore {
  private rules: Map<string, AutomationRule> = new Map();
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load default rules
    for (const rule of DEFAULT_RULES) {
      const id = this.generateRuleId(rule.triggerAction, rule.targetStage);
      this.rules.set(id, {
        ...rule,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    this.initialized = true;
    console.log(`[DealAutomation] Initialized with ${this.rules.size} default rules`);
  }

  private generateRuleId(action: string, stage: string): string {
    return `rule_${action}_${stage}_${Date.now().toString(36)}`;
  }

  getAll(organizationId?: string): AutomationRule[] {
    const rules = Array.from(this.rules.values());
    if (organizationId) {
      return rules.filter(
        (r) => !r.organizationId || r.organizationId === organizationId
      );
    }
    return rules;
  }

  getByTrigger(action: TriggerAction, organizationId?: string): AutomationRule[] {
    return this.getAll(organizationId)
      .filter((r) => r.triggerAction === action && r.isActive)
      .sort((a, b) => a.priority - b.priority);
  }

  getById(id: string): AutomationRule | undefined {
    return this.rules.get(id);
  }

  add(rule: Omit<AutomationRule, "id" | "createdAt" | "updatedAt">): AutomationRule {
    const id = this.generateRuleId(rule.triggerAction, rule.targetStage);
    const newRule: AutomationRule = {
      ...rule,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.rules.set(id, newRule);
    return newRule;
  }

  update(id: string, updates: Partial<AutomationRule>): AutomationRule | null {
    const existing = this.rules.get(id);
    if (!existing) return null;

    const updated: AutomationRule = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };
    this.rules.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.rules.delete(id);
  }

  setActive(id: string, isActive: boolean): AutomationRule | null {
    return this.update(id, { isActive });
  }
}

// Singleton instance
const rulesStore = new AutomationRulesStore();

// =============================================================================
// STAGE MAPPING
// =============================================================================

// Map target stages to HubSpot deal stages
const HUBSPOT_STAGE_MAPPING: Record<TargetStage, string> = {
  lead: "appointmentscheduled",
  contacted: "appointmentscheduled",
  meeting_booked: "qualifiedtobuy",
  qualified: "qualifiedtobuy",
  quote_sent: "presentationscheduled",
  proposal: "presentationscheduled",
  negotiation: "decisionmakerboughtin",
  contract_sent: "contractsent",
  won: "closedwon",
  lost: "closedlost",
};

// Map target stages to Nexus deal stage enum
const NEXUS_STAGE_MAPPING: Record<TargetStage, "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost"> = {
  lead: "lead",
  contacted: "lead",
  meeting_booked: "qualified",
  qualified: "qualified",
  quote_sent: "proposal",
  proposal: "proposal",
  negotiation: "negotiation",
  contract_sent: "negotiation",
  won: "won",
  lost: "lost",
};

// =============================================================================
// MAIN AUTOMATION FUNCTIONS
// =============================================================================

/**
 * Initialize the automation service
 */
export async function initializeDealAutomation(): Promise<void> {
  await rulesStore.initialize();
}

/**
 * Trigger a stage change evaluation based on an action
 */
export async function triggerStageChange(
  event: AutomationEvent
): Promise<StageChangeResult> {
  await rulesStore.initialize();

  const { action, dealId, organizationId, metadata, triggeredBy } = event;
  const timestamp = event.occurredAt || new Date();

  console.log(`[DealAutomation] Processing trigger: ${action} for deal ${dealId}`);

  try {
    // Get the deal
    const deal = await db.query.deals.findFirst({
      where: and(
        eq(deals.id, dealId),
        eq(deals.organizationId, organizationId)
      ),
      with: {
        stage: true,
        pipeline: true,
      },
    });

    if (!deal) {
      return {
        success: false,
        dealId,
        previousStage: null,
        newStage: "",
        hubspotSynced: false,
        error: "Deal not found",
        timestamp,
      };
    }

    // Find matching automation rules
    const matchingRules = rulesStore.getByTrigger(action, organizationId);

    if (matchingRules.length === 0) {
      console.log(`[DealAutomation] No active rules found for trigger: ${action}`);
      return {
        success: false,
        dealId,
        previousStage: deal.stage,
        newStage: deal.stage || "",
        hubspotSynced: false,
        error: "No matching automation rules",
        timestamp,
      };
    }

    // Use the first matching rule (highest priority)
    const rule = matchingRules[0];

    // Check conditions if any
    if (rule.conditions && rule.conditions.length > 0) {
      const conditionsMet = evaluateConditions(rule.conditions, deal, metadata);
      if (!conditionsMet) {
        console.log(`[DealAutomation] Conditions not met for rule: ${rule.name}`);
        return {
          success: false,
          dealId,
          previousStage: deal.stage,
          newStage: deal.stage || "",
          ruleId: rule.id,
          ruleName: rule.name,
          hubspotSynced: false,
          error: "Rule conditions not met",
          timestamp,
        };
      }
    }

    // Determine the target stage
    const previousStage = deal.stage;
    const newStage = NEXUS_STAGE_MAPPING[rule.targetStage];

    // Check if stage actually needs to change
    if (previousStage === newStage) {
      console.log(`[DealAutomation] Deal already in target stage: ${newStage}`);
      return {
        success: true,
        dealId,
        previousStage,
        newStage,
        ruleId: rule.id,
        ruleName: rule.name,
        hubspotSynced: false,
        timestamp,
      };
    }

    // Update the deal stage
    let targetStageId = rule.targetStageId;

    // If no specific stage ID, try to find matching pipeline stage
    if (!targetStageId && deal.pipelineId) {
      const pipelineStage = await findPipelineStage(deal.pipelineId, rule.targetStage);
      if (pipelineStage) {
        targetStageId = pipelineStage.id;
      }
    }

    // Update the deal
    await db
      .update(deals)
      .set({
        stage: newStage,
        stageId: targetStageId || deal.stageId,
        stageChangedAt: timestamp,
        updatedAt: timestamp,
        // Set close date if moving to won/lost
        ...(newStage === "won" || newStage === "lost"
          ? { actualCloseDate: timestamp }
          : {}),
      })
      .where(eq(deals.id, dealId));

    // Log the stage change activity
    await db.insert(dealActivities).values({
      dealId,
      organizationId,
      type: "stage_change",
      title: `Stage changed to ${rule.targetStage}`,
      description: `Automatic stage change triggered by: ${action}`,
      fromStageId: deal.stageId || undefined,
      toStageId: targetStageId || undefined,
      performedBy: triggeredBy || undefined,
      metadata: {
        automationRuleId: rule.id,
        automationRuleName: rule.name,
        triggerAction: action,
        previousStage,
        newStage,
        ...metadata,
      },
      occurredAt: timestamp,
    });

    console.log(`[DealAutomation] Stage changed: ${previousStage} -> ${newStage} (Rule: ${rule.name})`);

    // Sync to HubSpot if enabled
    let hubspotSynced = false;
    let hubspotDealId = deal.hubspotDealId || undefined;

    if (rule.syncToHubSpot && deal.hubspotDealId) {
      try {
        const syncResult = await syncStageToHubSpot(
          dealId,
          organizationId,
          rule.targetStage
        );
        hubspotSynced = syncResult.success;
        if (syncResult.hubspotDealId) {
          hubspotDealId = syncResult.hubspotDealId;
        }
      } catch (error) {
        console.error(`[DealAutomation] HubSpot sync error:`, error);
      }
    }

    return {
      success: true,
      dealId,
      previousStage,
      newStage,
      ruleId: rule.id,
      ruleName: rule.name,
      hubspotSynced,
      hubspotDealId,
      timestamp,
    };
  } catch (error) {
    console.error(`[DealAutomation] Error processing trigger:`, error);
    return {
      success: false,
      dealId,
      previousStage: null,
      newStage: "",
      hubspotSynced: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp,
    };
  }
}

/**
 * Get all automation rules
 */
export async function getAutomationRules(
  organizationId?: string,
  options?: {
    activeOnly?: boolean;
    triggerAction?: TriggerAction;
  }
): Promise<AutomationRule[]> {
  await rulesStore.initialize();

  let rules = rulesStore.getAll(organizationId);

  if (options?.activeOnly) {
    rules = rules.filter((r) => r.isActive);
  }

  if (options?.triggerAction) {
    rules = rules.filter((r) => r.triggerAction === options.triggerAction);
  }

  return rules.sort((a, b) => a.priority - b.priority);
}

/**
 * Get a single automation rule by ID
 */
export async function getAutomationRule(
  ruleId: string
): Promise<AutomationRule | null> {
  await rulesStore.initialize();
  return rulesStore.getById(ruleId) || null;
}

/**
 * Add a new automation rule
 */
export async function addAutomationRule(
  rule: {
    name: string;
    description?: string;
    triggerAction: TriggerAction;
    targetStage: TargetStage;
    targetStageId?: string;
    conditions?: AutomationCondition[];
    isActive?: boolean;
    priority?: number;
    syncToHubSpot?: boolean;
    organizationId?: string;
  }
): Promise<AutomationRule> {
  await rulesStore.initialize();

  const newRule = rulesStore.add({
    name: rule.name,
    description: rule.description,
    triggerAction: rule.triggerAction,
    targetStage: rule.targetStage,
    targetStageId: rule.targetStageId,
    conditions: rule.conditions,
    isActive: rule.isActive ?? true,
    priority: rule.priority ?? 50,
    syncToHubSpot: rule.syncToHubSpot ?? true,
    organizationId: rule.organizationId,
  });

  console.log(`[DealAutomation] Added rule: ${newRule.name} (${newRule.id})`);
  return newRule;
}

/**
 * Update an existing automation rule
 */
export async function updateAutomationRule(
  ruleId: string,
  updates: Partial<Omit<AutomationRule, "id" | "createdAt" | "updatedAt">>
): Promise<AutomationRule | null> {
  await rulesStore.initialize();

  const updated = rulesStore.update(ruleId, updates);
  if (updated) {
    console.log(`[DealAutomation] Updated rule: ${updated.name} (${updated.id})`);
  }
  return updated;
}

/**
 * Delete an automation rule
 */
export async function deleteAutomationRule(ruleId: string): Promise<boolean> {
  await rulesStore.initialize();

  const deleted = rulesStore.delete(ruleId);
  if (deleted) {
    console.log(`[DealAutomation] Deleted rule: ${ruleId}`);
  }
  return deleted;
}

/**
 * Toggle automation rule active status
 */
export async function toggleAutomationRule(
  ruleId: string,
  isActive: boolean
): Promise<AutomationRule | null> {
  await rulesStore.initialize();
  return rulesStore.setActive(ruleId, isActive);
}

/**
 * Sync deal stage change to HubSpot
 */
export async function syncStageToHubSpot(
  dealId: string,
  organizationId: string,
  targetStage: TargetStage
): Promise<{
  success: boolean;
  hubspotDealId?: string;
  error?: string;
}> {
  try {
    const hubspot = await getHubSpotService(organizationId);
    if (!hubspot) {
      return { success: false, error: "HubSpot not configured" };
    }

    // Get the deal to find HubSpot ID
    const deal = await db.query.deals.findFirst({
      where: and(
        eq(deals.id, dealId),
        eq(deals.organizationId, organizationId)
      ),
    });

    if (!deal) {
      return { success: false, error: "Deal not found" };
    }

    if (!deal.hubspotDealId) {
      console.log(`[DealAutomation] Deal ${dealId} not linked to HubSpot, skipping sync`);
      return { success: true, error: "Deal not linked to HubSpot" };
    }

    // Map target stage to HubSpot stage
    const hubspotStage = HUBSPOT_STAGE_MAPPING[targetStage];

    // Update HubSpot deal
    await hubspot.updateDeal(deal.hubspotDealId, {
      dealstage: hubspotStage,
    });

    console.log(`[DealAutomation] Synced stage to HubSpot: ${deal.hubspotDealId} -> ${hubspotStage}`);

    return {
      success: true,
      hubspotDealId: deal.hubspotDealId,
    };
  } catch (error) {
    console.error(`[DealAutomation] HubSpot sync error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Bulk sync stages to HubSpot for multiple deals
 */
export async function bulkSyncStagesToHubSpot(
  dealIds: string[],
  organizationId: string
): Promise<{
  successful: number;
  failed: number;
  errors: Array<{ dealId: string; error: string }>;
}> {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as Array<{ dealId: string; error: string }>,
  };

  for (const dealId of dealIds) {
    const deal = await db.query.deals.findFirst({
      where: and(
        eq(deals.id, dealId),
        eq(deals.organizationId, organizationId)
      ),
    });

    if (!deal || !deal.stage) {
      results.failed++;
      results.errors.push({ dealId, error: "Deal not found or has no stage" });
      continue;
    }

    // Find matching target stage
    const targetStage = Object.entries(NEXUS_STAGE_MAPPING).find(
      ([_, nexusStage]) => nexusStage === deal.stage
    )?.[0] as TargetStage | undefined;

    if (!targetStage) {
      results.failed++;
      results.errors.push({ dealId, error: `Unknown stage: ${deal.stage}` });
      continue;
    }

    const result = await syncStageToHubSpot(dealId, organizationId, targetStage);

    if (result.success) {
      results.successful++;
    } else {
      results.failed++;
      results.errors.push({ dealId, error: result.error || "Unknown error" });
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Find a pipeline stage by target stage name
 */
async function findPipelineStage(
  pipelineId: string,
  targetStage: TargetStage
): Promise<{ id: string; name: string } | null> {
  // Map target stage names to potential pipeline stage names
  const stageNameVariants: Record<TargetStage, string[]> = {
    lead: ["Lead", "New", "Neu", "Initial"],
    contacted: ["Contacted", "Kontaktiert", "First Contact", "Erstkontakt"],
    meeting_booked: ["Meeting Booked", "Termin vereinbart", "Meeting Scheduled", "Appointment"],
    qualified: ["Qualified", "Qualifiziert", "Qualified Lead", "Sales Qualified"],
    quote_sent: ["Quote Sent", "Angebot versendet", "Proposal Sent", "Angebot"],
    proposal: ["Proposal", "Angebot", "Offer", "Offerte"],
    negotiation: ["Negotiation", "Verhandlung", "In Negotiation", "Discussion"],
    contract_sent: ["Contract Sent", "Vertrag versendet", "Contract", "Vertrag"],
    won: ["Won", "Gewonnen", "Closed Won", "Abgeschlossen"],
    lost: ["Lost", "Verloren", "Closed Lost", "Abgelehnt"],
  };

  const variants = stageNameVariants[targetStage] || [];

  // Try to find a matching stage
  for (const variant of variants) {
    const stage = await db.query.pipelineStages.findFirst({
      where: and(
        eq(pipelineStages.pipelineId, pipelineId),
        sql`LOWER(${pipelineStages.name}) = LOWER(${variant})`
      ),
    });

    if (stage) {
      return { id: stage.id, name: stage.name };
    }
  }

  return null;
}

/**
 * Evaluate automation rule conditions
 */
function evaluateConditions(
  conditions: AutomationCondition[],
  deal: Record<string, unknown>,
  metadata?: Record<string, unknown>
): boolean {
  for (const condition of conditions) {
    const value = deal[condition.field] ?? metadata?.[condition.field];

    switch (condition.operator) {
      case "equals":
        if (value !== condition.value) return false;
        break;
      case "not_equals":
        if (value === condition.value) return false;
        break;
      case "contains":
        if (typeof value !== "string" || !value.includes(String(condition.value))) return false;
        break;
      case "greater_than":
        if (typeof value !== "number" || value <= Number(condition.value)) return false;
        break;
      case "less_than":
        if (typeof value !== "number" || value >= Number(condition.value)) return false;
        break;
      case "is_set":
        if (value === null || value === undefined) return false;
        break;
      case "is_not_set":
        if (value !== null && value !== undefined) return false;
        break;
    }
  }

  return true;
}

/**
 * Get automation statistics
 */
export async function getAutomationStats(
  organizationId?: string
): Promise<{
  totalRules: number;
  activeRules: number;
  byTrigger: Record<TriggerAction, number>;
  byTargetStage: Record<TargetStage, number>;
}> {
  await rulesStore.initialize();

  const rules = rulesStore.getAll(organizationId);

  const byTrigger: Record<string, number> = {};
  const byTargetStage: Record<string, number> = {};

  for (const rule of rules) {
    byTrigger[rule.triggerAction] = (byTrigger[rule.triggerAction] || 0) + 1;
    byTargetStage[rule.targetStage] = (byTargetStage[rule.targetStage] || 0) + 1;
  }

  return {
    totalRules: rules.length,
    activeRules: rules.filter((r) => r.isActive).length,
    byTrigger: byTrigger as Record<TriggerAction, number>,
    byTargetStage: byTargetStage as Record<TargetStage, number>,
  };
}

/**
 * Get recent stage changes triggered by automation
 */
export async function getRecentAutomatedStageChanges(
  organizationId: string,
  limit: number = 20
): Promise<
  Array<{
    dealId: string;
    dealName: string;
    previousStage: string | null;
    newStage: string;
    ruleName: string;
    triggerAction: string;
    occurredAt: Date;
  }>
> {
  const activities = await db.query.dealActivities.findMany({
    where: and(
      eq(dealActivities.organizationId, organizationId),
      eq(dealActivities.type, "stage_change"),
      sql`${dealActivities.metadata}->>'automationRuleId' IS NOT NULL`
    ),
    orderBy: desc(dealActivities.occurredAt),
    limit,
    with: {
      deal: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  });

  return activities.map((activity) => {
    const metadata = activity.metadata as Record<string, unknown> | null;
    return {
      dealId: activity.dealId,
      dealName: activity.deal?.name || "Unknown",
      previousStage: (metadata?.previousStage as string) || null,
      newStage: (metadata?.newStage as string) || "",
      ruleName: (metadata?.automationRuleName as string) || "Unknown Rule",
      triggerAction: (metadata?.triggerAction as string) || "unknown",
      occurredAt: activity.occurredAt,
    };
  });
}

// =============================================================================
// CONVENIENCE FUNCTIONS FOR COMMON TRIGGERS
// =============================================================================

/**
 * Trigger stage change when contact form is submitted
 */
export async function onContactFormSubmitted(
  dealId: string,
  organizationId: string,
  metadata?: Record<string, unknown>
): Promise<StageChangeResult> {
  return triggerStageChange({
    action: "contact_form_submitted",
    dealId,
    organizationId,
    metadata,
  });
}

/**
 * Trigger stage change when meeting is scheduled
 */
export async function onMeetingScheduled(
  dealId: string,
  organizationId: string,
  metadata?: Record<string, unknown>
): Promise<StageChangeResult> {
  return triggerStageChange({
    action: "meeting_scheduled",
    dealId,
    organizationId,
    metadata,
  });
}

/**
 * Trigger stage change when quote is sent
 */
export async function onQuoteSent(
  dealId: string,
  organizationId: string,
  metadata?: Record<string, unknown>
): Promise<StageChangeResult> {
  return triggerStageChange({
    action: "quote_sent",
    dealId,
    organizationId,
    metadata,
  });
}

/**
 * Trigger stage change when Bauherren-Pass is created
 */
export async function onBauherrenPassCreated(
  dealId: string,
  organizationId: string,
  metadata?: Record<string, unknown>
): Promise<StageChangeResult> {
  return triggerStageChange({
    action: "bauherren_pass_created",
    dealId,
    organizationId,
    metadata,
  });
}

/**
 * Trigger stage change when Kundenkarte is created
 */
export async function onKundenkarteCreated(
  dealId: string,
  organizationId: string,
  metadata?: Record<string, unknown>
): Promise<StageChangeResult> {
  return triggerStageChange({
    action: "kundenkarte_created",
    dealId,
    organizationId,
    metadata,
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  initializeDealAutomation as initialize,
  triggerStageChange as trigger,
  getAutomationRules as getRules,
  addAutomationRule as addRule,
  syncStageToHubSpot as syncToHubSpot,
};
