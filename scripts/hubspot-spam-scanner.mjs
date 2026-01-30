#!/usr/bin/env node
// =============================================================================
// HUBSPOT SPAM SCANNER - Full Scan for 15M+ Contacts
// =============================================================================
// Scans all HubSpot contacts in batches, identifies spam, and logs results
// Run: node scripts/hubspot-spam-scanner.mjs
// Or via PM2: pm2 start scripts/ecosystem.spam-scanner.config.cjs

import fs from 'fs/promises';
import path from 'path';

// =============================================================================
// CONFIGURATION
// =============================================================================

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const BATCH_SIZE = 100; // HubSpot API max per request
const RATE_LIMIT_DELAY = 150; // ms between requests (avoid 429)
const PROGRESS_INTERVAL = 1000; // Log progress every N contacts
const OUTPUT_DIR = '/home/administrator/nexus-command-center/logs/spam-scanner';

if (!HUBSPOT_ACCESS_TOKEN) {
  console.error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  process.exit(1);
}

// =============================================================================
// SPAM DETECTION PATTERNS
// =============================================================================

const DISPOSABLE_DOMAINS = new Set([
  "tempmail.com", "guerrillamail.com", "10minutemail.com", "mailinator.com",
  "throwaway.email", "temp-mail.org", "fakeinbox.com", "trash-mail.com",
  "wegwerfmail.de", "einwegmail.de", "spamfree24.de", "muellmail.de",
  "temp.email", "tempmailo.com", "tempmail.ninja", "burnermail.io",
  "maildrop.cc", "mailsac.com", "mintemail.com", "mytemp.email",
  "trashmail.com", "trashmail.me", "trashmail.net", "yopmail.com",
  "sharklasers.com", "guerrillamailblock.com", "pokemail.net",
  "spam4.me", "grr.la", "dispostable.com", "mohmal.com",
  "getnada.com", "tempail.com", "emailondeck.com", "fakemailgenerator.com",
]);

const SPAM_PATTERNS = [
  /^[a-z0-9]{20,}$/i,           // Very long random strings
  /^[0-9]{8,}$/,                 // Numbers only (8+)
  /^(test|dummy|fake|spam|noreply|no-reply|asdf|qwerty)[0-9]*$/i,
  /^[a-z]{2,3}[0-9]{6,}[a-z]{2,3}$/i, // Bot-like patterns
  /^user[0-9]{5,}$/i,            // user12345...
  /^contact[0-9]{5,}$/i,         // contact12345...
  /^[a-z]{1,2}[0-9]{8,}$/i,      // a12345678...
];

// =============================================================================
// SPAM ANALYSIS
// =============================================================================

function analyzeEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isSpam: true, reasons: ['Missing/invalid email'], score: 100 };
  }

  const normalized = email.toLowerCase().trim();
  const atIndex = normalized.indexOf('@');

  if (atIndex === -1) {
    return { isSpam: true, reasons: ['Invalid email format'], score: 100 };
  }

  const localPart = normalized.substring(0, atIndex);
  const domain = normalized.substring(atIndex + 1);

  if (!localPart || !domain) {
    return { isSpam: true, reasons: ['Invalid email format'], score: 100 };
  }

  const reasons = [];
  let score = 0;

  // Check disposable domain
  if (DISPOSABLE_DOMAINS.has(domain)) {
    reasons.push('Disposable domain');
    score += 50;
  }

  // Check spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(localPart)) {
      reasons.push('Spam pattern detected');
      score += 40;
      break;
    }
  }

  // Check test/demo patterns
  if (/test|demo|fake|sample|beispiel/i.test(normalized)) {
    reasons.push('Test/demo email');
    score += 35;
  }

  // Check for excessive numbers in local part
  const digits = (localPart.match(/\d/g) || []).length;
  if (localPart.length > 5 && digits > localPart.length * 0.5) {
    reasons.push('Too many numbers');
    score += 25;
  }

  // Check for random-looking strings (no vowel pairs = likely random)
  if (/^[a-z0-9]{15,}$/.test(localPart) && !/[aeiou]{2}/i.test(localPart)) {
    reasons.push('Random character sequence');
    score += 30;
  }

  // Check for keyboard patterns
  if (/qwerty|asdfgh|zxcvbn|123456|abcdef/i.test(localPart)) {
    reasons.push('Keyboard pattern');
    score += 35;
  }

  return {
    isSpam: reasons.length > 0,
    reasons,
    score: Math.min(score, 100),
  };
}

// =============================================================================
// HUBSPOT API
// =============================================================================

async function fetchContacts(after = undefined) {
  const url = new URL('https://api.hubapi.com/crm/v3/objects/contacts');
  url.searchParams.set('limit', String(BATCH_SIZE));
  url.searchParams.set('properties', 'email,firstname,lastname,company,createdate');
  if (after) url.searchParams.set('after', after);

  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 429) {
    // Rate limited - wait and retry
    console.log('  Rate limited, waiting 10s...');
    await sleep(10000);
    return fetchContacts(after);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return {
    contacts: data.results || [],
    nextAfter: data.paging?.next?.after,
    total: data.total,
  };
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

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

// =============================================================================
// MAIN SCANNER
// =============================================================================

async function runFullScan() {
  const startTime = Date.now();
  const scanId = new Date().toISOString().replace(/[:.]/g, '-');

  console.log('='.repeat(60));
  console.log('  HUBSPOT SPAM SCANNER - Full Database Scan');
  console.log('='.repeat(60));
  console.log(`  Scan ID: ${scanId}`);
  console.log(`  Started: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  console.log();

  // Create output directory
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Initialize counters
  let totalScanned = 0;
  let totalSpam = 0;
  let after = undefined;
  let batchCount = 0;

  // Spam results storage
  const spamContacts = [];
  const domainStats = new Map();
  const patternStats = new Map();

  // Progress file for resumability
  const progressFile = path.join(OUTPUT_DIR, `progress-${scanId}.json`);
  const spamFile = path.join(OUTPUT_DIR, `spam-contacts-${scanId}.jsonl`);

  console.log('Scanning contacts...\n');

  try {
    while (true) {
      batchCount++;
      const { contacts, nextAfter, total } = await fetchContacts(after);

      if (contacts.length === 0) {
        console.log('\nNo more contacts to process.');
        break;
      }

      // Process batch
      for (const contact of contacts) {
        totalScanned++;
        const email = contact.properties?.email;

        if (email) {
          const analysis = analyzeEmail(email);

          if (analysis.isSpam) {
            totalSpam++;

            const spamEntry = {
              id: contact.id,
              email,
              firstName: contact.properties?.firstname || '',
              lastName: contact.properties?.lastname || '',
              company: contact.properties?.company || '',
              reasons: analysis.reasons,
              score: analysis.score,
              createdAt: contact.properties?.createdate,
            };

            spamContacts.push(spamEntry);

            // Track domain stats
            const domain = email.split('@')[1]?.toLowerCase();
            if (domain) {
              domainStats.set(domain, (domainStats.get(domain) || 0) + 1);
            }

            // Track pattern stats
            for (const reason of analysis.reasons) {
              patternStats.set(reason, (patternStats.get(reason) || 0) + 1);
            }

            // Write to JSONL file incrementally
            await fs.appendFile(spamFile, JSON.stringify(spamEntry) + '\n');
          }
        }

        // Log progress
        if (totalScanned % PROGRESS_INTERVAL === 0) {
          const elapsed = Date.now() - startTime;
          const rate = totalScanned / (elapsed / 1000);
          const spamRate = ((totalSpam / totalScanned) * 100).toFixed(2);

          process.stdout.write(
            `\r  Scanned: ${formatNumber(totalScanned)} | ` +
            `Spam: ${formatNumber(totalSpam)} (${spamRate}%) | ` +
            `Rate: ${rate.toFixed(0)}/s | ` +
            `Elapsed: ${formatDuration(elapsed)}`
          );
        }
      }

      // Save progress checkpoint every 10 batches
      if (batchCount % 10 === 0) {
        await fs.writeFile(progressFile, JSON.stringify({
          scanId,
          lastAfter: after,
          totalScanned,
          totalSpam,
          lastUpdate: new Date().toISOString(),
        }));
      }

      // Move to next page
      after = nextAfter;
      if (!after) {
        console.log('\n\nReached end of contacts.');
        break;
      }

      // Rate limiting
      await sleep(RATE_LIMIT_DELAY);
    }
  } catch (error) {
    console.error('\n\nScan error:', error.message);

    // Save progress on error for resumability
    await fs.writeFile(progressFile, JSON.stringify({
      scanId,
      lastAfter: after,
      totalScanned,
      totalSpam,
      error: error.message,
      lastUpdate: new Date().toISOString(),
    }));
  }

  // ==========================================================================
  // FINAL REPORT
  // ==========================================================================

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log('\n');
  console.log('='.repeat(60));
  console.log('  SCAN COMPLETE');
  console.log('='.repeat(60));
  console.log(`  Total Contacts Scanned: ${formatNumber(totalScanned)}`);
  console.log(`  Total Spam Found:       ${formatNumber(totalSpam)}`);
  console.log(`  Spam Rate:              ${((totalSpam / totalScanned) * 100).toFixed(2)}%`);
  console.log(`  Clean Contacts:         ${formatNumber(totalScanned - totalSpam)}`);
  console.log(`  Duration:               ${formatDuration(duration)}`);
  console.log(`  Avg Rate:               ${(totalScanned / (duration / 1000)).toFixed(0)} contacts/sec`);
  console.log('='.repeat(60));

  // Top spam domains
  const topDomains = [...domainStats.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (topDomains.length > 0) {
    console.log('\n  TOP SPAM DOMAINS:');
    for (const [domain, count] of topDomains) {
      console.log(`    ${domain}: ${formatNumber(count)}`);
    }
  }

  // Top spam patterns
  const topPatterns = [...patternStats.entries()]
    .sort((a, b) => b[1] - a[1]);

  if (topPatterns.length > 0) {
    console.log('\n  SPAM REASONS BREAKDOWN:');
    for (const [pattern, count] of topPatterns) {
      console.log(`    ${pattern}: ${formatNumber(count)}`);
    }
  }

  // Save final report
  const reportFile = path.join(OUTPUT_DIR, `report-${scanId}.json`);
  await fs.writeFile(reportFile, JSON.stringify({
    scanId,
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    durationMs: duration,
    totalScanned,
    totalSpam,
    cleanContacts: totalScanned - totalSpam,
    spamRate: ((totalSpam / totalScanned) * 100).toFixed(2) + '%',
    topSpamDomains: topDomains,
    spamReasons: topPatterns,
  }, null, 2));

  console.log('\n  OUTPUT FILES:');
  console.log(`    Report:   ${reportFile}`);
  console.log(`    Spam CSV: ${spamFile}`);
  console.log('='.repeat(60));
  console.log();

  return {
    totalScanned,
    totalSpam,
    spamRate: (totalSpam / totalScanned) * 100,
  };
}

// =============================================================================
// RUN
// =============================================================================

runFullScan()
  .then(result => {
    console.log('Scan finished successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
