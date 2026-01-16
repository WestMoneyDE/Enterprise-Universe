/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WON CUSTOMER INVOICING DAEMON
 * Automatically sends invoices and project info to ClosedWon customers
 * Fetches CORRECT email addresses from HubSpot contacts
 * ═══════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const emailService = require('./utils/email-service');

// Configuration
const TOKEN = process.env.HUBSPOT_API_KEY;
const DATA_DIR = path.join(__dirname, '../../data/invoicing');
const LOG_FILE = path.join(DATA_DIR, 'invoicing-log.json');
const BATCH_SIZE = 5; // Emails per run to avoid rate limiting
const API_BASE = 'https://api.hubapi.com';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ═══════════════════════════════════════════════════════════════════════════
// HUBSPOT API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function fetchClosedWonDeals(after = null) {
    const body = {
        filterGroups: [{
            filters: [{
                propertyName: 'dealstage',
                operator: 'EQ',
                value: 'closedwon'
            }]
        }],
        properties: [
            'dealname', 'amount', 'dealstage', 'closedate',
            'hubspot_owner_id', 'pipeline', 'description',
            'hs_lastmodifieddate', 'createdate'
        ],
        limit: 100
    };

    if (after) body.after = after;

    const response = await fetch(`${API_BASE}/crm/v3/objects/deals/search`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`HubSpot API error: ${response.status}`);
    }

    return response.json();
}

async function getDealContacts(dealId) {
    const response = await fetch(
        `${API_BASE}/crm/v3/objects/deals/${dealId}/associations/contacts`,
        { headers: { 'Authorization': `Bearer ${TOKEN}` } }
    );

    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
}

async function getContactDetails(contactId) {
    const response = await fetch(
        `${API_BASE}/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname,phone,company`,
        { headers: { 'Authorization': `Bearer ${TOKEN}` } }
    );

    if (!response.ok) return null;
    return response.json();
}

async function getCompanyForDeal(dealId) {
    const response = await fetch(
        `${API_BASE}/crm/v3/objects/deals/${dealId}/associations/companies`,
        { headers: { 'Authorization': `Bearer ${TOKEN}` } }
    );

    if (!response.ok) return null;
    const data = await response.json();

    if (data.results && data.results.length > 0) {
        const companyId = data.results[0].id;
        const companyResponse = await fetch(
            `${API_BASE}/crm/v3/objects/companies/${companyId}?properties=name,domain,city,country`,
            { headers: { 'Authorization': `Bearer ${TOKEN}` } }
        );
        if (companyResponse.ok) {
            return companyResponse.json();
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGGING & STATE
// ═══════════════════════════════════════════════════════════════════════════

function loadLog() {
    if (fs.existsSync(LOG_FILE)) {
        return JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
    }
    return {
        processedDeals: {},
        sentEmails: [],
        failedEmails: [],
        stats: { total: 0, sent: 0, failed: 0, skipped: 0 },
        lastRun: null
    };
}

function saveLog(log) {
    log.lastRun = new Date().toISOString();
    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════

function generateInvoiceEmail(deal, contact, company) {
    const amount = parseFloat(deal.properties.amount) || 0;
    const companyName = company?.properties?.name || deal.properties.dealname.split('#')[0].replace(/^[A-Z]-Class:\s*/, '').trim();
    const contactName = contact ? `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim() : 'Sehr geehrte Damen und Herren';

    const invoiceNumber = `EU-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${deal.id.slice(-6)}`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#1a365d;padding:20px;text-align:center;">
        <h1 style="color:white;margin:0;">Enterprise Universe</h1>
    </div>

    <div style="padding:20px;background:#f8f9fa;">
        <p>Sehr geehrte/r ${contactName},</p>

        <p>vielen Dank für Ihr Vertrauen in <strong>Enterprise Universe</strong>!</p>

        <p>Anbei erhalten Sie die Unterlagen zu Ihrem Projekt <strong>${companyName}</strong>.</p>

        <div style="background:white;padding:15px;border-radius:8px;margin:20px 0;">
            <h3 style="color:#1a365d;margin-top:0;">Projektdetails</h3>
            <p><strong>Auftragswert:</strong> EUR ${amount.toLocaleString('de-DE', {minimumFractionDigits: 2})}</p>
            <p><strong>Rechnungsnummer:</strong> ${invoiceNumber}</p>
            <p><strong>Abschlussdatum:</strong> ${new Date(deal.properties.closedate).toLocaleDateString('de-DE')}</p>
        </div>

        <div style="background:#e6fffa;padding:15px;border-radius:8px;margin:20px 0;">
            <h3 style="color:#1a365d;margin-top:0;">Nächste Schritte</h3>
            <ul style="margin-bottom:0;">
                <li>Projektplanung und Kickoff-Meeting</li>
                <li>Zuweisung Ihres persönlichen Projektmanagers</li>
                <li>Detaillierter Projektplan innerhalb von 5 Werktagen</li>
            </ul>
        </div>

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

    const text = `Sehr geehrte/r ${contactName},

vielen Dank für Ihr Vertrauen in Enterprise Universe!

Projekt: ${companyName}
Auftragswert: EUR ${amount.toLocaleString('de-DE', {minimumFractionDigits: 2})}
Rechnungsnummer: ${invoiceNumber}

Mit freundlichen Grüßen,
Ihr Enterprise Universe Team`;

    return { html, text, invoiceNumber, subject: `Enterprise Universe - Projektbestätigung ${companyName}` };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN WORKER
// ═══════════════════════════════════════════════════════════════════════════

async function run() {
    console.log('[WonCustomerInvoicing] Starting...');

    const log = loadLog();
    const results = { processed: 0, sent: 0, failed: 0, skipped: 0 };

    try {
        // Fetch all closedwon deals
        let allDeals = [];
        let after = null;

        do {
            const response = await fetchClosedWonDeals(after);
            allDeals = allDeals.concat(response.results || []);
            after = response.paging?.next?.after;

            // Rate limiting
            if (after) await new Promise(r => setTimeout(r, 100));
        } while (after && allDeals.length < 500); // Limit to prevent overload

        console.log(`[WonCustomerInvoicing] Found ${allDeals.length} closedwon deals`);

        // Filter unprocessed deals
        const unprocessedDeals = allDeals.filter(deal => !log.processedDeals[deal.id]);
        console.log(`[WonCustomerInvoicing] ${unprocessedDeals.length} unprocessed deals`);

        // Process batch
        const batch = unprocessedDeals.slice(0, BATCH_SIZE);

        for (const deal of batch) {
            results.processed++;

            try {
                // Get contact for this deal
                const contactAssociations = await getDealContacts(deal.id);

                let contact = null;
                let email = null;

                if (contactAssociations.length > 0) {
                    contact = await getContactDetails(contactAssociations[0].id);
                    email = contact?.properties?.email;
                }

                // Try to get email from description if no contact
                if (!email && deal.properties.description) {
                    const emailMatch = deal.properties.description.match(/E-Mail:\s*([^\n\r]+)/i);
                    if (emailMatch) {
                        email = emailMatch[1].trim();
                    }
                }

                // Skip if no valid email
                if (!email || !email.includes('@')) {
                    console.log(`[WonCustomerInvoicing] No email for deal ${deal.id} - skipping`);
                    log.processedDeals[deal.id] = {
                        status: 'skipped',
                        reason: 'no_email',
                        processedAt: new Date().toISOString()
                    };
                    results.skipped++;
                    continue;
                }

                // Get company info
                const company = await getCompanyForDeal(deal.id);

                // Generate email
                const emailContent = generateInvoiceEmail(deal, contact, company);

                // Send email
                const sendResult = await emailService.sendEmail({
                    to: email,
                    subject: emailContent.subject,
                    body: emailContent.text,
                    html: emailContent.html
                });

                if (sendResult.success) {
                    log.processedDeals[deal.id] = {
                        status: 'sent',
                        email: email,
                        invoiceNumber: emailContent.invoiceNumber,
                        messageId: sendResult.messageId,
                        sentAt: new Date().toISOString()
                    };
                    log.sentEmails.push({
                        dealId: deal.id,
                        email: email,
                        sentAt: new Date().toISOString()
                    });
                    results.sent++;
                    console.log(`[WonCustomerInvoicing] ✓ Sent to: ${email}`);
                } else {
                    throw new Error(sendResult.error);
                }

                // Rate limiting between emails
                await new Promise(r => setTimeout(r, 2000));

            } catch (error) {
                console.log(`[WonCustomerInvoicing] ✗ Failed deal ${deal.id}: ${error.message}`);
                log.processedDeals[deal.id] = {
                    status: 'failed',
                    error: error.message,
                    failedAt: new Date().toISOString()
                };
                log.failedEmails.push({
                    dealId: deal.id,
                    error: error.message,
                    failedAt: new Date().toISOString()
                });
                results.failed++;
            }
        }

        // Update stats
        log.stats.total += results.processed;
        log.stats.sent += results.sent;
        log.stats.failed += results.failed;
        log.stats.skipped += results.skipped;

        saveLog(log);

        const summary = `Processed: ${results.processed}, Sent: ${results.sent}, Failed: ${results.failed}, Skipped: ${results.skipped}. Total sent all-time: ${log.stats.sent}`;
        console.log(`[WonCustomerInvoicing] ${summary}`);

        return { success: true, results, summary };

    } catch (error) {
        console.error(`[WonCustomerInvoicing] Critical error: ${error.message}`);
        saveLog(log);
        return { success: false, error: error.message };
    }
}

module.exports = { run };
