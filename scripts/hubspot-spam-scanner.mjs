#!/usr/bin/env node
// =============================================================================
// HUBSPOT SPAM SCANNER - Full Scan for 15M+ Contacts
// =============================================================================
// Scans all HubSpot contacts in batches, identifies spam, and logs results
// Run: node scripts/hubspot-spam-scanner.mjs
// Or via PM2: pm2 start scripts/ecosystem.spam-scanner.config.cjs

import fs from 'fs/promises';
import path from 'path';
import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

// =============================================================================
// CONFIGURATION
// =============================================================================

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const BATCH_SIZE = 100; // HubSpot API max per request
const RATE_LIMIT_DELAY = 150; // ms between requests (avoid 429)
const PROGRESS_INTERVAL = 1000; // Log progress every N contacts
const OUTPUT_DIR = '/home/administrator/nexus-command-center/logs/spam-scanner';
const ENABLE_MX_CHECK = true; // Enable DNS MX verification
const MX_CACHE_SIZE = 50000; // Cache MX results for domains

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

// Department/Role emails - NOT individual people
const ROLE_EMAIL_PATTERNS = [
  /^info$/i, /^kontakt$/i, /^contact$/i, /^service$/i, /^support$/i,
  /^redaktion$/i, /^editor$/i, /^press$/i, /^presse$/i,
  /^sales$/i, /^vertrieb$/i, /^marketing$/i, /^hr$/i, /^jobs$/i,
  /^office$/i, /^team$/i, /^hello$/i, /^hallo$/i, /^mail$/i,
  /^admin$/i, /^webmaster$/i, /^postmaster$/i,
  /^buchhaltung$/i, /^accounting$/i, /^billing$/i, /^invoices?$/i,
  /^empfang$/i, /^reception$/i, /^zentrale$/i,
  /^bewerbung$/i, /^career$/i, /^karriere$/i,
  /^datenschutz$/i, /^privacy$/i, /^gdpr$/i, /^dsgvo$/i,
  /^feedback$/i, /^newsletter$/i, /^subscribe$/i,
];

// System/Automated email patterns
const SYSTEM_EMAIL_PATTERNS = [
  /^noreply/i, /^no-reply/i, /^no_reply/i, /^donotreply/i,
  /^bounce/i, /^mailer-daemon/i, /^postmaster/i,
  /^receipts?\+/i, /^notifications?\+/i, // Plus addressing for receipts
  /\+acct_/i, // Stripe-style plus addressing
  /^system$/i, /^automated$/i, /^auto$/i,
  /^daemon$/i, /^robot$/i, /^bot$/i,
  /station\d+/i, // Station emails like station3213@
  /^alert/i, /^notify/i, /^notification/i,
];

// Generic spam patterns
const SPAM_PATTERNS = [
  /^[a-z0-9]{25,}$/i,           // Very long random strings (increased from 20)
  /^[0-9]{8,}$/,                 // Numbers only (8+)
  /^(test|dummy|fake|spam|asdf|qwerty)[0-9]*$/i,
  /^[a-z]{2,3}[0-9]{6,}[a-z]{2,3}$/i, // Bot-like patterns
  /^user[0-9]{5,}$/i,            // user12345...
  /^contact[0-9]{5,}$/i,         // contact12345...
  /^[a-z]{1,2}[0-9]{8,}$/i,      // a12345678...
  /^kunde[0-9]+$/i,              // kunde12345...
  /^customer[0-9]+$/i,           // customer12345...
];

// =============================================================================
// MX VERIFICATION (DNS Check)
// =============================================================================

// Cache for MX lookup results (domain -> hasValidMx)
const mxCache = new Map();
let mxChecksTotal = 0;
let mxChecksFailed = 0;

async function checkMx(domain) {
  // Check cache first
  if (mxCache.has(domain)) {
    return mxCache.get(domain);
  }

  // Limit cache size
  if (mxCache.size >= MX_CACHE_SIZE) {
    // Remove oldest entries (first 1000)
    const keys = [...mxCache.keys()].slice(0, 1000);
    keys.forEach(k => mxCache.delete(k));
  }

  mxChecksTotal++;

  try {
    const records = await resolveMx(domain);
    const hasValidMx = records && records.length > 0;
    mxCache.set(domain, { valid: hasValidMx, records: records?.map(r => r.exchange) || [] });
    return mxCache.get(domain);
  } catch (error) {
    mxChecksFailed++;
    // DNS error - domain likely doesn't exist
    const errorCode = error.code || 'UNKNOWN';
    mxCache.set(domain, { valid: false, error: errorCode });
    return mxCache.get(domain);
  }
}

// =============================================================================
// SPAM ANALYSIS
// =============================================================================

async function analyzeEmail(email, contact = null) {
  if (!email || typeof email !== 'string') {
    return { isSpam: true, reasons: ['Missing/invalid email'], score: 100, category: 'invalid', mxValid: null };
  }

  const normalized = email.toLowerCase().trim();
  const atIndex = normalized.indexOf('@');

  if (atIndex === -1) {
    return { isSpam: true, reasons: ['Invalid email format'], score: 100, category: 'invalid', mxValid: null };
  }

  const localPart = normalized.substring(0, atIndex);
  const domain = normalized.substring(atIndex + 1);

  if (!localPart || !domain) {
    return { isSpam: true, reasons: ['Invalid email format'], score: 100, category: 'invalid', mxValid: null };
  }

  const reasons = [];
  let score = 0;
  let category = 'clean';
  let mxValid = null;

  // 1. Check disposable domain (high confidence spam)
  if (DISPOSABLE_DOMAINS.has(domain)) {
    reasons.push('Disposable domain');
    score += 60;
    category = 'disposable';
  }

  // 2. Check system/automated emails (NOT real contacts)
  for (const pattern of SYSTEM_EMAIL_PATTERNS) {
    if (pattern.test(localPart) || pattern.test(normalized)) {
      reasons.push('System/automated email');
      score += 55;
      category = 'system';
      break;
    }
  }

  // 3. Check role/department emails (NOT individual people)
  for (const pattern of ROLE_EMAIL_PATTERNS) {
    if (pattern.test(localPart)) {
      reasons.push('Role/department email (not a person)');
      score += 45;
      category = 'role';
      break;
    }
  }

  // 4. Check spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(localPart)) {
      reasons.push('Spam pattern detected');
      score += 50;
      category = 'spam';
      break;
    }
  }

  // 5. Check test/demo patterns
  if (/^test|^demo|^fake|^sample|^beispiel/i.test(localPart)) {
    reasons.push('Test/demo email');
    score += 45;
    category = 'test';
  }

  // 6. Check for excessive numbers in local part
  const digits = (localPart.match(/\d/g) || []).length;
  if (localPart.length > 5 && digits > localPart.length * 0.6) {
    reasons.push('Too many numbers');
    score += 30;
  }

  // 7. Check for keyboard patterns
  if (/qwerty|asdfgh|zxcvbn|123456|abcdef/i.test(localPart)) {
    reasons.push('Keyboard pattern');
    score += 40;
    category = 'spam';
  }

  // 8. Check contact data quality (if contact provided)
  if (contact) {
    const firstName = contact.properties?.firstname;
    const lastName = contact.properties?.lastname;

    // Check for missing name
    if (!firstName && !lastName) {
      reasons.push('No name provided');
      score += 20;
      if (category === 'clean') category = 'incomplete';
    }

    // Check for company/weird data in name field
    if (firstName) {
      if (/\||\@|gmbh|ag\b|ltd|inc|llc/i.test(firstName)) {
        reasons.push('Company name in firstname field');
        score += 25;
        if (category === 'clean') category = 'bad_data';
      }
      // Check for full name in firstname (likely auto-imported)
      if (/^[A-Za-zäöüÄÖÜß]+,\s*[A-Za-zäöüÄÖÜß]+/.test(firstName)) {
        reasons.push('Full name in wrong format');
        score += 15;
        if (category === 'clean') category = 'bad_data';
      }
    }
  }

  // 9. MX Record verification (DNS check)
  if (ENABLE_MX_CHECK && score < 50) {
    // Only check MX for emails not already flagged as high-confidence spam
    const mxResult = await checkMx(domain);
    mxValid = mxResult.valid;

    if (!mxResult.valid) {
      reasons.push(`Invalid domain (${mxResult.error || 'no MX records'})`);
      score += 60;
      category = 'invalid_domain';
    }
  }

  return {
    isSpam: reasons.length > 0,
    category,
    reasons,
    score: Math.min(score, 100),
    mxValid,
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
  const categoryStats = new Map();

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
          const analysis = await analyzeEmail(email, contact);

          if (analysis.isSpam) {
            totalSpam++;

            // Track category stats
            categoryStats.set(analysis.category, (categoryStats.get(analysis.category) || 0) + 1);

            const spamEntry = {
              id: contact.id,
              email,
              firstName: contact.properties?.firstname || '',
              lastName: contact.properties?.lastname || '',
              company: contact.properties?.company || '',
              category: analysis.category,
              reasons: analysis.reasons,
              score: analysis.score,
              mxValid: analysis.mxValid,
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

  // MX Verification Stats
  if (ENABLE_MX_CHECK) {
    console.log('\n  MX VERIFICATION:');
    console.log(`    Domains Checked:      ${formatNumber(mxChecksTotal)}`);
    console.log(`    Invalid MX:           ${formatNumber(mxChecksFailed)} (${((mxChecksFailed / mxChecksTotal) * 100).toFixed(1)}%)`);
    console.log(`    Cache Size:           ${formatNumber(mxCache.size)} domains`);
  }

  // Category breakdown
  const categories = [...categoryStats.entries()]
    .sort((a, b) => b[1] - a[1]);

  if (categories.length > 0) {
    console.log('\n  SPAM CATEGORIES:');
    for (const [cat, count] of categories) {
      const pct = ((count / totalSpam) * 100).toFixed(1);
      console.log(`    ${cat.padEnd(15)}: ${formatNumber(count).padStart(10)} (${pct}%)`);
    }
  }

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
    categories: Object.fromEntries(categories),
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
