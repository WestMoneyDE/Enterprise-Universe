/**
 * EMAIL ACCOUNTS SERVICE
 * Multi-Account Support with IMAP Sent Mail Tracking
 *
 * Supports: info@ and invoice@ email accounts
 * Enterprise Universe - West Money Bau GmbH
 */

const nodemailer = require('nodemailer');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Email Account Configurations
const EMAIL_ACCOUNTS = {
    info: {
        name: 'Info',
        email: process.env.EMAIL_INFO_USER || 'info@enterprise-universe.one',
        smtp: {
            host: process.env.EMAIL_INFO_SMTP_HOST || 'send.one.com',
            port: parseInt(process.env.EMAIL_INFO_SMTP_PORT) || 587,
            secure: process.env.EMAIL_INFO_SMTP_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_INFO_USER || 'info@enterprise-universe.one',
                pass: process.env.EMAIL_INFO_PASS
            }
        },
        imap: {
            host: process.env.EMAIL_INFO_IMAP_HOST || 'imap.one.com',
            port: parseInt(process.env.EMAIL_INFO_IMAP_PORT) || 993,
            tls: true,
            user: process.env.EMAIL_INFO_USER || 'info@enterprise-universe.one',
            password: process.env.EMAIL_INFO_PASS
        }
    },
    invoice: {
        name: 'Invoice',
        email: process.env.EMAIL_INVOICE_USER || process.env.SMTP_USER || 'invoice@enterprise-universe.com',
        smtp: {
            host: process.env.EMAIL_INVOICE_SMTP_HOST || process.env.SMTP_HOST || 'send.one.com',
            port: parseInt(process.env.EMAIL_INVOICE_SMTP_PORT || process.env.SMTP_PORT) || 587,
            secure: (process.env.EMAIL_INVOICE_SMTP_SECURE || process.env.SMTP_SECURE) === 'true',
            auth: {
                user: process.env.EMAIL_INVOICE_USER || process.env.SMTP_USER || 'invoice@enterprise-universe.com',
                pass: process.env.EMAIL_INVOICE_PASS || process.env.SMTP_PASS
            }
        },
        imap: {
            host: process.env.EMAIL_INVOICE_IMAP_HOST || process.env.IMAP_HOST || 'imap.one.com',
            port: parseInt(process.env.EMAIL_INVOICE_IMAP_PORT || process.env.IMAP_PORT) || 993,
            tls: true,
            user: process.env.EMAIL_INVOICE_USER || process.env.IMAP_USER || 'invoice@enterprise-universe.com',
            password: process.env.EMAIL_INVOICE_PASS || process.env.SMTP_PASS
        }
    }
};

// SMTP Transporters (lazy initialized)
const transporters = {};

/**
 * Initialize database tables
 */
async function initDatabase() {
    const client = await pool.connect();
    try {
        // Email accounts table
        await client.query(`
            CREATE TABLE IF NOT EXISTS email_accounts (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT true,
                last_sync_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Synced emails table
        await client.query(`
            CREATE TABLE IF NOT EXISTS synced_emails (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                account_id VARCHAR(50) NOT NULL,
                message_id VARCHAR(500),
                uid INTEGER,
                from_address VARCHAR(255),
                to_addresses TEXT[],
                cc_addresses TEXT[],
                subject VARCHAR(500),
                body_preview TEXT,
                sent_at TIMESTAMP,
                folder VARCHAR(100) DEFAULT 'Sent',
                is_read BOOLEAN DEFAULT true,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(account_id, message_id)
            )
        `);

        // Create indexes
        await client.query(`CREATE INDEX IF NOT EXISTS idx_synced_emails_account ON synced_emails(account_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_synced_emails_sent ON synced_emails(sent_at DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_synced_emails_to ON synced_emails USING GIN(to_addresses)`);

        // Insert default accounts
        for (const [id, account] of Object.entries(EMAIL_ACCOUNTS)) {
            await client.query(`
                INSERT INTO email_accounts (id, name, email)
                VALUES ($1, $2, $3)
                ON CONFLICT (id) DO UPDATE SET email = $3
            `, [id, account.name, account.email]);
        }

        console.log('✓ Email accounts database initialized');
        return true;
    } catch (error) {
        console.error('Email accounts DB init error:', error.message);
        return false;
    } finally {
        client.release();
    }
}

/**
 * Get SMTP transporter for account
 */
function getTransporter(accountId) {
    if (!transporters[accountId]) {
        const account = EMAIL_ACCOUNTS[accountId];
        if (!account) {
            throw new Error(`Unknown email account: ${accountId}`);
        }

        transporters[accountId] = nodemailer.createTransport({
            ...account.smtp,
            pool: true,
            maxConnections: 2,
            maxMessages: 5,
            rateDelta: 6000,
            rateLimit: 1
        });
    }
    return transporters[accountId];
}

/**
 * Get all email accounts with status
 */
async function getAccounts() {
    const result = await pool.query(`
        SELECT ea.*,
               (SELECT COUNT(*) FROM synced_emails WHERE account_id = ea.id) as total_synced,
               (SELECT MAX(sent_at) FROM synced_emails WHERE account_id = ea.id) as last_email_at
        FROM email_accounts ea
        ORDER BY ea.name
    `);

    return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        isActive: row.is_active,
        lastSyncAt: row.last_sync_at,
        totalSynced: parseInt(row.total_synced) || 0,
        lastEmailAt: row.last_email_at,
        config: EMAIL_ACCOUNTS[row.id] ? {
            smtpHost: EMAIL_ACCOUNTS[row.id].smtp.host,
            imapHost: EMAIL_ACCOUNTS[row.id].imap.host,
            hasCredentials: !!(EMAIL_ACCOUNTS[row.id].smtp.auth.pass)
        } : null
    }));
}

/**
 * Send email from specific account
 */
async function sendEmail(accountId, { to, subject, html, text, replyTo, cc, bcc }) {
    const account = EMAIL_ACCOUNTS[accountId];
    if (!account) {
        throw new Error(`Unknown email account: ${accountId}`);
    }

    const transporter = getTransporter(accountId);

    const mailOptions = {
        from: `Enterprise Universe <${account.email}>`,
        to,
        subject,
        html,
        text,
        replyTo: replyTo || account.email,
        cc,
        bcc
    };

    const info = await transporter.sendMail(mailOptions);

    // Log to database
    await pool.query(`
        INSERT INTO synced_emails (account_id, message_id, from_address, to_addresses, subject, body_preview, sent_at, folder)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, 'Sent')
    `, [
        accountId,
        info.messageId,
        account.email,
        Array.isArray(to) ? to : [to],
        subject,
        (text || html || '').substring(0, 500)
    ]);

    return {
        success: true,
        messageId: info.messageId,
        account: accountId,
        to,
        subject
    };
}

/**
 * Sync sent emails from IMAP
 */
async function syncSentEmails(accountId, options = {}) {
    const account = EMAIL_ACCOUNTS[accountId];
    if (!account) {
        throw new Error(`Unknown email account: ${accountId}`);
    }

    if (!account.imap.password) {
        console.warn(`[EmailAccounts] No IMAP password for ${accountId}, skipping sync`);
        return { synced: 0, error: 'No IMAP credentials' };
    }

    const maxEmails = options.maxEmails || 50;
    const sinceDays = options.sinceDays || 30;

    return new Promise((resolve, reject) => {
        const imap = new Imap(account.imap);

        let syncedCount = 0;
        const errors = [];

        imap.once('ready', () => {
            // Try different sent folder names
            const sentFolders = ['Sent', 'INBOX.Sent', 'Sent Items', 'Sent Mail', '[Gmail]/Sent Mail'];

            const tryOpenFolder = (index) => {
                if (index >= sentFolders.length) {
                    imap.end();
                    resolve({ synced: syncedCount, error: 'Could not find Sent folder' });
                    return;
                }

                imap.openBox(sentFolders[index], true, (err, box) => {
                    if (err) {
                        tryOpenFolder(index + 1);
                        return;
                    }

                    console.log(`[EmailAccounts] Opened ${sentFolders[index]} for ${accountId}`);

                    // Search for recent emails
                    const sinceDate = new Date();
                    sinceDate.setDate(sinceDate.getDate() - sinceDays);

                    imap.search([['SINCE', sinceDate]], (err, uids) => {
                        if (err || !uids.length) {
                            imap.end();
                            resolve({ synced: 0, folder: sentFolders[index] });
                            return;
                        }

                        // Get last N emails
                        const fetchUids = uids.slice(-maxEmails);
                        const fetch = imap.fetch(fetchUids, { bodies: ['HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID)'], struct: true });

                        fetch.on('message', (msg, seqno) => {
                            let headers = '';
                            let uid = null;

                            msg.on('body', (stream) => {
                                stream.on('data', (chunk) => {
                                    headers += chunk.toString('utf8');
                                });
                            });

                            msg.once('attributes', (attrs) => {
                                uid = attrs.uid;
                            });

                            msg.once('end', async () => {
                                try {
                                    const parsed = await simpleParser(headers);

                                    await pool.query(`
                                        INSERT INTO synced_emails (account_id, message_id, uid, from_address, to_addresses, cc_addresses, subject, sent_at, folder)
                                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                                        ON CONFLICT (account_id, message_id) DO NOTHING
                                    `, [
                                        accountId,
                                        parsed.messageId || `uid-${uid}`,
                                        uid,
                                        parsed.from?.text || account.email,
                                        parsed.to?.value?.map(a => a.address) || [],
                                        parsed.cc?.value?.map(a => a.address) || [],
                                        parsed.subject || '(no subject)',
                                        parsed.date || new Date(),
                                        sentFolders[index]
                                    ]);
                                    syncedCount++;
                                } catch (e) {
                                    errors.push(e.message);
                                }
                            });
                        });

                        fetch.once('end', async () => {
                            // Update last sync time
                            await pool.query(`
                                UPDATE email_accounts SET last_sync_at = CURRENT_TIMESTAMP WHERE id = $1
                            `, [accountId]);

                            imap.end();
                            resolve({ synced: syncedCount, folder: sentFolders[index], errors: errors.length ? errors : undefined });
                        });

                        fetch.once('error', (err) => {
                            imap.end();
                            reject(err);
                        });
                    });
                });
            };

            tryOpenFolder(0);
        });

        imap.once('error', (err) => {
            console.error(`[EmailAccounts] IMAP error for ${accountId}:`, err.message);
            resolve({ synced: 0, error: err.message });
        });

        imap.connect();
    });
}

/**
 * Get synced sent emails
 */
async function getSentEmails(options = {}) {
    const { accountId, limit = 50, offset = 0, search } = options;

    let query = `
        SELECT se.*, ea.name as account_name
        FROM synced_emails se
        JOIN email_accounts ea ON se.account_id = ea.id
        WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (accountId) {
        query += ` AND se.account_id = $${paramIndex++}`;
        params.push(accountId);
    }

    if (search) {
        query += ` AND (se.subject ILIKE $${paramIndex} OR se.to_addresses::text ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
    }

    query += ` ORDER BY se.sent_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM synced_emails WHERE 1=1`;
    const countParams = [];
    if (accountId) {
        countQuery += ` AND account_id = $1`;
        countParams.push(accountId);
    }
    const countResult = await pool.query(countQuery, countParams);

    return {
        emails: result.rows.map(row => ({
            id: row.id,
            accountId: row.account_id,
            accountName: row.account_name,
            messageId: row.message_id,
            from: row.from_address,
            to: row.to_addresses,
            cc: row.cc_addresses,
            subject: row.subject,
            preview: row.body_preview,
            sentAt: row.sent_at,
            folder: row.folder,
            syncedAt: row.synced_at
        })),
        total: parseInt(countResult.rows[0].count),
        limit,
        offset
    };
}

/**
 * Get email statistics per account
 */
async function getEmailStats(days = 30) {
    const result = await pool.query(`
        SELECT
            ea.id,
            ea.name,
            ea.email,
            COUNT(se.id) as total_sent,
            COUNT(CASE WHEN se.sent_at > NOW() - INTERVAL '7 days' THEN 1 END) as sent_week,
            COUNT(CASE WHEN se.sent_at > NOW() - INTERVAL '1 day' THEN 1 END) as sent_today,
            MAX(se.sent_at) as last_sent
        FROM email_accounts ea
        LEFT JOIN synced_emails se ON ea.id = se.account_id
            AND se.sent_at > NOW() - INTERVAL '${days} days'
        GROUP BY ea.id, ea.name, ea.email
        ORDER BY ea.name
    `);

    return result.rows.map(row => ({
        accountId: row.id,
        accountName: row.name,
        email: row.email,
        totalSent: parseInt(row.total_sent) || 0,
        sentThisWeek: parseInt(row.sent_week) || 0,
        sentToday: parseInt(row.sent_today) || 0,
        lastSent: row.last_sent
    }));
}

/**
 * Sync all accounts
 */
async function syncAllAccounts() {
    const results = {};
    for (const accountId of Object.keys(EMAIL_ACCOUNTS)) {
        try {
            results[accountId] = await syncSentEmails(accountId);
        } catch (error) {
            results[accountId] = { error: error.message };
        }
    }
    return results;
}

// Export
module.exports = {
    initDatabase,
    getAccounts,
    sendEmail,
    syncSentEmails,
    getSentEmails,
    getEmailStats,
    syncAllAccounts,
    EMAIL_ACCOUNTS
};

console.log('[EmailAccounts] Service loaded - Accounts:', Object.keys(EMAIL_ACCOUNTS).join(', '));
