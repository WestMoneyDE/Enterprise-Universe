// =============================================================================
// EMAIL QUEUE - Email sending with rate limiting and retries
// =============================================================================

import { Queue, QueueEvents } from 'bullmq';
import { connection } from '../connection';
import type { EmailJobData, EmailJobResult } from '../types';

export const EMAIL_QUEUE_NAME = 'email';

// Create the email queue with rate limiting
export const emailQueue = new Queue<EmailJobData, EmailJobResult>(
  EMAIL_QUEUE_NAME,
  {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: {
        count: 5000,
        age: 7 * 24 * 60 * 60, // 7 days
      },
      removeOnFail: {
        count: 10000,
        age: 30 * 24 * 60 * 60, // 30 days
      },
    },
  }
);

// Queue events
export const emailQueueEvents = new QueueEvents(EMAIL_QUEUE_NAME, {
  connection,
});

// Email types for different priorities
export type EmailPriority = 'high' | 'normal' | 'low' | 'bulk';

const priorityMap: Record<EmailPriority, number> = {
  high: 1,
  normal: 5,
  low: 10,
  bulk: 20,
};

// Helper functions
export async function sendEmail(
  data: EmailJobData,
  priority: EmailPriority = 'normal'
) {
  return emailQueue.add('send', data, {
    priority: priorityMap[priority],
  });
}

export async function sendBulkEmails(
  emails: Array<Omit<EmailJobData, 'organizationId' | 'triggeredBy' | 'triggeredAt'>>,
  baseData: Pick<EmailJobData, 'organizationId' | 'triggeredBy'>
) {
  const jobs = emails.map((email, index) => ({
    name: 'send',
    data: {
      ...email,
      ...baseData,
      triggeredAt: new Date(),
    } as EmailJobData,
    opts: {
      priority: priorityMap.bulk,
      delay: index * 100, // Stagger to avoid rate limits
    },
  }));

  return emailQueue.addBulk(jobs);
}

export async function getEmailJobCounts() {
  return emailQueue.getJobCounts(
    'waiting',
    'active',
    'completed',
    'failed',
    'delayed'
  );
}

export async function retryFailedEmails() {
  const failed = await emailQueue.getFailed();
  for (const job of failed) {
    await job.retry();
  }
  return failed.length;
}
