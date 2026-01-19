#!/usr/bin/env node
/**
 * 神 HUBSPOT DEAL TEAM ASSIGNMENT
 * Weist bis zu 5 Mitarbeiter pro Deal zu + setzt Ansprechperson
 *
 * Usage: node assign-deal-team.js [--dry-run] [--batch-size=50]
 *
 * Custom Properties benötigt:
 * - mitarbeiter_1 bis mitarbeiter_5 (text)
 * - ansprechperson (text)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const HUBSPOT_TOKEN = process.env.HUBSPOT_API_KEY || process.env.HUBSPOT_ACCESS_TOKEN;
const BATCH_SIZE = parseInt(process.argv.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '50');
const DRY_RUN = process.argv.includes('--dry-run');
const HIGH_SPEED = process.argv.includes('--high-speed');
const MAX_MITARBEITER = 5;
const REQUEST_DELAY = HIGH_SPEED ? 30 : 100;
const BATCH_DELAY = HIGH_SPEED ? 100 : 500;

let stats = {
    processed: 0,
    mitarbeiterAssigned: 0,
    ansprechpersonSet: 0,
    skipped: 0,
    errors: 0
};

let owners = [];
let currentOwnerIndex = 0;

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

async function loadOwners() {
    console.log('Loading HubSpot owners (Mitarbeiter)...');
    const data = await hubspotRequest('/crm/v3/owners?limit=100');
    owners = data.results.filter(o => !o.archived);
    console.log(`Found ${owners.length} active owners`);
    return owners;
}

function getNextOwners(count) {
    // Holt bis zu `count` Mitarbeiter (Round-Robin)
    const selected = [];
    const maxCount = Math.min(count, owners.length, MAX_MITARBEITER);

    for (let i = 0; i < maxCount; i++) {
        selected.push(owners[currentOwnerIndex]);
        currentOwnerIndex = (currentOwnerIndex + 1) % owners.length;
    }
    return selected;
}

async function getDealsWithAssociations(after = null) {
    // Deals mit Kontakt-Assoziationen abrufen
    const searchBody = {
        filterGroups: [{
            filters: [{
                propertyName: 'mitarbeiter_1',
                operator: 'NOT_HAS_PROPERTY'
            }]
        }],
        properties: [
            'dealname', 'amount', 'dealstage', 'hubspot_owner_id',
            'mitarbeiter_1', 'mitarbeiter_2', 'mitarbeiter_3',
            'mitarbeiter_4', 'mitarbeiter_5', 'ansprechperson'
        ],
        limit: BATCH_SIZE
    };

    if (after) {
        searchBody.after = after;
    }

    return hubspotRequest('/crm/v3/objects/deals/search', 'POST', searchBody);
}

async function getAssociatedContact(dealId) {
    try {
        const response = await hubspotRequest(
            `/crm/v3/objects/deals/${dealId}/associations/contacts`
        );

        if (response.results && response.results.length > 0) {
            // Ersten assoziierten Kontakt holen
            const contactId = response.results[0].id;
            const contact = await hubspotRequest(
                `/crm/v3/objects/contacts/${contactId}?properties=firstname,lastname,email,company`
            );
            return contact;
        }
    } catch (error) {
        // Kein Kontakt assoziiert - kein Fehler
    }
    return null;
}

function formatOwnerName(owner) {
    const name = `${owner.firstName || ''} ${owner.lastName || ''}`.trim();
    return name || owner.email || `ID:${owner.id}`;
}

function formatContactName(contact) {
    if (!contact || !contact.properties) return null;
    const p = contact.properties;
    const name = `${p.firstname || ''} ${p.lastname || ''}`.trim();
    return name || p.email || null;
}

async function updateDeal(dealId, properties) {
    if (DRY_RUN) return true;

    await hubspotRequest(`/crm/v3/objects/deals/${dealId}`, 'PATCH', {
        properties
    });
    return true;
}

async function processDeal(deal) {
    stats.processed++;

    // Prüfen ob bereits Mitarbeiter zugewiesen
    if (deal.properties.mitarbeiter_1) {
        stats.skipped++;
        return { success: true, skipped: true };
    }

    const properties = {};
    let assignedCount = 0;

    // Bis zu 5 Mitarbeiter zuweisen
    const selectedOwners = getNextOwners(MAX_MITARBEITER);

    selectedOwners.forEach((owner, idx) => {
        const propName = `mitarbeiter_${idx + 1}`;
        properties[propName] = formatOwnerName(owner);
        assignedCount++;
    });

    // Ansprechperson aus assoziiertem Kontakt
    let ansprechperson = deal.properties.ansprechperson;
    if (!ansprechperson) {
        const contact = await getAssociatedContact(deal.id);
        ansprechperson = formatContactName(contact);
        if (ansprechperson) {
            properties.ansprechperson = ansprechperson;
        }
    }

    try {
        if (Object.keys(properties).length > 0) {
            await updateDeal(deal.id, properties);

            if (assignedCount > 0) stats.mitarbeiterAssigned++;
            if (properties.ansprechperson) stats.ansprechpersonSet++;
        }

        return {
            success: true,
            dealName: deal.properties.dealname,
            mitarbeiter: selectedOwners.map(formatOwnerName),
            ansprechperson: ansprechperson || '-'
        };
    } catch (error) {
        stats.errors++;
        return { success: false, dealId: deal.id, error: error.message };
    }
}

async function processBatch(deals) {
    const results = [];

    for (const deal of deals) {
        const result = await processDeal(deal);
        results.push(result);

        // Progress log every 10 deals
        if (stats.processed % 10 === 0) {
            console.log(`📊 Fortschritt: ${stats.processed} | ✓${stats.mitarbeiterAssigned} | 👤${stats.ansprechpersonSet} | ⏭${stats.skipped} | ✗${stats.errors}`);
        }

        await new Promise(r => setTimeout(r, REQUEST_DELAY));
    }

    return results;
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('神 HUBSPOT DEAL TEAM ASSIGNMENT');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (keine Änderungen)' : 'LIVE'}${HIGH_SPEED ? ' ⚡ HIGH SPEED' : ''}`);
    console.log(`Max. Mitarbeiter pro Deal: ${MAX_MITARBEITER}`);
    console.log(`Batch Size: ${BATCH_SIZE}`);
    console.log('');

    if (!HUBSPOT_TOKEN) {
        console.error('Error: HUBSPOT_ACCESS_TOKEN nicht gesetzt in .env');
        process.exit(1);
    }

    // Owners laden
    await loadOwners();

    if (owners.length === 0) {
        console.error('Error: Keine aktiven Owners in HubSpot gefunden');
        process.exit(1);
    }

    console.log(`\nNutze ${Math.min(owners.length, MAX_MITARBEITER)} Mitarbeiter pro Deal\n`);

    let after = null;
    let hasMore = true;
    const startTime = Date.now();

    while (hasMore) {
        const response = await getDealsWithAssociations(after);
        const deals = response.results || [];

        if (deals.length === 0) {
            console.log('Keine weiteren Deals ohne Mitarbeiter gefunden.');
            break;
        }

        console.log(`\n📦 Verarbeite Batch mit ${deals.length} Deals...`);

        const results = await processBatch(deals);

        // Ergebnisse loggen (nur erste 5 pro Batch)
        const toShow = results.filter(r => r.success && !r.skipped).slice(0, 5);
        for (const r of toShow) {
            console.log(`  ✓ ${r.dealName}`);
            console.log(`    Mitarbeiter: ${r.mitarbeiter.join(', ')}`);
            console.log(`    Ansprechperson: ${r.ansprechperson}`);
        }

        after = response.paging?.next?.after;
        hasMore = !!after;

        await new Promise(r => setTimeout(r, BATCH_DELAY));
    }

    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('ABGESCHLOSSEN');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Verarbeitet:           ${stats.processed.toLocaleString()}`);
    console.log(`Mitarbeiter zugewiesen: ${stats.mitarbeiterAssigned.toLocaleString()}`);
    console.log(`Ansprechperson gesetzt: ${stats.ansprechpersonSet.toLocaleString()}`);
    console.log(`Übersprungen:          ${stats.skipped.toLocaleString()}`);
    console.log(`Fehler:                ${stats.errors}`);
    console.log(`Zeit:                  ${totalTime} Minuten`);
    console.log(`Mode:                  ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
}

process.on('uncaughtException', (e) => { console.error('Fatal:', e); process.exit(1); });
process.on('unhandledRejection', (e) => { console.error('Unhandled:', e); process.exit(1); });

main().catch(console.error);
