// =============================================================================
// REPORT QUEUE - Report generation and delivery
// =============================================================================

import { Queue, QueueEvents } from 'bullmq';
import { connection } from '../connection';
import type { ReportJobData, ReportJobResult, ReportType, ReportFormat } from '../types';

export const REPORT_QUEUE_NAME = 'report';

// Create the report queue
export const reportQueue = new Queue<ReportJobData, ReportJobResult>(
  REPORT_QUEUE_NAME,
  {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 60000, // 1 minute
      },
      removeOnComplete: {
        count: 200,
        age: 7 * 24 * 60 * 60,
      },
      removeOnFail: {
        count: 500,
        age: 30 * 24 * 60 * 60,
      },
    },
  }
);

// Queue events
export const reportQueueEvents = new QueueEvents(REPORT_QUEUE_NAME, {
  connection,
});

// Helper functions
export async function generateReport(
  organizationId: string,
  reportType: ReportType,
  options: {
    format?: ReportFormat;
    dateRange?: { start: Date; end: Date };
    filters?: Record<string, unknown>;
    recipients?: string[];
    saveToStorage?: boolean;
  } = {}
) {
  const now = new Date();
  const defaultDateRange = {
    start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: now,
  };

  return reportQueue.add('generate', {
    organizationId,
    reportType,
    format: options.format || 'pdf',
    dateRange: options.dateRange || defaultDateRange,
    filters: options.filters,
    recipients: options.recipients,
    saveToStorage: options.saveToStorage ?? true,
    triggeredBy: 'manual',
    triggeredAt: new Date(),
  });
}

export async function scheduleDailyReport(
  organizationId: string,
  recipients: string[],
  time: string = '08:00' // HH:MM format
) {
  const [hours, minutes] = time.split(':').map(Number);

  return reportQueue.upsertJobScheduler(
    `daily-report:${organizationId}`,
    { pattern: `${minutes} ${hours} * * *` },
    {
      name: 'daily-summary',
      data: {
        organizationId,
        reportType: 'daily_summary',
        format: 'pdf',
        dateRange: {
          start: new Date(), // Will be calculated at runtime
          end: new Date(),
        },
        recipients,
        saveToStorage: true,
        triggeredBy: 'cron',
        triggeredAt: new Date(),
      },
    }
  );
}

export async function scheduleWeeklyReport(
  organizationId: string,
  recipients: string[],
  dayOfWeek: number = 1 // Monday
) {
  return reportQueue.upsertJobScheduler(
    `weekly-report:${organizationId}`,
    { pattern: `0 9 * * ${dayOfWeek}` }, // 9 AM
    {
      name: 'weekly-sales',
      data: {
        organizationId,
        reportType: 'weekly_sales',
        format: 'pdf',
        dateRange: {
          start: new Date(),
          end: new Date(),
        },
        recipients,
        saveToStorage: true,
        triggeredBy: 'cron',
        triggeredAt: new Date(),
      },
    }
  );
}

export async function getReportJobCounts() {
  return reportQueue.getJobCounts(
    'waiting',
    'active',
    'completed',
    'failed',
    'delayed'
  );
}
