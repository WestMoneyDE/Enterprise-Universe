/**
 * Presentation Sender Daemon Worker
 * Automatically sends personalized presentation links to verified customers
 *
 * Triggers when deal reaches 'presentationscheduled' stage in HubSpot
 * Sends email with personalized NEXUS-style presentation link
 */

const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const emailService = require('./utils/email-service');

const HUBSPOT_TOKEN = process.env.HUBSPOT_API_KEY || process.env.HUBSPOT_ACCESS_TOKEN;
const HUBSPOT_BASE_URL = 'https://api.hubapi.com';
const BATCH_SIZE = 20;
const PRESENTATION_BASE_URL = process.env.PRESENTATION_BASE_URL || 'https://app.enterprise-universe.one';

async function hubspotRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
            'Content-Type': 'application/json'
        }
    };

    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(`${HUBSPOT_BASE_URL}${endpoint}`, options);

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`HubSpot API ${response.status}: ${error}`);
        }

        return response.json();
    } catch (error) {
        console.error('[PresentationSender] API Error:', error.message);
        throw error;
    }
}

/**
 * Generate a secure presentation token for a deal
 */
function generatePresentationToken(dealId) {
    const secret = process.env.PRESENTATION_SECRET || 'nexus-enterprise-2026';
    return crypto
        .createHash('sha256')
        .update(`${dealId}-${secret}`)
        .digest('hex')
        .substring(0, 16);
}

/**
 * Get deals in presentationscheduled stage that haven't received presentation
 * Note: We only filter by stage and check presentation_sent in code
 * because the property may not exist in HubSpot schema yet
 */
async function getDealsForPresentation() {
    const searchBody = {
        filterGroups: [{
            filters: [
                {
                    propertyName: 'dealstage',
                    operator: 'EQ',
                    value: 'presentationscheduled'
                }
            ]
        }],
        properties: [
            'dealname',
            'amount',
            'dealstage',
            'presentation_sent',
            'hubspot_owner_id'
        ],
        limit: BATCH_SIZE
    };

    return hubspotRequest('/crm/v3/objects/deals/search', 'POST', searchBody);
}

/**
 * Check if presentation was already sent for this deal
 */
function isPresentationAlreadySent(deal) {
    const sent = deal.properties.presentation_sent;
    return sent === 'true' || sent === true || sent === '1';
}

/**
 * Get associated contact for a deal
 */
async function getDealContact(dealId) {
    try {
        const associations = await hubspotRequest(
            `/crm/v3/objects/deals/${dealId}/associations/contacts`
        );

        if (!associations.results || associations.results.length === 0) {
            return null;
        }

        const contactId = associations.results[0].id;
        const contact = await hubspotRequest(
            `/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname,company,phone`
        );

        return contact;
    } catch (error) {
        console.error(`[PresentationSender] Error getting contact for deal ${dealId}:`, error.message);
        return null;
    }
}

/**
 * Send presentation email to customer
 */
async function sendPresentationEmail(deal, contact, presentationUrl) {
    const firstName = contact.properties.firstname || 'Interessent';
    const companyName = contact.properties.company || '';
    const dealName = deal.properties.dealname || 'Smart Home Projekt';
    const dealValue = deal.properties.amount
        ? parseFloat(deal.properties.amount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
        : '';

    // Generate intake form URL with same token
    const token = presentationUrl.split('/').pop();
    const intakeUrl = `${PRESENTATION_BASE_URL}/intake/${token}`;

    const subject = `Ihre persönliche Präsentation: ${dealName}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0f; color: #e4e4e7; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { font-size: 28px; font-weight: bold; color: #00f0ff; letter-spacing: 4px; }
        .subtitle { color: #71717a; font-size: 12px; letter-spacing: 2px; margin-top: 8px; }
        .card { background: linear-gradient(135deg, rgba(0,240,255,0.1), rgba(139,92,246,0.1)); border: 1px solid rgba(0,240,255,0.3); border-radius: 16px; padding: 32px; margin-bottom: 24px; }
        .greeting { font-size: 18px; margin-bottom: 16px; }
        .highlight { color: #00f0ff; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #00f0ff, #8b5cf6); color: #0a0a0f; text-decoration: none; font-weight: bold; padding: 16px 40px; border-radius: 8px; font-size: 16px; margin: 24px 0; }
        .cta-button:hover { opacity: 0.9; }
        .features { margin: 24px 0; }
        .feature { display: flex; align-items: center; margin: 12px 0; }
        .feature-icon { color: #00f0ff; margin-right: 12px; font-size: 18px; }
        .footer { text-align: center; color: #71717a; font-size: 12px; margin-top: 40px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; }
        .project-value { font-size: 24px; color: #00f0ff; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">NEXUS ENTERPRISE</div>
            <div class="subtitle">SMART HOME & BUILDING SOLUTIONS</div>
        </div>

        <div class="card">
            <div class="greeting">
                Hallo ${firstName}${companyName ? ` von ${companyName}` : ''},
            </div>

            <p>
                Vielen Dank für Ihr Interesse an unserem <span class="highlight">${dealName}</span>.
                Damit wir Ihre Präsentation optimal auf Ihre Bedürfnisse abstimmen können,
                bitten wir Sie zunächst um einige kurze Angaben.
            </p>

            ${dealValue ? `<p class="project-value">${dealValue}</p>` : ''}

            <div style="background: rgba(0,240,255,0.1); border-radius: 12px; padding: 24px; margin: 24px 0;">
                <p style="margin: 0 0 12px 0; font-weight: bold; color: #00f0ff;">📋 Schritt 1: Anforderungen mitteilen</p>
                <p style="margin: 0 0 16px 0; font-size: 14px; color: #a1a1aa;">
                    Nur 2 Minuten – und Ihre Präsentation wird perfekt auf Sie zugeschnitten.
                </p>
                <a href="${intakeUrl}" style="display: inline-block; background: linear-gradient(135deg, #00f0ff, #8b5cf6); color: #0a0a0f; text-decoration: none; font-weight: bold; padding: 14px 32px; border-radius: 8px; font-size: 15px;">
                    Anforderungen eingeben →
                </a>
            </div>

            <div style="text-align: center; margin: 24px 0;">
                <p style="color: #71717a; font-size: 13px; margin-bottom: 12px;">Oder direkt zur Präsentation:</p>
                <a href="${presentationUrl}" style="color: #00f0ff; text-decoration: underline;">
                    Präsentation ansehen
                </a>
            </div>

            <div class="features">
                <div class="feature">
                    <span class="feature-icon">✦</span>
                    <span>Individuelle Projektplanung für Ihre Anforderungen</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">✦</span>
                    <span>LOXONE Gold Partner Qualität</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">✦</span>
                    <span>Interaktive 3D-Visualisierung</span>
                </div>
            </div>

            <p style="font-size: 14px; color: #a1a1aa;">
                Die Links sind 30 Tage gültig und nur für Sie bestimmt.
            </p>
        </div>

        <p style="text-align: center; margin: 24px 0;">
            Bei Fragen stehen wir Ihnen jederzeit zur Verfügung.<br>
            <a href="mailto:info@enterprise-universe.com" style="color: #00f0ff;">info@enterprise-universe.com</a>
        </p>

        <div class="footer">
            <p>
                West Money Bau | NEXUS Enterprise Division<br>
                Smart Home & Barrierefreies Bauen<br>
                LOXONE Gold Partner | ComfortClick | Verisure
            </p>
            <p style="margin-top: 16px;">
                © 2026 Enterprise Universe. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
`;

    const textBody = `
Hallo ${firstName}${companyName ? ` von ${companyName}` : ''},

Vielen Dank für Ihr Interesse an unserem ${dealName}.
Damit wir Ihre Präsentation optimal auf Ihre Bedürfnisse abstimmen können,
bitten wir Sie zunächst um einige kurze Angaben.

${dealValue ? `Projektwert: ${dealValue}` : ''}

SCHRITT 1: ANFORDERUNGEN MITTEILEN
Nur 2 Minuten – und Ihre Präsentation wird perfekt auf Sie zugeschnitten.
→ ${intakeUrl}

Oder direkt zur Präsentation:
→ ${presentationUrl}

Die Links sind 30 Tage gültig und nur für Sie bestimmt.

Bei Fragen stehen wir Ihnen jederzeit zur Verfügung:
info@enterprise-universe.com

Mit freundlichen Grüßen
West Money Bau | NEXUS Enterprise Division
`;

    return emailService.sendEmail({
        to: contact.properties.email,
        subject: subject,
        body: textBody,
        html: html
    });
}

/**
 * Mark deal as presentation sent
 * Tries to set custom properties, but continues gracefully if they don't exist
 */
async function markPresentationSent(dealId, presentationUrl) {
    // First try with all properties
    try {
        return await hubspotRequest(`/crm/v3/objects/deals/${dealId}`, 'PATCH', {
            properties: {
                presentation_sent: 'true',
                presentation_sent_date: new Date().toISOString().split('T')[0],
                presentation_url: presentationUrl
            }
        });
    } catch (error) {
        // If properties don't exist, log but don't fail
        if (error.message.includes('PROPERTY_DOESNT_EXIST')) {
            console.log(`[PresentationSender] Custom properties don't exist in HubSpot, creating note instead`);
            return { id: dealId, fallback: true };
        }
        throw error;
    }
}

/**
 * Create note on deal for activity tracking
 */
async function createDealNote(dealId, content) {
    try {
        const note = await hubspotRequest('/crm/v3/objects/notes', 'POST', {
            properties: {
                hs_note_body: content,
                hs_timestamp: new Date().toISOString()
            }
        });

        await hubspotRequest(
            `/crm/v3/objects/notes/${note.id}/associations/deals/${dealId}/note_to_deal`,
            'PUT'
        );

        return note;
    } catch (error) {
        console.error(`[PresentationSender] Error creating note:`, error.message);
        return null;
    }
}

async function run() {
    const stats = {
        processed: 0,
        sent: 0,
        errors: 0,
        noContact: 0,
        noEmail: 0
    };

    try {
        // Check API key
        if (!HUBSPOT_TOKEN) {
            return {
                success: false,
                summary: 'HUBSPOT_API_KEY not configured',
                stats
            };
        }

        // Get deals in presentationscheduled stage
        const response = await getDealsForPresentation();
        const deals = response.results || [];

        if (deals.length === 0) {
            return {
                success: true,
                summary: 'No presentations to send',
                stats
            };
        }

        console.log(`[PresentationSender] Found ${deals.length} deals for presentation`);

        // Process each deal
        for (const deal of deals) {
            stats.processed++;

            try {
                // Skip if already sent
                if (isPresentationAlreadySent(deal)) {
                    console.log(`[PresentationSender] Already sent for deal ${deal.id}, skipping`);
                    continue;
                }

                // Get associated contact
                const contact = await getDealContact(deal.id);

                if (!contact) {
                    stats.noContact++;
                    console.log(`[PresentationSender] No contact for deal ${deal.id}`);
                    continue;
                }

                const email = contact.properties.email;
                if (!email) {
                    stats.noEmail++;
                    console.log(`[PresentationSender] No email for contact ${contact.id}`);
                    continue;
                }

                // Generate presentation URL
                const token = generatePresentationToken(deal.id);
                const presentationUrl = `${PRESENTATION_BASE_URL}/presentation/${token}`;

                // Send email
                const result = await sendPresentationEmail(deal, contact, presentationUrl);

                if (result.success) {
                    // Mark as sent in HubSpot
                    await markPresentationSent(deal.id, presentationUrl);

                    // Create activity note
                    await createDealNote(deal.id,
                        `📊 Präsentation automatisch versendet\n\n` +
                        `Empfänger: ${email}\n` +
                        `Link: ${presentationUrl}\n` +
                        `Zeitpunkt: ${new Date().toLocaleString('de-DE')}`
                    );

                    stats.sent++;
                    console.log(`[PresentationSender] Sent to ${email} for deal ${deal.properties.dealname}`);
                } else {
                    stats.errors++;
                    console.error(`[PresentationSender] Email failed for ${email}:`, result.error);
                }

                // Rate limiting
                await new Promise(r => setTimeout(r, 500));

            } catch (error) {
                stats.errors++;
                console.error(`[PresentationSender] Error processing deal ${deal.id}:`, error.message);
            }
        }

        return {
            success: stats.errors === 0,
            summary: `Sent ${stats.sent}/${stats.processed} presentations (${stats.noContact} no contact, ${stats.noEmail} no email, ${stats.errors} errors)`,
            stats
        };

    } catch (error) {
        return {
            success: false,
            summary: `Error: ${error.message}`,
            error: error.message,
            stats
        };
    }
}

module.exports = { run, generatePresentationToken };
