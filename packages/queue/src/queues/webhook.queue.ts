// =============================================================================
// WEBHOOK QUEUE - Outgoing webhook delivery with retries
// =============================================================================

import { Queue, QueueEvents } from 'bullmq';
import { connection } from '../connection';
import type { WebhookJobData, WebhookJobResult } from '../types';

export const WEBHOOK_QUEUE_NAME = 'webhook';

// Create the webhook queue
export const webhookQueue = new Queue<WebhookJobData, WebhookJobResult>(
  WEBHOOK_QUEUE_NAME,
  {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 5000, // Start with 5 seconds
      },
      removeOnComplete: {
        count: 2000,
        age: 3 * 24 * 60 * 60, // 3 days
      },
      removeOnFail: {
        count: 5000,
        age: 14 * 24 * 60 * 60, // 14 days
      },
    },
  }
);

// Queue events
export const webhookQueueEvents = new QueueEvents(WEBHOOK_QUEUE_NAME, {
  connection,
});

// Helper functions
export async function sendWebhook(data: WebhookJobData) {
  return webhookQueue.add('deliver', data, {
    jobId: `${data.endpointId}:${data.eventType}:${Date.now()}`,
  });
}

export async function sendWebhookBatch(
  endpoints: Array<{ id: string; url: string; secret?: string; headers?: Record<string, string> }>,
  eventType: string,
  payload: Record<string, unknown>,
  organizationId: string
) {
  const jobs = endpoints.map((endpoint) => ({
    name: 'deliver',
    data: {
      endpointId: endpoint.id,
      url: endpoint.url,
      eventType,
      payload,
      headers: endpoint.headers,
      secret: endpoint.secret,
      organizationId,
      triggeredBy: 'event' as const,
      triggeredAt: new Date(),
    },
  }));

  return webhookQueue.addBulk(jobs);
}

export async function getWebhookJobCounts() {
  return webhookQueue.getJobCounts(
    'waiting',
    'active',
    'completed',
    'failed',
    'delayed'
  );
}

export async function getFailedWebhooks(endpointId?: string) {
  const failed = await webhookQueue.getFailed();
  if (endpointId) {
    return failed.filter((job) => job.data.endpointId === endpointId);
  }
  return failed;
}

export async function retryWebhook(jobId: string) {
  const job = await webhookQueue.getJob(jobId);
  if (job) {
    await job.retry();
    return true;
  }
  return false;
}
