#!/usr/bin/env node
// =============================================================================
// HUBSPOT SPAM DELETE - Delete identified spam contacts
// =============================================================================
// Reads spam contacts from scan results and deletes them from HubSpot
// Run: node scripts/hubspot-spam-delete.mjs <scan-id>
// Example: node scripts/hubspot-spam-delete.mjs 2026-01-30T16-14-48-480Z

import fs from 'fs/promises';
import readline from 'readline';
import { createReadStream } from 'fs';

// =============================================================================
// CONFIGURATION
// =============================================================================

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const BATCH_SIZE = 100; // HubSpot batch delete limit
const RATE_LIMIT_DELAY = 200; // ms between batches
const LOG_DIR = '/home/administrator/nexus-command-center/logs/spam-scanner';

if (!HUBSPOT_ACCESS_TOKEN) {
  console.error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  process.exit(1);
}

// =============================================================================
// HUBSPOT API
// =============================================================================

async function deleteContactsBatch(contactIds) {
  const url = 'https://api.hubapi.com/crm/v3/objects/contacts/batch/archive';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: contactIds.map(id => ({ id }))
    }),
  });

  if (res.status === 429) {
    console.log('  Rate limited, waiting 10s...');
    await sleep(10000);
    return deleteContactsBatch(contactIds);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot API error ${res.status}: ${text}`);
  }

  return true;
}

// =============================================================================
// HELPERS
// =============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatNumber(num) {
  return num.toLocaleString('de-DE');
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const forceMode = args.includes('--force') || args.includes('-f');
  const scanId = args.find(a => !a.startsWith('-'));

  if (!scanId) {
    // Find most recent scan
    const files = await fs.readdir(LOG_DIR);
    const spamFiles = files.filter(f => f.startsWith('spam-contacts-') && f.endsWith('.jsonl'));

    if (spamFiles.length === 0) {
      console.error('No spam scan results found. Run the scanner first.');
      process.exit(1);
    }

    console.log('Available scans:');
    for (const f of spamFiles.sort().reverse().slice(0, 5)) {
      const id = f.replace('spam-contacts-', '').replace('.jsonl', '');
      const stats = await fs.stat(`${LOG_DIR}/${f}`);
      console.log(`  ${id} (${formatNumber(Math.round(stats.size / 1024))} KB)`);
    }
    console.log('\nUsage: node scripts/hubspot-spam-delete.mjs <scan-id>');
    process.exit(0);
  }

  const spamFile = `${LOG_DIR}/spam-contacts-${scanId}.jsonl`;

  try {
    await fs.access(spamFile);
  } catch {
    console.error(`Spam file not found: ${spamFile}`);
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('  HUBSPOT SPAM DELETE');
  console.log('='.repeat(60));
  console.log(`  Scan ID: ${scanId}`);
  console.log(`  File: ${spamFile}`);
  console.log('='.repeat(60));
  console.log();

  // Count contacts to delete
  let totalContacts = 0;
  const categoryCount = new Map();

  const countStream = createReadStream(spamFile);
  const countRl = readline.createInterface({ input: countStream });

  for await (const line of countRl) {
    if (line.trim()) {
      totalContacts++;
      try {
        const contact = JSON.parse(line);
        categoryCount.set(contact.category, (categoryCount.get(contact.category) || 0) + 1);
      } catch {}
    }
  }

  console.log(`Found ${formatNumber(totalContacts)} spam contacts to delete:\n`);

  for (const [cat, count] of [...categoryCount.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(15)}: ${formatNumber(count)}`);
  }

  console.log();
  console.log('⚠️  WARNING: This will permanently delete these contacts from HubSpot!');
  console.log();

  // Confirm deletion (skip if --force)
  if (forceMode) {
    console.log('🔥 FORCE MODE: Skipping confirmation...\n');
  } else {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question(`Type "DELETE ${formatNumber(totalContacts)}" to confirm: `, resolve);
    });
    rl.close();

    if (answer !== `DELETE ${formatNumber(totalContacts)}`) {
      console.log('\nAborted. No contacts deleted.');
      process.exit(0);
    }
  }

  console.log('\nStarting deletion...\n');

  // Read and delete contacts in batches
  const fileStream = createReadStream(spamFile);
  const fileRl = readline.createInterface({ input: fileStream });

  let batch = [];
  let deleted = 0;
  let errors = 0;
  const startTime = Date.now();

  for await (const line of fileRl) {
    if (!line.trim()) continue;

    try {
      const contact = JSON.parse(line);
      batch.push(contact.id);

      if (batch.length >= BATCH_SIZE) {
        try {
          await deleteContactsBatch(batch);
          deleted += batch.length;

          const elapsed = (Date.now() - startTime) / 1000;
          const rate = deleted / elapsed;
          const remaining = totalContacts - deleted;
          const eta = remaining / rate;

          process.stdout.write(
            `\r  Deleted: ${formatNumber(deleted)} / ${formatNumber(totalContacts)} ` +
            `(${((deleted / totalContacts) * 100).toFixed(1)}%) | ` +
            `Rate: ${rate.toFixed(0)}/s | ` +
            `ETA: ${Math.round(eta / 60)}m`
          );
        } catch (error) {
          console.error(`\n  Error deleting batch: ${error.message}`);
          errors += batch.length;
        }

        batch = [];
        await sleep(RATE_LIMIT_DELAY);
      }
    } catch {
      // Skip invalid JSON lines
    }
  }

  // Delete remaining contacts
  if (batch.length > 0) {
    try {
      await deleteContactsBatch(batch);
      deleted += batch.length;
    } catch (error) {
      console.error(`\n  Error deleting final batch: ${error.message}`);
      errors += batch.length;
    }
  }

  const duration = (Date.now() - startTime) / 1000;

  console.log('\n');
  console.log('='.repeat(60));
  console.log('  DELETION COMPLETE');
  console.log('='.repeat(60));
  console.log(`  Total Deleted:  ${formatNumber(deleted)}`);
  console.log(`  Errors:         ${formatNumber(errors)}`);
  console.log(`  Duration:       ${Math.round(duration / 60)}m ${Math.round(duration % 60)}s`);
  console.log('='.repeat(60));

  // Save deletion report
  const reportFile = `${LOG_DIR}/deletion-report-${scanId}.json`;
  await fs.writeFile(reportFile, JSON.stringify({
    scanId,
    deletedAt: new Date().toISOString(),
    totalDeleted: deleted,
    errors,
    durationSeconds: duration,
    categories: Object.fromEntries(categoryCount),
  }, null, 2));

  console.log(`\nReport saved: ${reportFile}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
