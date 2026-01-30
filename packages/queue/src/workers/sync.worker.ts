// =============================================================================
// SYNC WORKER - Processes CRM synchronization jobs
// =============================================================================

import { Worker, Job } from 'bullmq';
import { connection } from '../connection';
import { SYNC_QUEUE_NAME } from '../queues/sync.queue';
import type { SyncJobData, SyncJobResult } from '../types';

// Sync handlers by provider
type SyncHandler = (data: SyncJobData) => Promise<Omit<SyncJobResult, 'duration'>>;

const syncHandlers: Record<string, SyncHandler> = {
  hubspot: async (data) => {
    console.log(`🔄 HubSpot sync: ${data.entity} (${data.direction})`);

    // Simulate sync operation
    // In production, this would call the HubSpot API
    await new Promise((resolve) => setTimeout(resolve, 500));

    const results = {
      contacts: { created: 5, updated: 12, deleted: 0, failed: 0 },
      deals: { created: 2, updated: 8, deleted: 0, failed: 1 },
      companies: { created: 1, updated: 3, deleted: 0, failed: 0 },
      all: { created: 8, updated: 23, deleted: 0, failed: 1 },
    };

    const result = results[data.entity] || results.all;

    return {
      success: result.failed === 0,
      provider: 'hubspot',
      entity: data.entity,
      ...result,
      errors: result.failed > 0 ? [{ id: 'deal-123', error: 'Invalid amount format' }] : undefined,
    };
  },

  stripe: async (data) => {
    console.log(`💳 Stripe sync: ${data.entity}`);
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      provider: 'stripe',
      entity: data.entity,
      created: 0,
      updated: 5,
      deleted: 0,
      failed: 0,
    };
  },

  whatsapp: async (data) => {
    console.log(`💬 WhatsApp sync: ${data.entity}`);
    await new Promise((resolve) => setTimeout(resolve, 200));

    return {
      success: true,
      provider: 'whatsapp',
      entity: data.entity,
      created: 15,
      updated: 0,
      deleted: 0,
      failed: 0,
    };
  },
};

// Process sync job
async function processSyncJob(
  job: Job<SyncJobData, SyncJobResult>
): Promise<SyncJobResult> {
  const startTime = Date.now();
  const { data } = job;

  console.log(`\n🔄 Processing sync job: ${job.id}`);
  console.log(`   Provider: ${data.provider}`);
  console.log(`   Entity: ${data.entity}`);
  console.log(`   Direction: ${data.direction}`);
  console.log(`   Full sync: ${data.fullSync ? 'Yes' : 'No'}`);

  try {
    await job.updateProgress(10);

    const handler = syncHandlers[data.provider];
    if (!handler) {
      throw new Error(`Unknown sync provider: ${data.provider}`);
    }

    await job.updateProgress(30);
    const result = await handler(data);
    await job.updateProgress(90);

    const duration = Date.now() - startTime;

    console.log(`✅ Sync completed in ${duration}ms`);
    console.log(`   Created: ${result.created}, Updated: ${result.updated}, Failed: ${result.failed}`);

    return {
      ...result,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`❌ Sync failed:`, errorMessage);

    return {
      success: false,
      provider: data.provider,
      entity: data.entity,
      created: 0,
      updated: 0,
      deleted: 0,
      failed: 1,
      errors: [{ id: 'sync', error: errorMessage }],
      duration,
    };
  }
}

// Create the worker
export function createSyncWorker(concurrency = 3) {
  const worker = new Worker<SyncJobData, SyncJobResult>(
    SYNC_QUEUE_NAME,
    processSyncJob,
    {
      connection,
      concurrency,
      limiter: {
        max: 5,
        duration: 1000,
      },
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`🔄 Sync job ${job.id} completed: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`🔄 Sync job ${job?.id} failed:`, error.message);
  });

  console.log(`🔄 Sync worker started (concurrency: ${concurrency})`);

  return worker;
}

export const syncWorker = createSyncWorker();
