// =============================================================================
// WEBHOOK WORKER - Processes outgoing webhook deliveries
// =============================================================================

import { Worker, Job } from 'bullmq';
import { createHmac } from 'crypto';
import { connection } from '../connection';
import { WEBHOOK_QUEUE_NAME } from '../queues/webhook.queue';
import type { WebhookJobData, WebhookJobResult } from '../types';

// Generate webhook signature
function generateSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

// Process webhook job
async function processWebhookJob(
  job: Job<WebhookJobData, WebhookJobResult>
): Promise<WebhookJobResult> {
  const startTime = Date.now();
  const { data } = job;

  console.log(`\n🔔 Processing webhook job: ${job.id}`);
  console.log(`   URL: ${data.url}`);
  console.log(`   Event: ${data.eventType}`);
  console.log(`   Attempt: ${(data.attemptNumber || 0) + 1}`);

  try {
    await job.updateProgress(10);

    // Prepare payload
    const payloadString = JSON.stringify({
      event: data.eventType,
      timestamp: new Date().toISOString(),
      data: data.payload,
    });

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'NexusCommandCenter/1.0',
      'X-Webhook-Event': data.eventType,
      'X-Webhook-Delivery': job.id || '',
      ...data.headers,
    };

    // Add signature if secret is provided
    if (data.secret) {
      const signature = generateSignature(payloadString, data.secret);
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    await job.updateProgress(30);

    // Send the webhook
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(data.url, {
        method: 'POST',
        headers,
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const duration = Date.now() - startTime;
      const responseBody = await response.text();

      await job.updateProgress(100);

      if (response.ok) {
        console.log(`✅ Webhook delivered in ${duration}ms (${response.status})`);
        return {
          success: true,
          statusCode: response.status,
          responseBody: responseBody.slice(0, 1000), // Limit response size
          duration,
        };
      } else {
        console.log(`⚠️ Webhook returned ${response.status}`);
        return {
          success: false,
          statusCode: response.status,
          responseBody: responseBody.slice(0, 1000),
          duration,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (fetchError) {
      clearTimeout(timeout);
      throw fetchError;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`❌ Webhook failed:`, errorMessage);

    return {
      success: false,
      duration,
      error: errorMessage,
    };
  }
}

// Create the worker
export function createWebhookWorker(concurrency = 10) {
  const worker = new Worker<WebhookJobData, WebhookJobResult>(
    WEBHOOK_QUEUE_NAME,
    processWebhookJob,
    {
      connection,
      concurrency,
      limiter: {
        max: 50,
        duration: 1000,
      },
    }
  );

  worker.on('completed', (job, result) => {
    if (result.success) {
      console.log(`🔔 Webhook ${job.id} delivered (${result.statusCode})`);
    } else {
      console.log(`🔔 Webhook ${job.id} failed: ${result.error}`);
    }
  });

  worker.on('failed', (job, error) => {
    console.error(`🔔 Webhook job ${job?.id} failed permanently:`, error.message);
  });

  console.log(`🔔 Webhook worker started (concurrency: ${concurrency})`);

  return worker;
}

export const webhookWorker = createWebhookWorker();
