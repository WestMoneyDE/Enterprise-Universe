// =============================================================================
// SYNC QUEUE - CRM and external service synchronization
// =============================================================================

import { Queue, QueueEvents } from 'bullmq';
import { connection } from '../connection';
import type { SyncJobData, SyncJobResult, SyncEntity } from '../types';

export const SYNC_QUEUE_NAME = 'sync';

// Create the sync queue
export const syncQueue = new Queue<SyncJobData, SyncJobResult>(
  SYNC_QUEUE_NAME,
  {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'fixed',
        delay: 30000, // 30 seconds between retries
      },
      removeOnComplete: {
        count: 500,
        age: 24 * 60 * 60,
      },
      removeOnFail: {
        count: 1000,
        age: 7 * 24 * 60 * 60,
      },
    },
  }
);

// Queue events
export const syncQueueEvents = new QueueEvents(SYNC_QUEUE_NAME, {
  connection,
});

// Helper functions
export async function syncHubSpot(
  organizationId: string,
  entity: SyncEntity = 'all',
  fullSync = false
) {
  return syncQueue.add('hubspot-sync', {
    organizationId,
    provider: 'hubspot',
    direction: 'bidirectional',
    entity,
    fullSync,
    triggeredBy: 'manual',
    triggeredAt: new Date(),
  });
}

export async function syncContacts(
  organizationId: string,
  contactIds?: string[]
) {
  return syncQueue.add('contacts-sync', {
    organizationId,
    provider: 'hubspot',
    direction: 'push',
    entity: 'contacts',
    entityIds: contactIds,
    triggeredBy: 'event',
    triggeredAt: new Date(),
  });
}

export async function syncDeals(
  organizationId: string,
  dealIds?: string[]
) {
  return syncQueue.add('deals-sync', {
    organizationId,
    provider: 'hubspot',
    direction: 'bidirectional',
    entity: 'deals',
    entityIds: dealIds,
    triggeredBy: 'event',
    triggeredAt: new Date(),
  });
}

export async function schedulePeriodicSync(
  organizationId: string,
  cronPattern: string = '0 */6 * * *' // Every 6 hours
) {
  return syncQueue.upsertJobScheduler(
    `periodic-sync:${organizationId}`,
    { pattern: cronPattern },
    {
      name: 'periodic-hubspot-sync',
      data: {
        organizationId,
        provider: 'hubspot',
        direction: 'bidirectional',
        entity: 'all',
        fullSync: false,
        triggeredBy: 'cron',
        triggeredAt: new Date(),
      },
    }
  );
}

export async function getSyncJobCounts() {
  return syncQueue.getJobCounts(
    'waiting',
    'active',
    'completed',
    'failed',
    'delayed'
  );
}

export async function getLastSyncResult(organizationId: string) {
  const jobs = await syncQueue.getCompleted(0, 10);
  return jobs.find(
    (job) => job.data.organizationId === organizationId
  );
}
