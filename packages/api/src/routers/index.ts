import { createTRPCRouter } from "../trpc";
import { authRouter } from "./auth";
import { contactsRouter } from "./contacts";
import { dealsRouter, pipelinesRouter } from "./deals";
import { dealContactsRouter } from "./deal-contacts";
import { projectsRouter } from "./projects";
import { campaignsRouter, emailTemplatesRouter } from "./campaigns";
import { organizationsRouter } from "./organizations";
import { messagingRouter } from "./messaging";
import { aiAgentRouter } from "./ai-agent";
import { leadScoringRouter } from "./lead-scoring";
import { bauherrenPassRouter } from "./bauherren-pass";
import { hubspotRouter } from "./hubspot";
import { hubspotStatsRouter } from "./hubspot-stats";
import { constructionStatsRouter } from "./construction-stats";
import { mailControllerRouter } from "./mail-controller";
import { kundenkarteRouter } from "./kundenkarte";
import { moneyMachineRouter } from "./money-machine";
import { securityRouter } from "./security";
import { automationRouter } from "./automation";
import { activityRouter } from "./activity";
import { notificationsRouter } from "./notifications";
import { systemRouter } from "./system";
import { integrationsRouter } from "./integrations";
import { dashboardRouter } from "./dashboard";
import { backupRouter } from "./backup";
import { leadGeneratorRouter } from "./lead-generator";
import { rolesRouter } from "./roles";
import { provisionRouter } from "./provision";
import { gdprRouter } from "./gdpr";
import { spamScannerRouter } from "./spam-scanner";

// =============================================================================
// APP ROUTER
// =============================================================================

/**
 * Main application router combining all domain routers.
 *
 * Router Structure:
 * - auth: User authentication, profile, 2FA management
 * - organizations: Organization settings, members, API keys
 * - contacts: Contact management, lists, activities
 * - deals: Sales pipeline, deal management
 * - pipelines: Custom pipeline configuration
 * - projects: West Money Bau construction project management
 * - campaigns: Email campaign management
 * - emailTemplates: Email template library
 * - messaging: WhatsApp, SMS, multi-channel messaging
 */
export const appRouter = createTRPCRouter({
  // Authentication & User Management
  auth: authRouter,

  // Organization Management
  organizations: organizationsRouter,

  // CRM - Contacts
  contacts: contactsRouter,

  // CRM - Deals & Pipelines
  deals: dealsRouter,
  pipelines: pipelinesRouter,
  dealContacts: dealContactsRouter,

  // West Money Bau - Construction Projects
  projects: projectsRouter,

  // Marketing - Email Campaigns
  campaigns: campaignsRouter,
  emailTemplates: emailTemplatesRouter,

  // Messaging - WhatsApp, SMS, Multi-Channel
  messaging: messagingRouter,

  // AI & Lead Scoring (stub implementations for dashboard)
  aiAgent: aiAgentRouter,
  leadScoring: leadScoringRouter,

  // Bauherren Pass - VIP Commission & Tier System
  bauherrenPass: bauherrenPassRouter,

  // HubSpot CRM Integration
  hubspot: hubspotRouter,
  hubspotStats: hubspotStatsRouter,

  // Construction Dashboard - West Money Bau Stats
  constructionStats: constructionStatsRouter,

  // Mail Controller - E-Mail System Prüfung & Kontrolle
  mailController: mailControllerRouter,

  // Kundenkarte - Customer Data Management System
  kundenkarte: kundenkarteRouter,

  // Money Machine - Automated Presentation & Sales Workflow
  moneyMachine: moneyMachineRouter,

  // Security - SSH Monitoring & System Security Status
  security: securityRouter,

  // Automation - Workflow & Scheduled Job Management
  automation: automationRouter,

  // Activity Feed - Real-time audit log activity
  activity: activityRouter,

  // Notifications - User notification management
  notifications: notificationsRouter,

  // System - Health checks, queue stats, power modes
  system: systemRouter,

  // Integrations - Telegram, Slack, n8n, Webhooks management
  integrations: integrationsRouter,

  // Dashboard - Public dashboard statistics
  dashboard: dashboardRouter,

  // Backup - Database backup management
  backup: backupRouter,

  // Lead Generator - Multi-source lead generation (Web Forms, HubSpot, Google Places)
  leadGenerator: leadGeneratorRouter,

  // Roles & Permissions - RBAC system for user access control
  roles: rolesRouter,

  // Provision - Commission tracking and payout management
  provision: provisionRouter,

  // GDPR - Consent management, data export, deletion requests
  gdpr: gdprRouter,

  // Spam Scanner - HubSpot contact spam detection & cleanup
  spamScanner: spamScannerRouter,
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/**
 * Type-safe router type for use with tRPC client
 */
export type AppRouter = typeof appRouter;
