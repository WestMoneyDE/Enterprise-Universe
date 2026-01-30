// =============================================================================
// QUEUES - Export all queue instances and helpers
// =============================================================================

export * from './automation.queue';
export * from './email.queue';
export * from './sync.queue';
export * from './webhook.queue';
export * from './report.queue';

// Re-export queue names for worker registration
export const QUEUE_NAMES = {
  AUTOMATION: 'automation',
  EMAIL: 'email',
  SYNC: 'sync',
  WEBHOOK: 'webhook',
  REPORT: 'report',
} as const;

// Import all queues for batch operations
import { automationQueue } from './automation.queue';
import { emailQueue } from './email.queue';
import { syncQueue } from './sync.queue';
import { webhookQueue } from './webhook.queue';
import { reportQueue } from './report.queue';

// Get all queue stats at once
export async function getAllQueueStats() {
  const [automation, email, sync, webhook, report] = await Promise.all([
    automationQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
    emailQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
    syncQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
    webhookQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
    reportQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
  ]);

  return {
    automation,
    email,
    sync,
    webhook,
    report,
    totals: {
      waiting: automation.waiting + email.waiting + sync.waiting + webhook.waiting + report.waiting,
      active: automation.active + email.active + sync.active + webhook.active + report.active,
      completed: automation.completed + email.completed + sync.completed + webhook.completed + report.completed,
      failed: automation.failed + email.failed + sync.failed + webhook.failed + report.failed,
      delayed: automation.delayed + email.delayed + sync.delayed + webhook.delayed + report.delayed,
    },
  };
}

// Pause all queues
export async function pauseAllQueues() {
  await Promise.all([
    automationQueue.pause(),
    emailQueue.pause(),
    syncQueue.pause(),
    webhookQueue.pause(),
    reportQueue.pause(),
  ]);
}

// Resume all queues
export async function resumeAllQueues() {
  await Promise.all([
    automationQueue.resume(),
    emailQueue.resume(),
    syncQueue.resume(),
    webhookQueue.resume(),
    reportQueue.resume(),
  ]);
}

// Clean old jobs from all queues
export async function cleanAllQueues(grace: number = 24 * 60 * 60 * 1000) {
  await Promise.all([
    automationQueue.clean(grace, 1000, 'completed'),
    emailQueue.clean(grace, 1000, 'completed'),
    syncQueue.clean(grace, 1000, 'completed'),
    webhookQueue.clean(grace, 1000, 'completed'),
    reportQueue.clean(grace, 1000, 'completed'),
  ]);
}
