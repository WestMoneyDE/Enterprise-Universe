/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BOUNCE HANDLER DAEMON
 * Monitors postmaster emails, detects bounces, retries with alternative senders
 * ═══════════════════════════════════════════════════════════════════════════
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Configuration
const DATA_DIR = path.join(__dirname, '../../data/bounce-handling');
const LOG_FILE = path.join(DATA_DIR, 'bounce-log.json');
const INVOICING_LOG = path.join(__dirname, '../../data/invoicing/invoicing-log.json');

// Alternative sender accounts (rotated on bounce)
const SENDERS = [
    { email: 'invoice@enterprise-universe.com', name: 'Enterprise Universe Buchhaltung' },
    { email: 'info@enterprise-universe.com', name: 'Enterprise Universe' },
    { email: 'projects@enterprise-universe.one', name: 'Enterprise Universe Projects' }
];

// IMAP configuration
const IMAP_CONFIG = {
    user: process.env.SMTP_USER || 'invoice@enterprise-universe.com',
    password: process.env.SMTP_PASS,
    host: process.env.IMAP_HOST || 'imap.one.com',
    port: parseInt(process.env.IMAP_PORT) || 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
};

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGGING & STATE
// ═══════════════════════════════════════════════════════════════════════════

function loadLog() {
    if (fs.existsSync(LOG_FILE)) {
        return JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
    }
    return {
        processedBounces: [],
        retriedEmails: [],
        failedRetries: [],
        stats: { total: 0, retried: 0, failed: 0, permanent: 0 },
        lastRun: null
    };
}

function saveLog(log) {
    log.lastRun = new Date().toISOString();
    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

function loadInvoicingLog() {
    if (fs.existsSync(INVOICING_LOG)) {
        return JSON.parse(fs.readFileSync(INVOICING_LOG, 'utf-8'));
    }
    return { processedDeals: {}, sentEmails: [] };
}

// ═══════════════════════════════════════════════════════════════════════════
// IMAP FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function connectImap() {
    return new Promise((resolve, reject) => {
        const imap = new Imap(IMAP_CONFIG);

        imap.once('ready', () => resolve(imap));
        imap.once('error', (err) => reject(err));

        imap.connect();
    });
}

function openInbox(imap) {
    return new Promise((resolve, reject) => {
        imap.openBox('INBOX', false, (err, box) => {
            if (err) reject(err);
            else resolve(box);
        });
    });
}

function searchBounces(imap) {
    return new Promise((resolve, reject) => {
        // Search for bounce/postmaster emails from last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const criteria = [
            ['SINCE', yesterday],
            ['OR',
                ['FROM', 'postmaster'],
                ['OR',
                    ['FROM', 'mailer-daemon'],
                    ['OR',
                        ['SUBJECT', 'Undelivered'],
                        ['OR',
                            ['SUBJECT', 'Delivery Status'],
                            ['SUBJECT', 'Mail delivery failed']
                        ]
                    ]
                ]
            ]
        ];

        imap.search(criteria, (err, results) => {
            if (err) reject(err);
            else resolve(results || []);
        });
    });
}

function fetchEmail(imap, uid) {
    return new Promise((resolve, reject) => {
        const fetch = imap.fetch(uid, { bodies: '' });

        fetch.on('message', (msg) => {
            let buffer = '';

            msg.on('body', (stream) => {
                stream.on('data', (chunk) => {
                    buffer += chunk.toString('utf8');
                });
            });

            msg.once('end', async () => {
                try {
                    const parsed = await simpleParser(buffer);
                    resolve(parsed);
                } catch (e) {
                    reject(e);
                }
            });
        });

        fetch.once('error', reject);
        fetch.once('end', () => {});
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// BOUNCE PARSING
// ═══════════════════════════════════════════════════════════════════════════

function extractBouncedEmail(parsed) {
    const text = (parsed.text || '') + ' ' + (parsed.html || '');

    // Common bounce patterns
    const patterns = [
        /(?:failed|rejected|undeliverable).*?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
        /(?:recipient|address).*?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
        /To:\s*<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/i,
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}).*?(?:does not exist|unknown|invalid)/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            // Filter out our own addresses
            const email = match[1].toLowerCase();
            if (!email.includes('enterprise-universe')) {
                return email;
            }
        }
    }

    return null;
}

function isSoftBounce(parsed) {
    const text = ((parsed.text || '') + ' ' + (parsed.subject || '')).toLowerCase();

    const softBounceIndicators = [
        'temporarily', 'try again', 'quota', 'mailbox full',
        'too many', 'rate limit', 'deferred', 'retry'
    ];

    return softBounceIndicators.some(indicator => text.includes(indicator));
}

function isHardBounce(parsed) {
    const text = ((parsed.text || '') + ' ' + (parsed.subject || '')).toLowerCase();

    const hardBounceIndicators = [
        'does not exist', 'unknown user', 'invalid address',
        'no such user', 'user unknown', 'rejected', 'permanent',
        'mailbox not found', 'address rejected'
    ];

    return hardBounceIndicators.some(indicator => text.includes(indicator));
}

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL RETRY WITH ALTERNATIVE SENDER
// ═══════════════════════════════════════════════════════════════════════════

async function retryWithAlternativeSender(bouncedEmail, log, invoicingLog) {
    // Find the original deal/email info
    let originalDeal = null;
    let originalInfo = null;

    for (const [dealId, info] of Object.entries(invoicingLog.processedDeals || {})) {
        if (info.email === bouncedEmail) {
            originalDeal = dealId;
            originalInfo = info;
            break;
        }
    }

    if (!originalDeal || !originalInfo) {
        console.log(`[BounceHandler] No matching deal found for: ${bouncedEmail}`);
        return { success: false, reason: 'no_matching_deal' };
    }

    // Determine which sender was used and pick next one
    const usedSenders = log.retriedEmails
        .filter(r => r.originalEmail === bouncedEmail)
        .map(r => r.senderUsed);

    // Find first unused sender
    let nextSender = null;
    for (const sender of SENDERS) {
        if (!usedSenders.includes(sender.email)) {
            nextSender = sender;
            break;
        }
    }

    if (!nextSender) {
        console.log(`[BounceHandler] All senders exhausted for: ${bouncedEmail}`);
        return { success: false, reason: 'all_senders_exhausted' };
    }

    // Create transporter with alternative sender
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'send.one.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: nextSender.email,
            pass: process.env.SMTP_PASS
        }
    });

    try {
        // Resend the email
        const result = await transporter.sendMail({
            from: `"${nextSender.name}" <${nextSender.email}>`,
            to: bouncedEmail,
            replyTo: 'info@enterprise-universe.com',
            subject: `Enterprise Universe - Projektbestätigung (Erneuter Versand)`,
            text: `Sehr geehrte Damen und Herren,

diese E-Mail wurde erneut versendet, da die vorherige Zustellung fehlgeschlagen ist.

Bitte kontaktieren Sie uns unter info@enterprise-universe.com für Ihre Projektunterlagen.

Rechnungsnummer: ${originalInfo.invoiceNumber || 'N/A'}

Mit freundlichen Grüßen,
Ihr Enterprise Universe Team`,
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#1a365d;padding:20px;text-align:center;">
        <h1 style="color:white;margin:0;">Enterprise Universe</h1>
    </div>
    <div style="padding:20px;background:#f8f9fa;">
        <p>Sehr geehrte Damen und Herren,</p>
        <p>diese E-Mail wurde erneut versendet, da die vorherige Zustellung fehlgeschlagen ist.</p>
        <p>Bitte kontaktieren Sie uns unter <a href="mailto:info@enterprise-universe.com">info@enterprise-universe.com</a> für Ihre Projektunterlagen.</p>
        <div style="background:white;padding:15px;border-radius:8px;margin:20px 0;">
            <p><strong>Rechnungsnummer:</strong> ${originalInfo.invoiceNumber || 'N/A'}</p>
        </div>
        <p>Mit freundlichen Grüßen,<br><strong>Ihr Enterprise Universe Team</strong></p>
    </div>
</body>
</html>`
        });

        console.log(`[BounceHandler] ✓ Retry sent to ${bouncedEmail} via ${nextSender.email}`);
        return {
            success: true,
            messageId: result.messageId,
            senderUsed: nextSender.email
        };

    } catch (error) {
        console.log(`[BounceHandler] ✗ Retry failed for ${bouncedEmail}: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN WORKER
// ═══════════════════════════════════════════════════════════════════════════

async function run() {
    console.log('[BounceHandler] Starting...');

    const log = loadLog();
    const invoicingLog = loadInvoicingLog();
    const results = { processed: 0, retried: 0, failed: 0, permanent: 0 };

    let imap = null;

    try {
        // Connect to IMAP
        imap = await connectImap();
        console.log('[BounceHandler] Connected to IMAP');

        // Open inbox
        await openInbox(imap);

        // Search for bounce emails
        const bounceUids = await searchBounces(imap);
        console.log(`[BounceHandler] Found ${bounceUids.length} potential bounce emails`);

        // Process each bounce (limit to 10 per run)
        const toProcess = bounceUids.slice(0, 10);

        for (const uid of toProcess) {
            try {
                const parsed = await fetchEmail(imap, uid);
                const bouncedEmail = extractBouncedEmail(parsed);

                if (!bouncedEmail) {
                    continue;
                }

                // Check if already processed
                const alreadyProcessed = log.processedBounces.some(
                    b => b.email === bouncedEmail &&
                         new Date(b.processedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                );

                if (alreadyProcessed) {
                    continue;
                }

                results.processed++;
                console.log(`[BounceHandler] Processing bounce for: ${bouncedEmail}`);

                // Determine bounce type
                if (isHardBounce(parsed)) {
                    // Permanent failure - mark and don't retry
                    console.log(`[BounceHandler] Hard bounce (permanent): ${bouncedEmail}`);
                    log.processedBounces.push({
                        email: bouncedEmail,
                        type: 'hard',
                        subject: parsed.subject,
                        processedAt: new Date().toISOString()
                    });
                    results.permanent++;

                } else if (isSoftBounce(parsed)) {
                    // Temporary failure - retry with different sender
                    console.log(`[BounceHandler] Soft bounce - attempting retry: ${bouncedEmail}`);

                    const retryResult = await retryWithAlternativeSender(bouncedEmail, log, invoicingLog);

                    if (retryResult.success) {
                        log.retriedEmails.push({
                            originalEmail: bouncedEmail,
                            senderUsed: retryResult.senderUsed,
                            messageId: retryResult.messageId,
                            retriedAt: new Date().toISOString()
                        });
                        results.retried++;
                    } else {
                        log.failedRetries.push({
                            email: bouncedEmail,
                            reason: retryResult.reason || retryResult.error,
                            failedAt: new Date().toISOString()
                        });
                        results.failed++;
                    }

                    log.processedBounces.push({
                        email: bouncedEmail,
                        type: 'soft',
                        retried: retryResult.success,
                        processedAt: new Date().toISOString()
                    });

                } else {
                    // Unknown bounce type - try retry anyway
                    const retryResult = await retryWithAlternativeSender(bouncedEmail, log, invoicingLog);

                    log.processedBounces.push({
                        email: bouncedEmail,
                        type: 'unknown',
                        retried: retryResult.success,
                        processedAt: new Date().toISOString()
                    });

                    if (retryResult.success) results.retried++;
                    else results.failed++;
                }

                // Rate limiting
                await new Promise(r => setTimeout(r, 1000));

            } catch (error) {
                console.log(`[BounceHandler] Error processing email: ${error.message}`);
            }
        }

        // Update stats
        log.stats.total += results.processed;
        log.stats.retried += results.retried;
        log.stats.failed += results.failed;
        log.stats.permanent += results.permanent;

        saveLog(log);

        // Close IMAP
        imap.end();

        const summary = `Processed: ${results.processed}, Retried: ${results.retried}, Failed: ${results.failed}, Permanent: ${results.permanent}`;
        console.log(`[BounceHandler] ${summary}`);

        return { success: true, results, summary };

    } catch (error) {
        console.error(`[BounceHandler] Critical error: ${error.message}`);
        if (imap) {
            try { imap.end(); } catch (e) {}
        }
        saveLog(log);
        return { success: false, error: error.message };
    }
}

module.exports = { run };
