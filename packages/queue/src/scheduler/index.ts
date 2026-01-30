// =============================================================================
// SCHEDULER SERVICE - Manages cron jobs and scheduled tasks
// =============================================================================

import { CronJob } from 'cron';
import { closeConnections } from '../connection';
import { addAutomationJob, scheduleAutomationJob, removeScheduledJob } from '../queues/automation.queue';
import { scheduleDailyReport, scheduleWeeklyReport } from '../queues/report.queue';
import { schedulePeriodicSync } from '../queues/sync.queue';
import type { AutomationJobData } from '../types';

// Re-export scheduler functions
export { scheduleAutomationJob, removeScheduledJob } from '../queues/automation.queue';
export { scheduleDailyReport, scheduleWeeklyReport } from '../queues/report.queue';
export { schedulePeriodicSync } from '../queues/sync.queue';

// Job registry for local cron jobs
interface RegisteredJob {
  id: string;
  name: string;
  cronPattern: string;
  job: CronJob;
  lastRun?: Date;
  nextRun?: Date;
}

class SchedulerService {
  private jobs: Map<string, RegisteredJob> = new Map();
  private isRunning = false;

  constructor() {
    this.setupBuiltInJobs();
  }

  // Setup built-in system jobs
  private setupBuiltInJobs() {
    // Health check - runs every 5 minutes
    this.registerJob({
      id: 'system:health-check',
      name: 'System Health Check',
      cronPattern: '*/5 * * * *',
      handler: async () => {
        console.log('💓 Health check running...');
        // In production, this would check DB, Redis, external services
      },
    });

    // Cleanup old jobs - runs daily at 3 AM
    this.registerJob({
      id: 'system:cleanup',
      name: 'Old Jobs Cleanup',
      cronPattern: '0 3 * * *',
      handler: async () => {
        console.log('🧹 Running cleanup job...');
        // Clean up old completed/failed jobs from queues
      },
    });

    // Lead scoring update - runs every hour
    this.registerJob({
      id: 'business:lead-scoring',
      name: 'Lead Scoring Update',
      cronPattern: '0 * * * *',
      handler: async () => {
        console.log('🎯 Running lead scoring update...');
        await addAutomationJob('lead-scoring', {
          workflowId: 'system:lead-scoring',
          workflowName: 'Lead Scoring',
          workflowType: 'lead-qualification',
          organizationId: 'system',
          triggeredBy: 'cron',
          triggeredAt: new Date(),
        });
      },
    });
  }

  // Register a new cron job
  registerJob(config: {
    id: string;
    name: string;
    cronPattern: string;
    timezone?: string;
    handler: () => Promise<void>;
  }) {
    const { id, name, cronPattern, timezone = 'Europe/Berlin', handler } = config;

    // Remove existing job if present
    if (this.jobs.has(id)) {
      this.unregisterJob(id);
    }

    const cronJob = new CronJob(
      cronPattern,
      async () => {
        const registered = this.jobs.get(id);
        if (registered) {
          registered.lastRun = new Date();
          registered.nextRun = cronJob.nextDate().toJSDate();
        }

        try {
          await handler();
          console.log(`✅ Job ${name} completed`);
        } catch (error) {
          console.error(`❌ Job ${name} failed:`, error);
        }
      },
      null,
      false, // Don't start automatically
      timezone
    );

    this.jobs.set(id, {
      id,
      name,
      cronPattern,
      job: cronJob,
      nextRun: cronJob.nextDate().toJSDate(),
    });

    if (this.isRunning) {
      cronJob.start();
    }

    console.log(`📅 Registered job: ${name} (${cronPattern})`);
  }

  // Unregister a job
  unregisterJob(id: string) {
    const registered = this.jobs.get(id);
    if (registered) {
      registered.job.stop();
      this.jobs.delete(id);
      console.log(`🗑️ Unregistered job: ${registered.name}`);
    }
  }

  // Start the scheduler
  start() {
    if (this.isRunning) {
      console.log('⚠️ Scheduler is already running');
      return;
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║        NEXUS COMMAND CENTER - SCHEDULER SERVICE            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Start all registered jobs
    for (const [id, registered] of this.jobs) {
      registered.job.start();
      console.log(`▶ Started: ${registered.name}`);
    }

    this.isRunning = true;
    console.log(`\n✅ Scheduler started with ${this.jobs.size} jobs`);
    console.log('   Press Ctrl+C to stop\n');
  }

  // Stop the scheduler
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('\n🛑 Stopping scheduler...');

    for (const [id, registered] of this.jobs) {
      registered.job.stop();
    }

    this.isRunning = false;
    console.log('✅ Scheduler stopped');
  }

  // Get all registered jobs
  getJobs(): Array<Omit<RegisteredJob, 'job'>> {
    return Array.from(this.jobs.values()).map(({ job, ...rest }) => rest);
  }

  // Get job status
  getJobStatus(id: string) {
    const registered = this.jobs.get(id);
    if (!registered) return null;

    return {
      id: registered.id,
      name: registered.name,
      cronPattern: registered.cronPattern,
      lastRun: registered.lastRun,
      nextRun: registered.nextRun,
      isRunning: registered.job.running,
    };
  }

  // Manually trigger a job
  async triggerJob(id: string) {
    const registered = this.jobs.get(id);
    if (!registered) {
      throw new Error(`Job not found: ${id}`);
    }

    console.log(`🔄 Manually triggering: ${registered.name}`);
    registered.job.fireOnTick();
  }
}

// Singleton instance
export const scheduler = new SchedulerService();

// Graceful shutdown
async function shutdown() {
  console.log('\n🛑 Shutting down scheduler...');
  scheduler.stop();
  await closeConnections();
  console.log('👋 Scheduler stopped. Goodbye!\n');
  process.exit(0);
}

// Main execution when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scheduler.start();

  // Handle shutdown signals
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    shutdown();
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
  });
}
