#!/usr/bin/env node
// =============================================================================
// AUTO-COMMISSION SERVICE - Mit Stripe Payment Links
// =============================================================================
// 1. Überwacht HubSpot auf neue Won Deals
// 2. Importiert Kontakte automatisch
// 3. Erstellt Stripe Payment Links
// 4. Sendet Kommissions-Emails mit Zahlungslink
// Läuft alle 15 Minuten via PM2 Cron

import pg from 'pg';
import Stripe from 'stripe';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const { Pool } = pg;

const HUBSPOT_API_BASE = 'https://api.hubapi.com';
const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const MAIL_ENGINE_URL = process.env.MAIL_ENGINE_URL || 'http://localhost:3006';
const STATE_FILE = '/home/administrator/nexus-command-center/.auto-commission-state.json';
const LOG_FILE = '/home/administrator/nexus-command-center/logs/auto-commission.log';

// Stripe Configuration - key must be set via STRIPE_SECRET_KEY env var
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY environment variable is required');
  process.exit(1);
}
const stripe = new Stripe(STRIPE_SECRET_KEY);

// Rate limits - Moderate mode (15s delay for stability)
const EMAILS_PER_RUN = 50;
const DELAY_BETWEEN_EMAILS_MS = 15000;

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'westmoney_os',
  user: 'westmoney',
  password: 'westmoney',
});

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  console.log(line);
  try {
    const existing = existsSync(LOG_FILE) ? readFileSync(LOG_FILE, 'utf8') : '';
    const lines = existing.split('\n').slice(-1000);
    lines.push(line);
    writeFileSync(LOG_FILE, lines.join('\n'));
  } catch {
    // Ignore log errors
  }
}

function loadState() {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
    }
  } catch {
    // Ignore
  }
  return {
    lastDealCheck: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    totalDealsFound: 0,
    totalContactsImported: 0,
    totalEmailsSent: 0,
    runs: [],
  };
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function hubspotRequest(endpoint, options = {}) {
  if (!HUBSPOT_TOKEN) {
    throw new Error('HUBSPOT_ACCESS_TOKEN not set');
  }

  const response = await fetch(`${HUBSPOT_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HubSpot API error: ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// STRIPE PAYMENT LINK
// =============================================================================

async function createStripePaymentLink(contact, commission) {
  try {
    // Betrag in Cents (Stripe erwartet kleinste Währungseinheit)
    const amountInCents = Math.round(commission * 100);

    if (amountInCents < 50) {
      log(`  ⚠️ Provision zu gering für Stripe (${commission}€) - überspringe Payment Link`);
      return null;
    }

    // Erstelle Stripe Payment Link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Provision: ${contact.deal_name || 'Deal'}`,
              description: `Kommission für erfolgreich abgeschlossenen Deal`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        deal_name: contact.deal_name || 'Deal',
        contact_email: contact.contact_email,
        contact_name: contact.contact_name || '',
        contact_id: contact.id,
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: 'https://enterprise-universe.com/zahlung-erfolgreich',
        },
      },
    });

    return paymentLink.url;
  } catch (error) {
    log(`  ⚠️ Stripe Fehler: ${error.message}`);
    return null;
  }
}

// =============================================================================
// PHASE 1: DEAL FINDER
// =============================================================================

async function findNewDeals(since) {
  log('📡 Phase 1: Suche neue Won Deals...');

  const response = await hubspotRequest('/crm/v3/objects/deals/search', {
    method: 'POST',
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            { propertyName: 'dealstage', operator: 'EQ', value: 'closedwon' },
            { propertyName: 'hs_lastmodifieddate', operator: 'GTE', value: since },
          ],
        },
      ],
      properties: ['dealname', 'amount', 'dealstage', 'closedate'],
      limit: 100,
    }),
  });

  return response.results || [];
}

async function getContactsForDeal(dealId) {
  try {
    const response = await hubspotRequest(
      `/crm/v3/objects/deals/${dealId}/associations/contacts`
    );

    const contacts = [];
    for (const assoc of response.results || []) {
      try {
        const contact = await hubspotRequest(
          `/crm/v3/objects/contacts/${assoc.id}?properties=firstname,lastname,email`
        );
        if (contact.properties.email) {
          contacts.push({
            id: contact.id,
            email: contact.properties.email,
            name: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim(),
          });
        }
      } catch {
        // Skip
      }
    }
    return contacts;
  } catch {
    return [];
  }
}

async function importNewDeals(state) {
  let newDeals = 0;
  let newContacts = 0;

  try {
    const deals = await findNewDeals(state.lastDealCheck);
    log(`  Gefundene Deals: ${deals.length}`);

    for (const deal of deals) {
      const dealId = deal.id;
      const dealName = deal.properties.dealname || `Deal ${dealId}`;
      const dealValue = parseFloat(deal.properties.amount || '0');

      const existing = await pool.query(
        'SELECT 1 FROM deal_contacts WHERE hubspot_deal_id = $1 LIMIT 1',
        [dealId]
      );
      if (existing.rows.length > 0) continue;

      const contacts = await getContactsForDeal(dealId);
      for (const contact of contacts) {
        try {
          await pool.query(
            `INSERT INTO deal_contacts
             (hubspot_deal_id, deal_name, deal_value, contact_email, contact_name, source, created_at)
             VALUES ($1, $2, $3, $4, $5, 'auto_commission_service', NOW())
             ON CONFLICT (hubspot_deal_id, contact_email) DO NOTHING`,
            [dealId, dealName, dealValue, contact.email, contact.name]
          );
          newContacts++;
        } catch {
          // Skip
        }
      }

      if (contacts.length > 0) {
        newDeals++;
        log(`  ✓ ${dealName}: ${contacts.length} Kontakte`);
      }
    }
  } catch (error) {
    log(`  ✗ Fehler: ${error.message}`);
  }

  return { newDeals, newContacts };
}

// =============================================================================
// PHASE 2: EMAIL SENDER MIT STRIPE
// =============================================================================

async function checkMailEngine() {
  try {
    const res = await fetch(`${MAIL_ENGINE_URL}/api/send`);
    const data = await res.json();
    return data.status === 'ready';
  } catch {
    return false;
  }
}

function generateEmailTemplate(contact, commission, paymentUrl) {
  const dealValue = parseFloat(contact.deal_value) || 0;
  const contactName = contact.contact_name || 'Geschätzter Partner';
  const dealName = contact.deal_name || 'Deal';

  const paymentButton = paymentUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${paymentUrl}"
         style="display: inline-block;
                background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
                color: #000;
                font-size: 18px;
                font-weight: bold;
                padding: 18px 40px;
                text-decoration: none;
                border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0,255,136,0.4);
                transition: all 0.3s ease;">
        💳 JETZT BEZAHLEN: €${commission.toLocaleString('de-DE')}
      </a>
    </div>
    <p style="color: #888; font-size: 12px; text-align: center; margin-top: 10px;">
      Sichere Zahlung via Stripe • Kreditkarte, SEPA, Apple Pay, Google Pay
    </p>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif;">
  <div style="background: linear-gradient(135deg, #0a0a12 0%, #1a1a2e 50%, #0f0f1a 100%); padding: 40px 20px; min-height: 100%;">
    <div style="max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%); padding: 30px; text-align: center;">
        <h1 style="margin: 0; color: #000; font-size: 28px; font-weight: 800; letter-spacing: 2px;">
          🎉 DEAL GEWONNEN!
        </h1>
      </div>

      <!-- Content -->
      <div style="padding: 40px 30px;">
        <p style="color: #fff; font-size: 18px; margin-bottom: 30px;">
          Hallo <strong>${contactName}</strong>,
        </p>

        <p style="color: #ccc; font-size: 16px; line-height: 1.6;">
          Herzlichen Glückwunsch! Der folgende Deal wurde erfolgreich abgeschlossen:
        </p>

        <!-- Deal Card -->
        <div style="background: rgba(0,255,136,0.08); border: 1px solid rgba(0,255,136,0.3); border-radius: 12px; padding: 25px; margin: 25px 0;">
          <h2 style="color: #00ff88; margin: 0 0 20px 0; font-size: 22px;">
            ${dealName}
          </h2>
          <table style="width: 100%; color: #fff;">
            <tr>
              <td style="padding: 8px 0; color: #888;">Deal-Wert:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">€${dealValue.toLocaleString('de-DE')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #888;">Provisions-Rate:</td>
              <td style="padding: 8px 0; text-align: right;">3,5%</td>
            </tr>
            <tr style="border-top: 1px solid rgba(255,255,255,0.1);">
              <td style="padding: 15px 0 8px 0; color: #00ff88; font-size: 18px;">Ihre Provision:</td>
              <td style="padding: 15px 0 8px 0; text-align: right; color: #00ff88; font-size: 24px; font-weight: bold;">€${commission.toLocaleString('de-DE')}</td>
            </tr>
          </table>
        </div>

        ${paymentButton}

        <!-- Elite Badge -->
        <div style="text-align: center; margin: 40px 0 20px 0;">
          <div style="display: inline-block; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 12px 30px; border-radius: 25px;">
            <span style="color: #000; font-size: 14px; font-weight: bold; letter-spacing: 1px;">
              ⭐ GOLD ELITE PARTNER ⭐
            </span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="background: rgba(0,0,0,0.3); padding: 25px 30px; border-top: 1px solid rgba(255,255,255,0.1);">
        <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">
          Bauherren-Pass | Enterprise Universe<br>
          Bei Fragen kontaktieren Sie uns jederzeit
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `;
}

async function sendEmail(contact) {
  const dealValue = parseFloat(contact.deal_value) || 0;
  const commission = Math.round(dealValue * 0.035 * 100) / 100;

  // Erstelle Stripe Payment Link
  let paymentUrl = null;
  try {
    paymentUrl = await createStripePaymentLink(contact, commission);
    if (paymentUrl) {
      log(`  💳 Payment Link erstellt: €${commission}`);
    }
  } catch (err) {
    log(`  ⚠️ Payment Link fehlgeschlagen: ${err.message}`);
  }

  const htmlContent = generateEmailTemplate(contact, commission, paymentUrl);

  try {
    const res = await fetch(`${MAIL_ENGINE_URL}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: contact.contact_email,
        subject: `🎉 Deal gewonnen: ${contact.deal_name || 'Deal'} - Ihre Provision: €${commission.toLocaleString('de-DE')}`,
        html: htmlContent,
        text: `Deal gewonnen: ${contact.deal_name}\nWert: €${dealValue}\nProvision: €${commission}\n\nZahlung: ${paymentUrl || 'Link folgt'}`,
        source: 'auto_commission_service',
        external_id: `auto_${contact.id}`,
      }),
    });

    const data = await res.json();

    // Speichere Payment URL in DB falls erfolgreich
    if (data.success && paymentUrl) {
      await pool.query(
        `UPDATE deal_contacts SET notes = $2 WHERE id = $1`,
        [contact.id, `stripe_payment_url:${paymentUrl}`]
      );
    }

    return { success: data.success === true, error: data.error, paymentUrl };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function sendPendingEmails() {
  log('📧 Phase 2: Sende E-Mails mit Stripe Payment Links...');

  if (!(await checkMailEngine())) {
    log('  ✗ Mail-Engine offline - überspringe');
    return { sent: 0, failed: 0, skipped: true };
  }

  const rateLimitCheck = await pool.query(
    `SELECT COUNT(*) as count FROM deal_contacts
     WHERE last_send_status = 'failed'
     AND last_send_error LIKE '%R6%more than 50 failed%'
     AND updated_at > NOW() - INTERVAL '45 minutes'`
  );

  if (parseInt(rateLimitCheck.rows[0].count) > 0) {
    log('  ⏳ Mail-Server Rate-Limit aktiv (R6) - warte auf Cooldown');
    return { sent: 0, failed: 0, skipped: true, rateLimited: true };
  }

  let sent = 0;
  let failed = 0;

  const result = await pool.query(
    `SELECT * FROM deal_contacts
     WHERE email_sent_at IS NULL
     AND (last_send_status IS NULL OR last_send_status != 'failed' OR last_send_error IS NULL
          OR updated_at < NOW() - INTERVAL '1 hour')
     ORDER BY created_at ASC
     LIMIT $1`,
    [EMAILS_PER_RUN]
  );

  log(`  Ausstehende E-Mails: ${result.rows.length}`);

  for (const contact of result.rows) {
    const sendResult = await sendEmail(contact);

    if (sendResult.success) {
      await pool.query(
        `UPDATE deal_contacts
         SET email_sent_at = NOW(),
             email_sent_count = COALESCE(email_sent_count, 0) + 1,
             last_send_status = 'sent',
             last_send_error = NULL
         WHERE id = $1`,
        [contact.id]
      );
      sent++;
      log(`  ✓ ${contact.contact_email} ${sendResult.paymentUrl ? '💳' : ''}`);
    } else {
      await pool.query(
        `UPDATE deal_contacts
         SET last_send_status = 'failed',
             last_send_error = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [contact.id, sendResult.error]
      );
      failed++;
      log(`  ✗ ${contact.contact_email}: ${sendResult.error}`);

      if (sendResult.error && sendResult.error.includes('R6')) {
        log('  ⛔ Rate-Limit erkannt - breche ab');
        return { sent, failed, rateLimitAborted: true };
      }
    }

    await new Promise((r) => setTimeout(r, DELAY_BETWEEN_EMAILS_MS));
  }

  return { sent, failed };
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  log('═'.repeat(60));
  log('AUTO-COMMISSION SERVICE - Mit Stripe Payment Links');
  log('═'.repeat(60));

  const state = loadState();
  const runStats = {
    startTime: new Date().toISOString(),
    newDeals: 0,
    newContacts: 0,
    emailsSent: 0,
    emailsFailed: 0,
  };

  try {
    const importResult = await importNewDeals(state);
    runStats.newDeals = importResult.newDeals;
    runStats.newContacts = importResult.newContacts;

    const emailResult = await sendPendingEmails();
    runStats.emailsSent = emailResult.sent;
    runStats.emailsFailed = emailResult.failed;

    state.lastDealCheck = new Date().toISOString();
    state.totalDealsFound += runStats.newDeals;
    state.totalContactsImported += runStats.newContacts;
    state.totalEmailsSent += runStats.emailsSent;

    state.runs = [
      { ...runStats, endTime: new Date().toISOString() },
      ...state.runs.slice(0, 99),
    ];

    saveState(state);

  } catch (error) {
    log(`FEHLER: ${error.message}`);
  }

  log('─'.repeat(60));
  log(`Neue Deals:    ${runStats.newDeals}`);
  log(`Neue Kontakte: ${runStats.newContacts}`);
  log(`E-Mails gesendet: ${runStats.emailsSent}`);
  log(`E-Mails fehlgeschlagen: ${runStats.emailsFailed}`);
  log('═'.repeat(60));

  await pool.end();
}

main().catch(console.error);
