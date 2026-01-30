import { pgEnum } from "drizzle-orm/pg-core";

// =============================================================================
// ENUMS
// =============================================================================

export const subsidiaryEnum = pgEnum("subsidiary", [
  "west_money_bau",
  "west_money_os",
  "z_automation",
  "dedsec_world_ai",
  "enterprise_universe",
]);

export const contactTypeEnum = pgEnum("contact_type", [
  "lead",
  "customer",
  "investor",
  "partner",
  "vendor",
  "employee",
]);

export const consentStatusEnum = pgEnum("consent_status", [
  "pending",
  "granted",
  "revoked",
  "confirmed",
]);

export const emailStatusEnum = pgEnum("email_status", [
  "active",
  "bounced",
  "complained",
  "unsubscribed",
]);

export const dealStageEnum = pgEnum("deal_stage", [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "scheduled",
  "running",
  "paused",
  "completed",
  "cancelled",
]);

export const campaignTypeEnum = pgEnum("campaign_type", [
  "one_time",
  "sequence",
  "trigger_based",
]);

export const projectStageEnum = pgEnum("project_stage", [
  "lead",
  "erstberatung",
  "angebot",
  "vertrag",
  "planung",
  "vorbereitung",
  "rohbau",
  "innenausbau",
  "smart_home",
  "finishing",
  "abnahme",
  "uebergabe",
  "gewaehrleistung",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "refunded",
]);

export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "admin",
  "manager",
  "member",
  "viewer",
]);

// =============================================================================
// KUNDENKARTE & BAUHERREN-PASS ENUMS
// =============================================================================

export const kundenkarteStatusEnum = pgEnum("kundenkarte_status", [
  "draft",
  "pending_review",
  "approved",
  "active",
  "on_hold",
  "completed",
  "archived",
]);

export const kundenkarteTierEnum = pgEnum("kundenkarte_tier", [
  "bronze",
  "silver",
  "gold",
]);

export const bauherrenPassStatusEnum = pgEnum("bauherren_pass_status", [
  "nicht_erstellt",
  "in_bearbeitung",
  "vollstaendig",
  "geprueft",
  "freigegeben",
  "archiviert",
]);

export const documentCategoryEnum = pgEnum("document_category", [
  "vertrag",
  "genehmigung",
  "baugenehmigung",
  "statik",
  "energieausweis",
  "versicherung",
  "rechnung",
  "protokoll",
  "plan",
  "foto",
  "sonstiges",
]);

// =============================================================================
// PRODUCT & SERVICE ENUMS
// =============================================================================

export const productTypeEnum = pgEnum("product_type", [
  "physical",
  "digital",
  "service",
  "subscription",
  "bundle",
]);

export const productCategoryEnum = pgEnum("product_category", [
  "construction",
  "smart_home",
  "software",
  "consulting",
  "maintenance",
  "other",
]);

// =============================================================================
// TASK MANAGEMENT ENUMS
// =============================================================================

export const taskStatusEnum = pgEnum("task_status", [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "blocked",
  "done",
  "cancelled",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "urgent",
  "high",
  "medium",
  "low",
]);

export const taskTypeEnum = pgEnum("task_type", [
  "feature",
  "bug",
  "improvement",
  "documentation",
  "construction",
  "inspection",
  "delivery",
  "meeting",
  "other",
]);

// =============================================================================
// SUBCONTRACTOR ENUMS
// =============================================================================

export const subcontractorStatusEnum = pgEnum("subcontractor_status", [
  "prospect",
  "pending_approval",
  "approved",
  "active",
  "suspended",
  "blacklisted",
]);

export const gewerkeEnum = pgEnum("gewerke", [
  "rohbau",
  "maurerarbeiten",
  "betonarbeiten",
  "zimmererarbeiten",
  "dachdeckerarbeiten",
  "klempnerarbeiten",
  "fassadenarbeiten",
  "fenster_tueren",
  "trockenbau",
  "estricharbeiten",
  "fliesenarbeiten",
  "malerarbeiten",
  "bodenbelaege",
  "sanitaer",
  "heizung",
  "lueftung",
  "elektro",
  "smart_home",
  "garten_landschaft",
  "tiefbau",
  "abbruch",
  "entsorgung",
  "geruestbau",
  "sonstiges",
]);

// =============================================================================
// SMART HOME ENUMS
// =============================================================================

export const smartHomeProviderEnum = pgEnum("smart_home_provider", [
  "loxone",
  "homematic",
  "knx",
  "zigbee",
  "zwave",
  "matter",
  "custom",
]);

export const smartHomeDeviceTypeEnum = pgEnum("smart_home_device_type", [
  "lighting",
  "climate",
  "security",
  "access",
  "shading",
  "audio",
  "energy",
  "sensor",
  "actuator",
  "controller",
]);

// =============================================================================
// COMMUNICATION ENUMS
// =============================================================================

export const messageChannelEnum = pgEnum("message_channel", [
  "email",
  "whatsapp",
  "sms",
  "push",
  "in_app",
]);

export const messageDirectionEnum = pgEnum("message_direction", [
  "inbound",
  "outbound",
]);

export const messageStatusEnumV2 = pgEnum("message_status_v2", [
  "pending",
  "sent",
  "delivered",
  "read",
  "failed",
  "bounced",
]);

// =============================================================================
// COMMISSION ENUMS
// =============================================================================

export const commissionStatusEnum = pgEnum("commission_status", [
  "pending",
  "qualified",
  "approved",
  "paid",
]);

// =============================================================================
// PROVISION (COMMISSION TRACKING) ENUMS
// =============================================================================

export const provisionStatusEnum = pgEnum("provision_status", [
  "pending_payment",      // Waiting for customer payment
  "payment_confirmed",    // Customer paid, ready for payout
  "payout_initiated",     // Payout process started
  "payout_processing",    // Payout being processed
  "paid",                 // Commission paid out
  "failed",               // Payout failed
  "cancelled",            // Cancelled/voided
]);

export const provisionPayoutMethodEnum = pgEnum("provision_payout_method", [
  "stripe_connect",       // Stripe Connect transfer
  "sepa",                 // SEPA bank transfer
  "manual",               // Manual/offline payment
]);
