// =============================================================================
// WORKERS - Main entry point for running all workers
// =============================================================================

import { closeConnections } from '../connection';
import { createAutomationWorker } from './automation.worker';
import { createEmailWorker } from './email.worker';
import { createSyncWorker } from './sync.worker';
import { createWebhookWorker } from './webhook.worker';
import { createReportWorker } from './report.worker';

// Export individual workers
export { createAutomationWorker } from './automation.worker';
export { createEmailWorker } from './email.worker';
export { createSyncWorker } from './sync.worker';
export { createWebhookWorker } from './webhook.worker';
export { createReportWorker } from './report.worker';

// Worker configuration
interface WorkerConfig {
  automation: { enabled: boolean; concurrency: number };
  email: { enabled: boolean; concurrency: number };
  sync: { enabled: boolean; concurrency: number };
  webhook: { enabled: boolean; concurrency: number };
  report: { enabled: boolean; concurrency: number };
}

const defaultConfig: WorkerConfig = {
  automation: { enabled: true, concurrency: 5 },
  email: { enabled: true, concurrency: 10 },
  sync: { enabled: true, concurrency: 3 },
  webhook: { enabled: true, concurrency: 10 },
  report: { enabled: true, concurrency: 2 },
};

// Start all workers
export function startAllWorkers(config: Partial<WorkerConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };
  const workers = [];

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        NEXUS COMMAND CENTER - WORKER MANAGER               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (finalConfig.automation.enabled) {
    workers.push(createAutomationWorker(finalConfig.automation.concurrency));
  }

  if (finalConfig.email.enabled) {
    workers.push(createEmailWorker(finalConfig.email.concurrency));
  }

  if (finalConfig.sync.enabled) {
    workers.push(createSyncWorker(finalConfig.sync.concurrency));
  }

  if (finalConfig.webhook.enabled) {
    workers.push(createWebhookWorker(finalConfig.webhook.concurrency));
  }

  if (finalConfig.report.enabled) {
    workers.push(createReportWorker(finalConfig.report.concurrency));
  }

  console.log(`\n✅ Started ${workers.length} workers`);
  console.log('   Press Ctrl+C to stop\n');

  return workers;
}

// Graceful shutdown
async function shutdown(workers: Awaited<ReturnType<typeof startAllWorkers>>) {
  console.log('\n🛑 Shutting down workers...');

  // Close all workers
  await Promise.all(workers.map((worker) => worker.close()));

  // Close Redis connections
  await closeConnections();

  console.log('👋 Workers stopped. Goodbye!\n');
  process.exit(0);
}

// Main execution when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const workers = startAllWorkers();

  // Handle shutdown signals
  process.on('SIGINT', () => shutdown(workers));
  process.on('SIGTERM', () => shutdown(workers));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    shutdown(workers);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
  });
}
