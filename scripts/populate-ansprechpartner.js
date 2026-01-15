#!/usr/bin/env node
/**
 * 神 ANSPRECHPARTNER POPULATOR
 * Extrahiert Kontaktnamen aus Deal-Description und speichert in Custom Property
 *
 * Usage: node populate-ansprechpartner.js [--dry-run] [--high-speed]
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const HUBSPOT_TOKEN = process.env.HUBSPOT_API_KEY || process.env.HUBSPOT_ACCESS_TOKEN;
const BATCH_SIZE = 100;
const DRY_RUN = process.argv.includes('--dry-run');
const HIGH_SPEED = process.argv.includes('--high-speed');
const DELAY = HIGH_SPEED ? 50 : 150;

let stats = {
    processed: 0,
    updated: 0,
    noContact: 0,
    alreadySet: 0,
    errors: 0
};

async function hubspotRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
            'Content-Type': 'application/json'
        }
    };

    if (body) options.body = JSON.stringify(body);

    for (let attempt = 0; attempt < 5; attempt++) {
        const response = await fetch(`https://api.hubapi.com${endpoint}`, options);

        if (response.status === 429) {
            console.log('⏳ Rate limit - waiting 10s...');
            await new Promise(r => setTimeout(r, 10000));
            continue;
        }

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`HubSpot ${response.status}: ${error}`);
        }

        return response.json();
    }
    throw new Error('Max retries exceeded');
}

function extractContact(description) {
    if (!description) return null;
    const match = description.match(/Contact:\s*([^|]+)/i);
    return match ? match[1].trim() : null;
}

async function getDeals(after = null) {
    const body = {
        filterGroups: [{}],
        properties: ['dealname', 'description', 'ansprechpartner'],
        limit: BATCH_SIZE
    };
    if (after) body.after = after;
    return hubspotRequest('/crm/v3/objects/deals/search', 'POST', body);
}

async function updateDeal(dealId, ansprechpartner) {
    if (DRY_RUN) return true;

    await hubspotRequest(`/crm/v3/objects/deals/${dealId}`, 'PATCH', {
        properties: { ansprechpartner }
    });
    return true;
}

async function processBatch(deals) {
    for (const deal of deals) {
        stats.processed++;

        // Skip if already set
        if (deal.properties.ansprechpartner) {
            stats.alreadySet++;
            continue;
        }

        // Extract contact from description
        const contact = extractContact(deal.properties.description);
        if (!contact) {
            stats.noContact++;
            continue;
        }

        try {
            await updateDeal(deal.id, contact);
            stats.updated++;
        } catch (error) {
            stats.errors++;
            if (stats.errors < 10) {
                console.error(`  ✗ ${deal.id}: ${error.message}`);
            }
        }

        await new Promise(r => setTimeout(r, DELAY));
    }
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('神 ANSPRECHPARTNER POPULATOR');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}${HIGH_SPEED ? ' ⚡ HIGH SPEED' : ''}`);
    console.log('');

    if (!HUBSPOT_TOKEN) {
        console.error('Error: HUBSPOT_ACCESS_TOKEN not set');
        process.exit(1);
    }

    let after = null;
    let hasMore = true;
    const startTime = Date.now();

    while (hasMore) {
        const response = await getDeals(after);
        const deals = response.results || [];

        if (deals.length === 0) break;

        await processBatch(deals);

        // Progress every 1000
        if (stats.processed % 1000 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
            const rate = Math.round(stats.processed / (Date.now() - startTime) * 1000 * 60);
            console.log(`📊 ${stats.processed.toLocaleString()} | ✓${stats.updated.toLocaleString()} | ⚡${stats.alreadySet.toLocaleString()} | ∅${stats.noContact.toLocaleString()} | ${elapsed}min | ${rate}/min`);
        }

        after = response.paging?.next?.after;
        hasMore = !!after;

        // Memory cleanup
        if (stats.processed % 50000 === 0 && global.gc) global.gc();
    }

    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Verarbeitet:      ${stats.processed.toLocaleString()}`);
    console.log(`Aktualisiert:     ${stats.updated.toLocaleString()}`);
    console.log(`Bereits gesetzt:  ${stats.alreadySet.toLocaleString()}`);
    console.log(`Kein Kontakt:     ${stats.noContact.toLocaleString()}`);
    console.log(`Fehler:           ${stats.errors}`);
    console.log(`Zeit:             ${totalTime} Minuten`);
    console.log(`Mode:             ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
}

process.on('uncaughtException', (e) => { console.error('Fatal:', e); process.exit(1); });
process.on('unhandledRejection', (e) => { console.error('Unhandled:', e); process.exit(1); });

main().catch(console.error);
