// =============================================================================
// AUTOMATION WORKER - Processes scheduled jobs and workflows
// =============================================================================

import { Worker, Job } from 'bullmq';
import { connection } from '../connection';
import { AUTOMATION_QUEUE_NAME } from '../queues/automation.queue';
import type { AutomationJobData, AutomationJobResult } from '../types';

// Workflow type handlers
type WorkflowHandler = (
  data: AutomationJobData
) => Promise<{ success: boolean; output?: Record<string, unknown>; error?: string }>;

const workflowHandlers: Record<string, WorkflowHandler> = {
  // Lead qualification workflow
  'lead-qualification': async (data) => {
    console.log(`🎯 Running lead qualification for org: ${data.organizationId}`);
    // This will be implemented to call the lead scoring API
    return { success: true, output: { leadsProcessed: 0 } };
  },

  // Follow-up reminder workflow
  'follow-up-reminder': async (data) => {
    console.log(`📞 Processing follow-up reminders for org: ${data.organizationId}`);
    return { success: true, output: { remindersCreated: 0 } };
  },

  // Report generation workflow
  'report-generation': async (data) => {
    console.log(`📊 Generating report for org: ${data.organizationId}`);
    return { success: true, output: { reportUrl: '' } };
  },

  // HubSpot sync workflow
  'hubspot-sync': async (data) => {
    console.log(`🔄 Syncing with HubSpot for org: ${data.organizationId}`);
    return { success: true, output: { synced: 0 } };
  },

  // Data backup workflow
  'data-backup': async (data) => {
    console.log(`💾 Running data backup for org: ${data.organizationId}`);
    return { success: true, output: { backupSize: 0 } };
  },

  // Invoice processing workflow
  'invoice-processing': async (data) => {
    console.log(`💰 Processing invoices for org: ${data.organizationId}`);
    return { success: true, output: { invoicesProcessed: 0 } };
  },

  // Generic/custom workflow
  'custom': async (data) => {
    console.log(`⚙️ Running custom workflow: ${data.workflowName}`);
    return { success: true, output: data.payload };
  },
};

// Process automation job
async function processAutomationJob(
  job: Job<AutomationJobData, AutomationJobResult>
): Promise<AutomationJobResult> {
  const startTime = Date.now();
  const { data } = job;

  console.log(`\n🚀 Processing automation job: ${job.id}`);
  console.log(`   Workflow: ${data.workflowName} (${data.workflowType})`);
  console.log(`   Triggered by: ${data.triggeredBy}`);

  try {
    // Update progress
    await job.updateProgress(10);

    // Find the appropriate handler
    const handler = workflowHandlers[data.workflowType] || workflowHandlers['custom'];

    // Execute the workflow
    await job.updateProgress(30);
    const result = await handler(data);
    await job.updateProgress(90);

    const duration = Date.now() - startTime;

    console.log(`✅ Job ${job.id} completed in ${duration}ms`);

    return {
      success: result.success,
      duration,
      output: result.output,
      error: result.error,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`❌ Job ${job.id} failed:`, errorMessage);

    return {
      success: false,
      duration,
      error: errorMessage,
    };
  }
}

// Create the worker
export function createAutomationWorker(concurrency = 5) {
  const worker = new Worker<AutomationJobData, AutomationJobResult>(
    AUTOMATION_QUEUE_NAME,
    processAutomationJob,
    {
      connection,
      concurrency,
      limiter: {
        max: 10,
        duration: 1000, // Max 10 jobs per second
      },
    }
  );

  // Event handlers
  worker.on('completed', (job, result) => {
    console.log(`📦 Job ${job.id} completed:`, result.success ? 'SUCCESS' : 'FAILED');
  });

  worker.on('failed', (job, error) => {
    console.error(`💥 Job ${job?.id} failed with error:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('Worker error:', error);
  });

  worker.on('stalled', (jobId) => {
    console.warn(`⚠️ Job ${jobId} has stalled`);
  });

  console.log(`🔧 Automation worker started (concurrency: ${concurrency})`);

  return worker;
}

// Export for standalone running
export const automationWorker = createAutomationWorker();
