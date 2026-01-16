#!/usr/bin/env node
/**
 * Send Emails to Won Customers
 * With rate limiting to avoid SMTP blocks
 * Total: 628 emails (166 from descriptions + 462 from contacts)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const DATA_DIR = path.join(__dirname, '..', 'Data Room', '05_Won_Deals');
const EMAIL_QUEUE_DIR = path.join(DATA_DIR, 'Email_Queue');
const SENT_LOG = path.join(EMAIL_QUEUE_DIR, 'sent_log.json');

// SMTP configuration
const transporter = nodemailer.createTransport({
    host: 'send.one.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER || 'projects@enterprise-universe.one',
        pass: process.env.SMTP_PASS
    }
});

// Rate limiting: 10 emails per 5 minutes = ~2 per minute
const EMAILS_PER_BATCH = 10;
const BATCH_DELAY_MS = 5 * 60 * 1000 + 10000; // 5 min + 10 sec buffer
const EMAIL_DELAY_MS = 5000; // 5 sec between individual emails

// Load sent log
function loadSentLog() {
    if (fs.existsSync(SENT_LOG)) {
        return JSON.parse(fs.readFileSync(SENT_LOG, 'utf-8'));
    }
    return { sent: [], failed: [], lastRun: null };
}

// Save sent log
function saveSentLog(log) {
    fs.writeFileSync(SENT_LOG, JSON.stringify(log, null, 2));
}

// Generate HTML email
function generateEmailHTML(data) {
    const phases = data.phases.map((p, i) =>
        `<tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">${i + 1}. ${p.name}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${p.duration}</td>
        </tr>`
    ).join('');

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#1a365d;padding:20px;text-align:center;">
        <h1 style="color:white;margin:0;">Enterprise Universe</h1>
    </div>

    <div style="padding:20px;background:#f8f9fa;">
        <p>Sehr geehrte/r ${data.contactName},</p>

        <p>vielen Dank für Ihr Vertrauen in <strong>Enterprise Universe</strong>!</p>

        <p>Wir freuen uns, Ihnen mitteilen zu können, dass Ihr Projekt
        <strong>${data.companyName}</strong> erfolgreich abgeschlossen wurde.</p>

        <div style="background:white;padding:15px;border-radius:8px;margin:20px 0;">
            <h3 style="color:#1a365d;margin-top:0;">Projektdetails</h3>
            <p><strong>Projektklasse:</strong> ${data.projectClass}</p>
            <p><strong>Auftragswert:</strong> EUR ${data.dealAmount.toLocaleString('de-DE')}</p>
            <p><strong>Rechnungsnummer:</strong> ${data.invoiceNumber}</p>
        </div>

        <div style="background:white;padding:15px;border-radius:8px;margin:20px 0;">
            <h3 style="color:#1a365d;margin-top:0;">Projektphasen</h3>
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="background:#e2e8f0;">
                        <th style="padding:8px;text-align:left;">Phase</th>
                        <th style="padding:8px;text-align:left;">Dauer</th>
                    </tr>
                </thead>
                <tbody>
                    ${phases}
                </tbody>
            </table>
        </div>

        <div style="background:#e6fffa;padding:15px;border-radius:8px;margin:20px 0;">
            <h3 style="color:#1a365d;margin-top:0;">Zahlungsbedingungen</h3>
            <p style="margin-bottom:0;">${data.paymentTerms}</p>
        </div>

        <p>Im Anhang finden Sie:</p>
        <ul>
            <li>Ihre Kundenkarte mit allen Projektdetails</li>
            <li>Ihre Rechnung (${data.invoiceNumber})</li>
        </ul>

        <p>Bei Fragen stehen wir Ihnen jederzeit zur Verfügung.</p>

        <p>Mit freundlichen Grüßen,<br>
        <strong>Ihr Enterprise Universe Team</strong></p>
    </div>

    <div style="background:#1a365d;padding:15px;text-align:center;">
        <p style="color:white;margin:0;font-size:12px;">
            Enterprise Universe GmbH | Berlin | enterprise-universe.one
        </p>
    </div>
</body>
</html>`;
}

// Send single email
async function sendEmail(email) {
    const html = generateEmailHTML(email.data);

    const mailOptions = {
        from: '"Enterprise Universe" <invoice@enterprise-universe.com>',
        to: email.to,
        subject: email.subject,
        html: html,
        text: `Sehr geehrte/r ${email.data.contactName},\n\nvielen Dank für Ihr Vertrauen in Enterprise Universe!\n\nIhr Projekt ${email.data.companyName} (${email.data.projectClass}) wurde erfolgreich abgeschlossen.\n\nAuftragswert: EUR ${email.data.dealAmount.toLocaleString('de-DE')}\nRechnungsnummer: ${email.data.invoiceNumber}\n\nMit freundlichen Grüßen,\nIhr Enterprise Universe Team`
    };

    await transporter.sendMail(mailOptions);
    return true;
}

// Main sending function
async function sendEmails(startFrom = 0, limit = null) {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     SEND EMAILS TO WON CUSTOMERS                              ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    // Load all email queues
    const queueFiles = fs.readdirSync(EMAIL_QUEUE_DIR)
        .filter(f => f.endsWith('.json') && (f.startsWith('email_queue_') || f.startsWith('additional_emails_')));

    let allEmails = [];
    for (const file of queueFiles) {
        const data = JSON.parse(fs.readFileSync(path.join(EMAIL_QUEUE_DIR, file), 'utf-8'));
        if (data.emails) {
            allEmails = allEmails.concat(data.emails);
        }
    }

    // Remove duplicates by email address
    const uniqueEmails = [];
    const seen = new Set();
    for (const email of allEmails) {
        if (!seen.has(email.to)) {
            seen.add(email.to);
            uniqueEmails.push(email);
        }
    }

    console.log(`Total unique emails: ${uniqueEmails.length}`);

    // Load sent log
    const log = loadSentLog();
    const alreadySent = new Set(log.sent.map(s => s.email));

    // Filter out already sent
    const toSend = uniqueEmails.filter(e => !alreadySent.has(e.to));
    console.log(`Already sent: ${log.sent.length}`);
    console.log(`Remaining to send: ${toSend.length}`);

    if (toSend.length === 0) {
        console.log('\nAll emails have been sent!');
        return;
    }

    // Apply start/limit
    let emailsToProcess = toSend.slice(startFrom);
    if (limit) {
        emailsToProcess = emailsToProcess.slice(0, limit);
    }

    console.log(`Processing: ${emailsToProcess.length} emails (starting from ${startFrom}${limit ? `, limit ${limit}` : ''})\n`);

    let sent = 0;
    let failed = 0;
    let batchCount = 0;

    for (let i = 0; i < emailsToProcess.length; i++) {
        const email = emailsToProcess[i];

        // Check if we need batch delay
        if (i > 0 && i % EMAILS_PER_BATCH === 0) {
            batchCount++;
            const waitTime = Math.ceil(BATCH_DELAY_MS / 1000);
            console.log(`\nBatch ${batchCount} complete. Waiting ${waitTime} seconds for rate limit...`);
            await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
            console.log('Resuming...\n');
        }

        try {
            await sendEmail(email);
            sent++;

            log.sent.push({
                email: email.to,
                subject: email.subject,
                sentAt: new Date().toISOString()
            });

            console.log(`✓ [${sent + failed}/${emailsToProcess.length}] Sent to: ${email.to}`);

        } catch (err) {
            failed++;

            log.failed.push({
                email: email.to,
                error: err.message,
                failedAt: new Date().toISOString()
            });

            console.log(`✗ [${sent + failed}/${emailsToProcess.length}] Failed: ${email.to} - ${err.message}`);

            // If rate limited, wait longer
            if (err.message.includes('Too many mails') || err.message.includes('451')) {
                console.log('\nRate limited! Waiting 10 minutes...');
                await new Promise(r => setTimeout(r, 10 * 60 * 1000));
                console.log('Resuming...\n');
            }
        }

        // Save log periodically
        if ((sent + failed) % 10 === 0) {
            log.lastRun = new Date().toISOString();
            saveSentLog(log);
        }

        // Delay between emails
        await new Promise(r => setTimeout(r, EMAIL_DELAY_MS));
    }

    // Final save
    log.lastRun = new Date().toISOString();
    saveSentLog(log);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                    SENDING COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`Sent: ${sent}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total sent (all time): ${log.sent.length}`);
    console.log(`\nLog saved to: ${SENT_LOG}`);
    console.log('\n═══════════════════════════════════════════════════════════════');
}

// Parse command line arguments
const args = process.argv.slice(2);
const startFrom = parseInt(args[0]) || 0;
const limit = args[1] ? parseInt(args[1]) : null;

sendEmails(startFrom, limit).catch(console.error);
