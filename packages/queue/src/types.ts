// =============================================================================
// QUEUE TYPES - Type definitions for all queue jobs
// =============================================================================

// -----------------------------------------------------------------------------
// Base Job Types
// -----------------------------------------------------------------------------

export interface BaseJobData {
  organizationId: string;
  triggeredBy: 'cron' | 'event' | 'webhook' | 'manual' | 'system';
  triggeredAt: Date;
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Automation Queue
// -----------------------------------------------------------------------------

export interface AutomationJobData extends BaseJobData {
  workflowId: string;
  workflowName: string;
  workflowType: string;
  payload?: Record<string, unknown>;
}

export interface AutomationJobResult {
  success: boolean;
  duration: number;
  output?: Record<string, unknown>;
  error?: string;
}

// -----------------------------------------------------------------------------
// Email Queue
// -----------------------------------------------------------------------------

export interface EmailJobData extends BaseJobData {
  to: string | string[];
  subject: string;
  template: string;
  templateData: Record<string, unknown>;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export interface EmailJobResult {
  success: boolean;
  messageId?: string;
  provider: 'ses' | 'resend';
  error?: string;
}

// -----------------------------------------------------------------------------
// Sync Queue (HubSpot, CRM)
// -----------------------------------------------------------------------------

export type SyncDirection = 'push' | 'pull' | 'bidirectional';
export type SyncEntity = 'contacts' | 'deals' | 'companies' | 'all';

export interface SyncJobData extends BaseJobData {
  provider: 'hubspot' | 'stripe' | 'whatsapp';
  direction: SyncDirection;
  entity: SyncEntity;
  entityIds?: string[];
  fullSync?: boolean;
  lastSyncAt?: Date;
}

export interface SyncJobResult {
  success: boolean;
  provider: string;
  entity: string;
  created: number;
  updated: number;
  deleted: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
  duration: number;
}

// -----------------------------------------------------------------------------
// Webhook Queue
// -----------------------------------------------------------------------------

export interface WebhookJobData extends BaseJobData {
  endpointId: string;
  url: string;
  eventType: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  secret?: string;
  attemptNumber?: number;
}

export interface WebhookJobResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  duration: number;
  error?: string;
}

// -----------------------------------------------------------------------------
// Report Queue
// -----------------------------------------------------------------------------

export type ReportType = 'daily_summary' | 'weekly_sales' | 'monthly_overview' | 'custom';
export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'html';

export interface ReportJobData extends BaseJobData {
  reportType: ReportType;
  format: ReportFormat;
  dateRange: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, unknown>;
  recipients?: string[];
  saveToStorage?: boolean;
}

export interface ReportJobResult {
  success: boolean;
  reportUrl?: string;
  sentTo?: string[];
  size?: number;
  error?: string;
}

// -----------------------------------------------------------------------------
// Notification Queue
// -----------------------------------------------------------------------------

export type NotificationChannel = 'email' | 'push' | 'slack' | 'telegram' | 'whatsapp';

export interface NotificationJobData extends BaseJobData {
  userId?: string;
  channels: NotificationChannel[];
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  actionUrl?: string;
  data?: Record<string, unknown>;
}

export interface NotificationJobResult {
  success: boolean;
  channelsDelivered: NotificationChannel[];
  channelsFailed: NotificationChannel[];
  errors?: Record<NotificationChannel, string>;
}

// -----------------------------------------------------------------------------
// Job Status
// -----------------------------------------------------------------------------

export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';

export interface JobInfo {
  id: string;
  name: string;
  data: BaseJobData;
  status: JobStatus;
  progress: number;
  attemptsMade: number;
  createdAt: Date;
  processedAt?: Date;
  finishedAt?: Date;
  failedReason?: string;
}
