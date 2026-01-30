// =============================================================================
// EMAIL WORKER - Processes email sending jobs
// =============================================================================

import { Worker, Job } from 'bullmq';
import { connection } from '../connection';
import { EMAIL_QUEUE_NAME } from '../queues/email.queue';
import type { EmailJobData, EmailJobResult } from '../types';

// Email provider interface
interface EmailProvider {
  send(options: {
    to: string | string[];
    from: string;
    subject: string;
    html: string;
    replyTo?: string;
  }): Promise<{ messageId: string }>;
}

// Simple template renderer
function renderTemplate(template: string, data: Record<string, unknown>): string {
  let html = template;
  for (const [key, value] of Object.entries(data)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
  }
  return html;
}

// Default templates
const templates: Record<string, string> = {
  welcome: `
    <h1>Willkommen bei West Money Bau, {{name}}!</h1>
    <p>Wir freuen uns, Sie als neuen Kunden begrüßen zu dürfen.</p>
  `,
  'follow-up': `
    <h1>Hallo {{name}},</h1>
    <p>Wir wollten uns nach unserem Gespräch bei Ihnen melden.</p>
    <p>{{message}}</p>
  `,
  notification: `
    <h1>{{title}}</h1>
    <p>{{message}}</p>
  `,
  report: `
    <h1>{{reportTitle}}</h1>
    <p>Ihr {{reportType}} Report ist bereit.</p>
    <p><a href="{{reportUrl}}">Report herunterladen</a></p>
  `,
};

// Process email job
async function processEmailJob(
  job: Job<EmailJobData, EmailJobResult>
): Promise<EmailJobResult> {
  const { data } = job;

  console.log(`📧 Processing email job: ${job.id}`);
  console.log(`   To: ${Array.isArray(data.to) ? data.to.join(', ') : data.to}`);
  console.log(`   Subject: ${data.subject}`);

  try {
    await job.updateProgress(10);

    // Get template
    const template = templates[data.template] || data.template;
    const html = renderTemplate(template, data.templateData);

    await job.updateProgress(30);

    // In production, this would use AWS SES or Resend
    // For now, we'll simulate the send
    const useProvider = process.env.EMAIL_PROVIDER || 'mock';

    if (useProvider === 'mock') {
      // Simulate sending
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log(`   ✅ Email simulated (mock mode)`);

      return {
        success: true,
        messageId: `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        provider: 'ses',
      };
    }

    // Real provider implementation would go here
    // const result = await sesClient.sendEmail({...});

    await job.updateProgress(100);

    return {
      success: true,
      messageId: `${Date.now()}`,
      provider: 'ses',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`   ❌ Email failed:`, errorMessage);

    return {
      success: false,
      provider: 'ses',
      error: errorMessage,
    };
  }
}

// Create the worker
export function createEmailWorker(concurrency = 10) {
  const worker = new Worker<EmailJobData, EmailJobResult>(
    EMAIL_QUEUE_NAME,
    processEmailJob,
    {
      connection,
      concurrency,
      limiter: {
        max: 14, // AWS SES default rate limit
        duration: 1000,
      },
    }
  );

  worker.on('completed', (job, result) => {
    if (result.success) {
      console.log(`📬 Email sent: ${result.messageId}`);
    }
  });

  worker.on('failed', (job, error) => {
    console.error(`📭 Email job ${job?.id} failed:`, error.message);
  });

  console.log(`📮 Email worker started (concurrency: ${concurrency})`);

  return worker;
}

export const emailWorker = createEmailWorker();
