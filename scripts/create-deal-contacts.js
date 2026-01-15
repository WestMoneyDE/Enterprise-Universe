#!/usr/bin/env node
/**
 * 神 DEAL CONTACT CREATOR
 * Extrahiert Kontakte aus Deal-Descriptions und erstellt sie in HubSpot
 *
 * Usage: node create-deal-contacts.js [--dry-run] [--batch-size=100] [--high-speed]
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const HUBSPOT_TOKEN = process.env.HUBSPOT_API_KEY || process.env.HUBSPOT_ACCESS_TOKEN;
const BATCH_SIZE = parseInt(process.argv.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '100');
const DRY_RUN = process.argv.includes('--dry-run');
const HIGH_SPEED = process.argv.includes('--high-speed');
// HubSpot rate limit: ~100 requests per 10 seconds = 10/sec max
// With contact creation + association = 2-3 requests per deal
// So max ~3-4 deals per second
const REQUEST_DELAY = HIGH_SPEED ? 150 : 300;
const BATCH_DELAY = HIGH_SPEED ? 2000 : 5000;

let processedCount = 0;
let createdContacts = 0;
let associatedCount = 0;
let alreadyHasContact = 0;
let noContactInDesc = 0;
let errorCount = 0;
let contactCache = new Map(); // Cache für bereits erstellte Kontakte

async function hubspotRequest(endpoint, method = 'GET', body = null, retries = 5) {
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
            'Content-Type': 'application/json'
        }
    };

    if (body) options.body = JSON.stringify(body);

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(`https://api.hubapi.com${endpoint}`, options);

            if (response.status === 429) {
                // Rate limit - wait 10 seconds and retry
                console.log('⏳ Rate limit hit, waiting 10s...');
                await new Promise(r => setTimeout(r, 10000));
                continue;
            }

            if (!response.ok) {
                const error = await response.text();
                if (response.status === 409) {
                    return { conflict: true, error };
                }
                throw new Error(`HubSpot ${response.status}: ${error}`);
            }

            return response.json();
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        }
    }
}

/**
 * Extrahiere Kontaktname aus Deal Description
 * Format: "... | Contact: Vorname Nachname | ..."
 */
function extractContactFromDescription(description) {
    if (!description) return null;

    const match = description.match(/Contact:\s*([^|]+)/i);
    if (!match) return null;

    const fullName = match[1].trim();
    const parts = fullName.split(/\s+/);

    if (parts.length === 0) return null;

    return {
        firstname: parts[0],
        lastname: parts.slice(1).join(' ') || parts[0]
    };
}

/**
 * Extrahiere Firmenname aus Deal Description oder Dealname
 * Format: "Auto-generated from lead CompanyName #..."
 */
function extractCompanyFromDeal(deal) {
    const description = deal.properties.description || '';
    const dealname = deal.properties.dealname || '';

    // Try from description
    let match = description.match(/from lead\s+([^#]+)/i);
    if (match) return match[1].trim();

    // Try from dealname (format: "A-Class: CompanyName #ID")
    match = dealname.match(/:\s*([^#]+)/);
    if (match) return match[1].trim();

    return null;
}

/**
 * Prüfe ob Deal bereits einen Kontakt hat
 */
async function dealHasContact(dealId) {
    try {
        const assoc = await hubspotRequest(`/crm/v3/objects/deals/${dealId}/associations/contacts`);
        return assoc.results && assoc.results.length > 0;
    } catch {
        return false;
    }
}

/**
 * Erstelle Kontakt in HubSpot
 */
async function createContact(firstname, lastname, company) {
    const cacheKey = `${firstname}-${lastname}-${company || 'unknown'}`;

    // Check cache first
    if (contactCache.has(cacheKey)) {
        return contactCache.get(cacheKey);
    }

    // Generate pseudo-email for contact
    const cleanCompany = (company || 'kunde')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);
    const cleanFirst = (firstname || 'unknown').toLowerCase().replace(/[^a-z]/g, '');
    const cleanLast = (lastname || 'unknown').toLowerCase().replace(/[^a-z]/g, '');
    const email = `${cleanFirst}.${cleanLast}@${cleanCompany}.example.com`;

    if (DRY_RUN) {
        const mockId = 'dry-run-' + Date.now();
        contactCache.set(cacheKey, mockId);
        return mockId;
    }

    try {
        const contact = await hubspotRequest('/crm/v3/objects/contacts', 'POST', {
            properties: {
                firstname: firstname || 'Unknown',
                lastname: lastname || 'Contact',
                email,
                company: company || ''
            }
        });

        if (contact && contact.id) {
            contactCache.set(cacheKey, contact.id);
            return contact.id;
        }
        return null;
    } catch (error) {
        // If email already exists, try to find the contact
        if (error.message && (error.message.includes('CONTACT_EXISTS') || error.message.includes('already exists') || error.message.includes('409'))) {
            try {
                const search = await hubspotRequest('/crm/v3/objects/contacts/search', 'POST', {
                    filterGroups: [{
                        filters: [{
                            propertyName: 'email',
                            operator: 'EQ',
                            value: email
                        }]
                    }],
                    limit: 1
                });

                if (search && search.results && search.results.length > 0) {
                    contactCache.set(cacheKey, search.results[0].id);
                    return search.results[0].id;
                }
            } catch {
                // Ignore search error
            }
        }
        // Return null instead of throwing - we'll count as error and continue
        return null;
    }
}

/**
 * Verknüpfe Kontakt mit Deal
 */
async function associateContactWithDeal(dealId, contactId) {
    if (DRY_RUN) return true;

    await hubspotRequest(
        `/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/deal_to_contact`,
        'PUT'
    );
    return true;
}

/**
 * Hole Deals ohne Kontakt-Assoziation
 */
async function getDealsWithoutContact(after = null) {
    const searchBody = {
        filterGroups: [{}],
        properties: ['dealname', 'description'],
        limit: BATCH_SIZE
    };

    if (after) searchBody.after = after;

    return hubspotRequest('/crm/v3/objects/deals/search', 'POST', searchBody);
}

async function processBatch(deals) {
    for (const deal of deals) {
        processedCount++;

        try {
            // Extrahiere Kontaktinfo aus Description
            const contactInfo = extractContactFromDescription(deal.properties.description);
            if (!contactInfo) {
                noContactInDesc++;
                continue;
            }

            const company = extractCompanyFromDeal(deal);

            // Erstelle oder finde Kontakt
            const contactId = await createContact(
                contactInfo.firstname,
                contactInfo.lastname,
                company
            );

            if (contactId) {
                createdContacts++;

                // Verknüpfe mit Deal
                try {
                    await associateContactWithDeal(deal.id, contactId);
                    associatedCount++;
                } catch (assocError) {
                    // Association might already exist or failed
                    alreadyHasContact++;
                }
            }

        } catch (error) {
            errorCount++;
            if (errorCount < 20) {
                console.error(`  ✗ Deal ${deal.id}: ${error?.message || error}`);
            }
        }

        // Minimal delay
        await new Promise(r => setTimeout(r, REQUEST_DELAY));
    }
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('神 DEAL CONTACT CREATOR');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}${HIGH_SPEED ? ' ⚡ HIGH SPEED' : ''}`);
    console.log(`Batch Size: ${BATCH_SIZE} | Delays: ${REQUEST_DELAY}ms/${BATCH_DELAY}ms`);
    console.log('');

    if (!HUBSPOT_TOKEN) {
        console.error('Error: HUBSPOT_ACCESS_TOKEN not set');
        process.exit(1);
    }

    let after = null;
    let hasMore = true;
    let batchNum = 0;

    while (hasMore) {
        const response = await getDealsWithoutContact(after);
        const deals = response.results;

        if (deals.length === 0) break;

        batchNum++;
        await processBatch(deals);

        // Progress update
        if (batchNum % 10 === 0) {
            console.log(`📊 Fortschritt: ${processedCount.toLocaleString()} | Kontakte: ${createdContacts.toLocaleString()} | Verknüpft: ${associatedCount.toLocaleString()} | Hat schon: ${alreadyHasContact.toLocaleString()} | Keine Info: ${noContactInDesc.toLocaleString()} | Fehler: ${errorCount}`);
        }

        after = response.paging?.next?.after;
        hasMore = !!after;

        await new Promise(r => setTimeout(r, BATCH_DELAY));

        // Memory cleanup
        if (processedCount % 10000 === 0) {
            if (global.gc) global.gc();
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Verarbeitet:        ${processedCount.toLocaleString()}`);
    console.log(`Kontakte erstellt:  ${createdContacts.toLocaleString()}`);
    console.log(`Mit Deal verknüpft: ${associatedCount.toLocaleString()}`);
    console.log(`Hatte schon Kontakt:${alreadyHasContact.toLocaleString()}`);
    console.log(`Keine Kontakt-Info: ${noContactInDesc.toLocaleString()}`);
    console.log(`Fehler:             ${errorCount}`);
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
}

process.on('uncaughtException', (error) => {
    console.error('Fatal:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled:', error);
    process.exit(1);
});

main().catch(console.error);
