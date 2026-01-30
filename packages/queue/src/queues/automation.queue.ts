// =============================================================================
// AUTOMATION QUEUE - Workflow and scheduled job execution
// =============================================================================

import { Queue, QueueEvents } from 'bullmq';
import { connection } from '../connection';
import type { AutomationJobData, AutomationJobResult } from '../types';

export const AUTOMATION_QUEUE_NAME = 'automation';

// Create the automation queue
export const automationQueue = new Queue<AutomationJobData, AutomationJobResult>(
  AUTOMATION_QUEUE_NAME,
  {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        count: 1000,
        age: 24 * 60 * 60, // 24 hours
      },
      removeOnFail: {
        count: 5000,
        age: 7 * 24 * 60 * 60, // 7 days
      },
    },
  }
);

// Queue events for monitoring
export const automationQueueEvents = new QueueEvents(AUTOMATION_QUEUE_NAME, {
  connection,
});

// Helper functions
export async function addAutomationJob(
  name: string,
  data: AutomationJobData,
  options?: {
    delay?: number;
    priority?: number;
    jobId?: string;
  }
) {
  return automationQueue.add(name, data, {
    delay: options?.delay,
    priority: options?.priority,
    jobId: options?.jobId,
  });
}

export async function scheduleAutomationJob(
  name: string,
  data: AutomationJobData,
  pattern: string // cron pattern
) {
  return automationQueue.upsertJobScheduler(
    `scheduled:${data.workflowId}`,
    { pattern },
    {
      name,
      data,
    }
  );
}

export async function removeScheduledJob(workflowId: string) {
  return automationQueue.removeJobScheduler(`scheduled:${workflowId}`);
}

export async function getAutomationJobCounts() {
  return automationQueue.getJobCounts(
    'waiting',
    'active',
    'completed',
    'failed',
    'delayed',
    'paused'
  );
}

export async function getAutomationJob(jobId: string) {
  return automationQueue.getJob(jobId);
}

export async function pauseAutomationQueue() {
  return automationQueue.pause();
}

export async function resumeAutomationQueue() {
  return automationQueue.resume();
}
