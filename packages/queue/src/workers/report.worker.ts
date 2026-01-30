// =============================================================================
// REPORT WORKER - Processes report generation jobs
// =============================================================================

import { Worker, Job } from 'bullmq';
import { connection } from '../connection';
import { REPORT_QUEUE_NAME } from '../queues/report.queue';
import type { ReportJobData, ReportJobResult, ReportType } from '../types';

// Report generators by type
type ReportGenerator = (data: ReportJobData) => Promise<{
  content: string | Buffer;
  filename: string;
  mimeType: string;
}>;

const reportGenerators: Record<ReportType, ReportGenerator> = {
  daily_summary: async (data) => {
    console.log(`📊 Generating daily summary report`);
    // In production, this would query the database and generate actual reports
    const content = `
      DAILY SUMMARY REPORT
      ====================
      Date: ${new Date().toLocaleDateString('de-DE')}
      Organization: ${data.organizationId}

      Key Metrics:
      - New Leads: 15
      - Deals Won: 3
      - Revenue: €45,000
      - Tasks Completed: 28
    `;
    return {
      content,
      filename: `daily-summary-${new Date().toISOString().split('T')[0]}.txt`,
      mimeType: 'text/plain',
    };
  },

  weekly_sales: async (data) => {
    console.log(`📊 Generating weekly sales report`);
    const content = `
      WEEKLY SALES REPORT
      ===================
      Period: ${data.dateRange.start.toLocaleDateString('de-DE')} - ${data.dateRange.end.toLocaleDateString('de-DE')}

      Sales Performance:
      - Total Revenue: €125,000
      - Deals Closed: 8
      - Average Deal Size: €15,625
      - Win Rate: 45%
    `;
    return {
      content,
      filename: `weekly-sales-${new Date().toISOString().split('T')[0]}.txt`,
      mimeType: 'text/plain',
    };
  },

  monthly_overview: async (data) => {
    console.log(`📊 Generating monthly overview report`);
    const content = `
      MONTHLY OVERVIEW
      ================
      Month: ${new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}

      Summary:
      - Total Revenue: €480,000
      - New Customers: 12
      - Projects Completed: 4
      - Customer Satisfaction: 4.8/5
    `;
    return {
      content,
      filename: `monthly-overview-${new Date().toISOString().slice(0, 7)}.txt`,
      mimeType: 'text/plain',
    };
  },

  custom: async (data) => {
    console.log(`📊 Generating custom report`);
    const content = JSON.stringify(data.filters || {}, null, 2);
    return {
      content,
      filename: `custom-report-${Date.now()}.json`,
      mimeType: 'application/json',
    };
  },
};

// Process report job
async function processReportJob(
  job: Job<ReportJobData, ReportJobResult>
): Promise<ReportJobResult> {
  const { data } = job;

  console.log(`\n📊 Processing report job: ${job.id}`);
  console.log(`   Type: ${data.reportType}`);
  console.log(`   Format: ${data.format}`);
  console.log(`   Recipients: ${data.recipients?.join(', ') || 'None'}`);

  try {
    await job.updateProgress(10);

    // Generate report
    const generator = reportGenerators[data.reportType];
    if (!generator) {
      throw new Error(`Unknown report type: ${data.reportType}`);
    }

    await job.updateProgress(30);
    const { content, filename, mimeType } = await generator(data);
    await job.updateProgress(60);

    // In production, save to storage (S3, Supabase, etc.)
    let reportUrl = '';
    if (data.saveToStorage) {
      // Simulate storage upload
      await new Promise((resolve) => setTimeout(resolve, 200));
      reportUrl = `https://storage.example.com/reports/${filename}`;
      console.log(`   Saved to: ${reportUrl}`);
    }

    await job.updateProgress(80);

    // Send to recipients
    const sentTo: string[] = [];
    if (data.recipients && data.recipients.length > 0) {
      // In production, queue email jobs
      for (const recipient of data.recipients) {
        console.log(`   Sending to: ${recipient}`);
        sentTo.push(recipient);
      }
    }

    await job.updateProgress(100);

    console.log(`✅ Report generated successfully`);

    return {
      success: true,
      reportUrl: reportUrl || undefined,
      sentTo: sentTo.length > 0 ? sentTo : undefined,
      size: typeof content === 'string' ? content.length : content.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Report generation failed:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Create the worker
export function createReportWorker(concurrency = 2) {
  const worker = new Worker<ReportJobData, ReportJobResult>(
    REPORT_QUEUE_NAME,
    processReportJob,
    {
      connection,
      concurrency,
      // Reports can take longer, so we set a higher timeout
      lockDuration: 5 * 60 * 1000, // 5 minutes
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`📊 Report job ${job.id} completed: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`📊 Report job ${job?.id} failed:`, error.message);
  });

  console.log(`📊 Report worker started (concurrency: ${concurrency})`);

  return worker;
}

export const reportWorker = createReportWorker();
