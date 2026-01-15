#!/usr/bin/env node
/**
 * 神 DEAL CONTACT CREATOR (BATCH VERSION)
 * Uses HubSpot Batch API for efficient contact creation
 *
 * Usage: node create-deal-contacts-batch.js [--dry-run]
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const HUBSPOT_TOKEN = process.env.HUBSPOT_API_KEY || process.env.HUBSPOT_ACCESS_TOKEN;
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 100; // Max for batch API
const DELAY_BETWEEN_BATCHES = 15000; // 15 seconds to respect rate limits

let stats = {
    processed: 0,
    contactsCreated: 0,
    associationsCreated: 0,
    noContactInfo: 0,
    errors: 0,
    batches: 0
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
            console.log('⏳ Rate limit - waiting 15s...');
            await new Promise(r => setTimeout(r, 15000));
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

function extractContactFromDescription(description) {
    if (!description) return null;
    const match = description.match(/Contact:\s*([^|]+)/i);
    if (!match) return null;

    const fullName = match[1].trim();
    const parts = fullName.split(/\s+/);
    if (parts.length === 0) return null;

    return {
        firstname: parts[0] || 'Unknown',
        lastname: parts.slice(1).join(' ') || 'Contact'
    };
}

function extractCompanyFromDeal(deal) {
    const dealname = deal.properties.dealname || '';
    const match = dealname.match(/:\s*([^#]+)/);
    return match ? match[1].trim() : 'Unknown Company';
}

function generateEmail(firstname, lastname, company) {
    const clean = (s) => (s || 'x').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15);
    return `${clean(firstname)}.${clean(lastname)}@${clean(company)}.example.com`;
}

async function getDeals(after = null) {
    const body = {
        filterGroups: [{}],
        properties: ['dealname', 'description'],
        limit: BATCH_SIZE
    };
    if (after) body.after = after;
    return hubspotRequest('/crm/v3/objects/deals/search', 'POST', body);
}

async function batchCreateContacts(contacts) {
    if (DRY_RUN || contacts.length === 0) return contacts.map((c, i) => ({ id: `dry-${i}` }));

    const body = {
        inputs: contacts.map(c => ({
            properties: {
                firstname: c.firstname,
                lastname: c.lastname,
                email: c.email,
                company: c.company
            }
        }))
    };

    try {
        const result = await hubspotRequest('/crm/v3/objects/contacts/batch/create', 'POST', body);
        return result.results || [];
    } catch (error) {
        // If batch fails (some emails exist), create individually
        console.log('  Batch create failed, falling back to individual creates...');
        const results = [];
        for (const c of contacts) {
            try {
                const single = await hubspotRequest('/crm/v3/objects/contacts', 'POST', {
                    properties: {
                        firstname: c.firstname,
                        lastname: c.lastname,
                        email: c.email,
                        company: c.company
                    }
                });
                results.push(single);
                await new Promise(r => setTimeout(r, 200));
            } catch {
                // Try to find existing
                try {
                    const search = await hubspotRequest('/crm/v3/objects/contacts/search', 'POST', {
                        filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: c.email }] }],
                        limit: 1
                    });
                    if (search.results?.[0]) results.push(search.results[0]);
                } catch {
                    // Skip
                }
            }
        }
        return results;
    }
}

async function batchCreateAssociations(associations) {
    if (DRY_RUN || associations.length === 0) return;

    const body = {
        inputs: associations.map(a => ({
            from: { id: a.dealId },
            to: { id: a.contactId },
            type: 'deal_to_contact'
        }))
    };

    try {
        await hubspotRequest('/crm/v3/associations/deals/contacts/batch/create', 'POST', body);
    } catch (error) {
        // Some associations might already exist - that's OK
        console.log('  Some associations already existed or failed');
    }
}

async function processBatch(deals) {
    const contactsToCreate = [];
    const dealContactMap = new Map(); // dealId -> contact index

    // Extract contacts from deals
    for (const deal of deals) {
        stats.processed++;
        const contactInfo = extractContactFromDescription(deal.properties.description);

        if (!contactInfo) {
            stats.noContactInfo++;
            continue;
        }

        const company = extractCompanyFromDeal(deal);
        const email = generateEmail(contactInfo.firstname, contactInfo.lastname, company);

        dealContactMap.set(deal.id, contactsToCreate.length);
        contactsToCreate.push({
            dealId: deal.id,
            firstname: contactInfo.firstname,
            lastname: contactInfo.lastname,
            email,
            company
        });
    }

    if (contactsToCreate.length === 0) return;

    // Batch create contacts
    console.log(`  Creating ${contactsToCreate.length} contacts...`);
    const createdContacts = await batchCreateContacts(contactsToCreate);
    stats.contactsCreated += createdContacts.length;

    // Build associations
    const associations = [];
    for (let i = 0; i < contactsToCreate.length; i++) {
        const contact = contactsToCreate[i];
        const created = createdContacts[i];
        if (created?.id) {
            associations.push({
                dealId: contact.dealId,
                contactId: created.id
            });
        }
    }

    // Batch create associations
    if (associations.length > 0) {
        console.log(`  Creating ${associations.length} associations...`);
        await batchCreateAssociations(associations);
        stats.associationsCreated += associations.length;
    }
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('神 DEAL CONTACT CREATOR (BATCH)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Batch Size: ${BATCH_SIZE} | Delay: ${DELAY_BETWEEN_BATCHES/1000}s between batches`);
    console.log('');

    if (!HUBSPOT_TOKEN) {
        console.error('Error: HUBSPOT_ACCESS_TOKEN not set');
        process.exit(1);
    }

    let after = null;
    let hasMore = true;
    const startTime = Date.now();

    while (hasMore) {
        stats.batches++;
        console.log(`\n📦 Batch ${stats.batches}...`);

        try {
            const response = await getDeals(after);
            const deals = response.results || [];

            if (deals.length === 0) break;

            await processBatch(deals);

            // Progress
            const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
            const rate = Math.round(stats.processed / (Date.now() - startTime) * 1000 * 60);
            console.log(`📊 ${stats.processed.toLocaleString()} processed | ${stats.contactsCreated.toLocaleString()} contacts | ${stats.associationsCreated.toLocaleString()} associations | ${elapsed}min | ${rate}/min`);

            after = response.paging?.next?.after;
            hasMore = !!after;

            if (hasMore) {
                console.log(`  Waiting ${DELAY_BETWEEN_BATCHES/1000}s...`);
                await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
            }

        } catch (error) {
            stats.errors++;
            console.error(`  ✗ Batch error: ${error.message}`);
            if (stats.errors > 10) {
                console.error('Too many errors, stopping.');
                break;
            }
            await new Promise(r => setTimeout(r, 30000)); // Wait 30s on error
        }
    }

    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Deals Processed:   ${stats.processed.toLocaleString()}`);
    console.log(`Contacts Created:  ${stats.contactsCreated.toLocaleString()}`);
    console.log(`Associations:      ${stats.associationsCreated.toLocaleString()}`);
    console.log(`No Contact Info:   ${stats.noContactInfo.toLocaleString()}`);
    console.log(`Errors:            ${stats.errors}`);
    console.log(`Total Time:        ${totalTime} minutes`);
    console.log(`Mode:              ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
}

process.on('uncaughtException', (e) => { console.error('Fatal:', e); process.exit(1); });
process.on('unhandledRejection', (e) => { console.error('Unhandled:', e); process.exit(1); });

main().catch(console.error);
