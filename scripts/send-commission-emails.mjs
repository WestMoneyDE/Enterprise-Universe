#!/usr/bin/env node
// =============================================================================
// KOMMISSIONS-EMAIL BATCH SENDER
// =============================================================================
// Sendet alle ausstehenden Won-Deal E-Mails mit Rate-Limiting
// Rate Limit: 30/min = 1 alle 2 Sekunden

import pg from 'pg';

const { Pool } = pg;

const MAIL_ENGINE_URL = process.env.MAIL_ENGINE_URL || 'http://localhost:3006';
const BATCH_SIZE = 10;
const DELAY_BETWEEN_EMAILS_MS = 6000; // 6s = 10/min (ultra safe)
const DELAY_BETWEEN_BATCHES_MS = 60000; // 60s pause between batches

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'westmoney_os',
  user: 'westmoney',
  password: 'westmoney',
});

// Statistics
const stats = {
  total: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
  startTime: new Date(),
};

async function checkMailEngine() {
  try {
    const res = await fetch(`${MAIL_ENGINE_URL}/api/send`);
    const data = await res.json();
    return data.status === 'ready';
  } catch {
    return false;
  }
}

async function sendEmail(contact) {
  const dealValue = parseFloat(contact.deal_value) || 0;
  const commission = Math.round(dealValue * 0.035 * 100) / 100;

  try {
    const res = await fetch(`${MAIL_ENGINE_URL}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: contact.contact_email,
        subject: `Herzlichen Glückwunsch! Deal gewonnen: ${contact.deal_name || 'Deal'}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%); color: #fff;">
            <div style="max-width: 600px; margin: 0 auto;">
              <h1 style="color: #00ff88; text-align: center;">DEAL GEWONNEN!</h1>

              <div style="background: rgba(0,255,136,0.1); border: 1px solid #00ff88; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h2 style="color: #fff; margin-top: 0;">${contact.deal_name || 'Deal'}</h2>
                <p><strong>Kontakt:</strong> ${contact.contact_name || 'Geschätzter Partner'}</p>
                <p><strong>Deal-Wert:</strong> €${dealValue.toLocaleString('de-DE')}</p>
                <p style="color: #00ff88; font-size: 24px;"><strong>Ihre Provision:</strong> €${commission.toLocaleString('de-DE')}</p>
              </div>

              <div style="text-align: center; padding: 20px;">
                <span style="background: linear-gradient(90deg, #FFD700, #FFA500); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 18px; font-weight: bold;">
                  GOLD ELITE
                </span>
              </div>

              <hr style="border-color: #333;">
              <p style="color: #666; font-size: 12px; text-align: center;">
                Bauherren-Pass | Enterprise Universe
              </p>
            </div>
          </div>
        `,
        text: `Deal gewonnen: ${contact.deal_name}\nWert: €${dealValue}\nProvision: €${commission}`,
        source: 'bauherren_pass_batch',
        external_id: `batch_${contact.id}`,
      }),
    });

    const data = await res.json();
    return { success: data.success === true, messageId: data.messageId, error: data.error };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function updateContactStatus(id, status, error = null) {
  await pool.query(
    `UPDATE deal_contacts
     SET email_sent_at = CASE WHEN $2 = 'sent' THEN NOW() ELSE email_sent_at END,
         email_sent_count = CASE WHEN $2 = 'sent' THEN COALESCE(email_sent_count, 0) + 1 ELSE email_sent_count END,
         last_send_status = $2,
         last_send_error = $3
     WHERE id = $1`,
    [id, status, error]
  );
}

async function getPendingContacts(limit) {
  const result = await pool.query(
    `SELECT * FROM deal_contacts
     WHERE email_sent_at IS NULL
     ORDER BY id
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

async function getTotalPending() {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM deal_contacts WHERE email_sent_at IS NULL`
  );
  return parseInt(result.rows[0].count);
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
}

function printProgress() {
  const elapsed = Date.now() - stats.startTime.getTime();
  const rate = stats.sent / (elapsed / 1000 / 60);
  const remaining = stats.total - stats.sent - stats.failed;
  const eta = remaining / rate;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`FORTSCHRITT: ${stats.sent}/${stats.total} gesendet (${((stats.sent/stats.total)*100).toFixed(1)}%)`);
  console.log(`Fehlgeschlagen: ${stats.failed} | Übersprungen: ${stats.skipped}`);
  console.log(`Rate: ${rate.toFixed(1)}/min | Verbleibend: ~${formatDuration(eta * 60 * 1000)}`);
  console.log(`${'═'.repeat(60)}\n`);
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       KOMMISSIONS-EMAIL BATCH SENDER v1.0                   ║');
  console.log('║       Bauherren-Pass | Enterprise Universe                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Check mail engine
  console.log('Prüfe Mail-Engine...');
  const engineReady = await checkMailEngine();
  if (!engineReady) {
    console.error('FEHLER: Mail-Engine ist nicht erreichbar!');
    process.exit(1);
  }
  console.log('✓ Mail-Engine bereit\n');

  // Get total pending
  stats.total = await getTotalPending();
  console.log(`Ausstehende E-Mails: ${stats.total}\n`);

  if (stats.total === 0) {
    console.log('Keine ausstehenden E-Mails gefunden.');
    process.exit(0);
  }

  // Confirm
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const noConfirm = args.includes('--yes') || args.includes('-y');

  if (dryRun) {
    console.log('DRY-RUN MODUS - Keine E-Mails werden gesendet\n');
  }

  if (!noConfirm && !dryRun) {
    console.log(`WARNUNG: ${stats.total} E-Mails werden gesendet!`);
    console.log('Geschätzte Zeit: ~' + formatDuration(stats.total * DELAY_BETWEEN_EMAILS_MS));
    console.log('\nStarte mit --dry-run zum Testen oder --yes zum Bestätigen');
    process.exit(0);
  }

  // Process in batches
  let batchNumber = 0;
  while (true) {
    const contacts = await getPendingContacts(BATCH_SIZE);
    if (contacts.length === 0) break;

    batchNumber++;
    console.log(`\n▶ Batch ${batchNumber} (${contacts.length} E-Mails)`);

    for (const contact of contacts) {
      if (dryRun) {
        console.log(`  [DRY] ${contact.contact_email} - ${contact.deal_name}`);
        stats.sent++;
      } else {
        const result = await sendEmail(contact);

        if (result.success) {
          await updateContactStatus(contact.id, 'sent');
          stats.sent++;
          console.log(`  ✓ ${contact.contact_email}`);
        } else {
          await updateContactStatus(contact.id, 'failed', result.error);
          stats.failed++;
          console.log(`  ✗ ${contact.contact_email} - ${result.error}`);
        }

        // Rate limiting delay
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_EMAILS_MS));
      }
    }

    printProgress();

    if (!dryRun) {
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES_MS));
    }
  }

  // Final summary
  const totalTime = Date.now() - stats.startTime.getTime();
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    ZUSAMMENFASSUNG                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`Gesendet:       ${stats.sent}`);
  console.log(`Fehlgeschlagen: ${stats.failed}`);
  console.log(`Gesamtzeit:     ${formatDuration(totalTime)}`);
  console.log(`Rate:           ${(stats.sent / (totalTime / 1000 / 60)).toFixed(1)}/min\n`);

  await pool.end();
}

main().catch(console.error);
