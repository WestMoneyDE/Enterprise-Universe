/**
 * EMAIL QUEUE SERVICE
 * Rate-limited email sending with retry logic
 *
 * Prevents SMTP rate limiting (451 4.7.1 Too many mails)
 * Max 10 emails per minute with exponential backoff retry
 *
 * Enterprise Universe - West Money Bau GmbH
 */

const nodemailer = require('nodemailer');

// Queue configuration
const CONFIG = {
    MAX_EMAILS_PER_MINUTE: 10,
    SEND_INTERVAL_MS: 6000, // 6 seconds between emails = 10/minute
    MAX_RETRIES: 3,
    INITIAL_RETRY_DELAY_MS: 60000, // 1 minute
    MAX_QUEUE_SIZE: 1000
};

// Email queue
const emailQueue = [];
let isProcessing = false;
let processedCount = 0;
let failedCount = 0;

// SMTP Transporter
let transporter = null;

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            pool: true, // Use pooled connections
            maxConnections: 3, // Limit concurrent connections
            maxMessages: 10, // Messages per connection
            rateDelta: 6000, // 6 seconds between sends
            rateLimit: 1 // 1 email per rateDelta
        });

        console.log('[EmailQueue] SMTP transporter initialized with rate limiting');
    }
    return transporter;
}

/**
 * Queue an email for sending
 * @param {Object} emailOptions - { to, subject, html, text, from, replyTo }
 * @param {Object} metadata - { invoiceId, dealId, type }
 * @returns {Object} Queue entry with status
 */
function queueEmail(emailOptions, metadata = {}) {
    if (emailQueue.length >= CONFIG.MAX_QUEUE_SIZE) {
        console.warn('[EmailQueue] Queue full, rejecting email');
        return { success: false, reason: 'queue_full' };
    }

    const entry = {
        id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        options: {
            from: emailOptions.from || process.env.SMTP_FROM || 'noreply@enterprise-universe.one',
            ...emailOptions
        },
        metadata,
        status: 'queued',
        attempts: 0,
        createdAt: new Date().toISOString(),
        scheduledFor: null,
        lastError: null
    };

    emailQueue.push(entry);
    console.log(`[EmailQueue] Email queued: ${entry.id} to ${emailOptions.to} (Queue size: ${emailQueue.length})`);

    // Start processing if not already running
    if (!isProcessing) {
        startProcessing();
    }

    return { success: true, id: entry.id, position: emailQueue.length };
}

/**
 * Start the queue processor
 */
function startProcessing() {
    if (isProcessing) return;
    isProcessing = true;
    console.log('[EmailQueue] Starting queue processor');
    processQueue();
}

/**
 * Process the email queue
 */
async function processQueue() {
    while (emailQueue.length > 0) {
        const entry = getNextEmail();
        if (!entry) {
            // All emails are scheduled for later retry
            await sleep(10000);
            continue;
        }

        try {
            await sendEmail(entry);
            entry.status = 'sent';
            entry.sentAt = new Date().toISOString();
            processedCount++;
            console.log(`[EmailQueue] \u2705 Sent: ${entry.id} to ${entry.options.to}`);

            // Remove from queue
            const idx = emailQueue.indexOf(entry);
            if (idx > -1) emailQueue.splice(idx, 1);

        } catch (error) {
            entry.attempts++;
            entry.lastError = error.message;

            // Check if it's a rate limit error
            if (error.message.includes('451') || error.message.includes('Too many')) {
                console.warn(`[EmailQueue] Rate limited, will retry: ${entry.id}`);
                entry.status = 'rate_limited';
                entry.scheduledFor = new Date(Date.now() + CONFIG.INITIAL_RETRY_DELAY_MS * entry.attempts).toISOString();
            } else if (entry.attempts >= CONFIG.MAX_RETRIES) {
                entry.status = 'failed';
                failedCount++;
                console.error(`[EmailQueue] \u274C Failed after ${CONFIG.MAX_RETRIES} attempts: ${entry.id} - ${error.message}`);

                // Remove from queue after max retries
                const idx = emailQueue.indexOf(entry);
                if (idx > -1) emailQueue.splice(idx, 1);
            } else {
                entry.status = 'retry';
                entry.scheduledFor = new Date(Date.now() + CONFIG.INITIAL_RETRY_DELAY_MS * Math.pow(2, entry.attempts - 1)).toISOString();
                console.warn(`[EmailQueue] Will retry (${entry.attempts}/${CONFIG.MAX_RETRIES}): ${entry.id}`);
            }
        }

        // Wait before processing next email
        await sleep(CONFIG.SEND_INTERVAL_MS);
    }

    isProcessing = false;
    console.log('[EmailQueue] Queue empty, processor stopped');
}

/**
 * Get next email to process (skip scheduled retries that aren't due yet)
 */
function getNextEmail() {
    const now = new Date();

    // First, try to find a queued email (never attempted)
    for (const entry of emailQueue) {
        if (entry.status === 'queued') {
            entry.status = 'processing';
            return entry;
        }
    }

    // Then, check retry emails that are due
    for (const entry of emailQueue) {
        if ((entry.status === 'retry' || entry.status === 'rate_limited') && entry.scheduledFor) {
            if (new Date(entry.scheduledFor) <= now) {
                entry.status = 'processing';
                return entry;
            }
        }
    }

    return null;
}

/**
 * Actually send the email
 */
async function sendEmail(entry) {
    const transport = getTransporter();

    const result = await transport.sendMail({
        from: entry.options.from,
        to: entry.options.to,
        subject: entry.options.subject,
        html: entry.options.html,
        text: entry.options.text,
        replyTo: entry.options.replyTo
    });

    return result;
}

/**
 * Get queue status
 */
function getQueueStatus() {
    return {
        queueSize: emailQueue.length,
        isProcessing,
        processedCount,
        failedCount,
        config: CONFIG,
        queue: emailQueue.map(e => ({
            id: e.id,
            to: e.options.to,
            subject: e.options.subject?.substring(0, 50),
            status: e.status,
            attempts: e.attempts,
            createdAt: e.createdAt,
            scheduledFor: e.scheduledFor
        }))
    };
}

/**
 * Clear failed emails from tracking
 */
function clearFailed() {
    failedCount = 0;
    return { success: true };
}

/**
 * Utility: sleep
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Export functions
module.exports = {
    queueEmail,
    getQueueStatus,
    clearFailed,
    CONFIG
};

console.log('[EmailQueue] Service loaded - Rate limit: ' + CONFIG.MAX_EMAILS_PER_MINUTE + '/min');
