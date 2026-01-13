#!/usr/bin/env node
/**
 * 神 HUBSPOT DEAL OWNER ASSIGNMENT
 * Memory-optimized batch processing
 *
 * Usage: node assign-deal-owners.js [--dry-run] [--batch-size=50]
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const HUBSPOT_TOKEN = process.env.HUBSPOT_API_KEY || process.env.HUBSPOT_ACCESS_TOKEN;
const BATCH_SIZE = parseInt(process.argv.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '50');
const DRY_RUN = process.argv.includes('--dry-run');

// Memory optimization: Use streaming approach
let processedCount = 0;
let assignedCount = 0;
let errorCount = 0;
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

    const response = await fetch(`https://api.hubapi.com${endpoint}`, options);

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`HubSpot API Error: ${response.status} - ${error}`);
    }

    return response.json();
}

async function loadOwners() {
    console.log('Loading HubSpot owners...');
    const data = await hubspotRequest('/crm/v3/owners?limit=100');
    owners = data.results.filter(o => !o.archived);
    console.log(`Found ${owners.length} active owners`);
    return owners;
}

function getNextOwner() {
    // Round-robin assignment
    const owner = owners[currentOwnerIndex];
    currentOwnerIndex = (currentOwnerIndex + 1) % owners.length;
    return owner;
}

async function getDealsWithoutOwner(after = null) {
    // Use search API to find deals without owner
    const searchBody = {
        filterGroups: [{
            filters: [{
                propertyName: 'hubspot_owner_id',
                operator: 'NOT_HAS_PROPERTY'
            }]
        }],
        properties: ['dealname', 'amount', 'dealstage', 'hubspot_owner_id'],
        limit: BATCH_SIZE
    };

    if (after) {
        searchBody.after = after;
    }

    return hubspotRequest('/crm/v3/objects/deals/search', 'POST', searchBody);
}

async function assignOwnerToDeal(dealId, ownerId) {
    if (DRY_RUN) {
        return { success: true, dryRun: true };
    }

    return hubspotRequest(`/crm/v3/objects/deals/${dealId}`, 'PATCH', {
        properties: {
            hubspot_owner_id: ownerId.toString()
        }
    });
}

async function processBatch(deals) {
    const results = [];

    for (const deal of deals) {
        try {
            const owner = getNextOwner();

            await assignOwnerToDeal(deal.id, owner.id);

            results.push({
                dealId: deal.id,
                dealName: deal.properties.dealname,
                ownerId: owner.id,
                ownerName: `${owner.firstName} ${owner.lastName}`,
                success: true
            });

            assignedCount++;

            // Memory: Clear deal reference
            deal.properties = null;

        } catch (error) {
            results.push({
                dealId: deal.id,
                error: error.message,
                success: false
            });
            errorCount++;
        }

        processedCount++;

        // Progress log every 10 deals
        if (processedCount % 10 === 0) {
            console.log(`Progress: ${processedCount} processed, ${assignedCount} assigned, ${errorCount} errors`);

            // Memory: Force garbage collection hint
            if (global.gc) global.gc();
        }

        // Rate limiting: 100ms delay between requests
        await new Promise(r => setTimeout(r, 100));
    }

    return results;
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('神 HUBSPOT DEAL OWNER ASSIGNMENT');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);
    console.log(`Batch Size: ${BATCH_SIZE}`);
    console.log('');

    if (!HUBSPOT_TOKEN) {
        console.error('Error: HUBSPOT_ACCESS_TOKEN not set in .env');
        process.exit(1);
    }

    // Load owners first
    await loadOwners();

    if (owners.length === 0) {
        console.error('Error: No active owners found in HubSpot');
        process.exit(1);
    }

    console.log('\nStarting deal processing...\n');

    let after = null;
    let hasMore = true;
    let totalDeals = 0;

    while (hasMore) {
        // Get batch of deals without owner
        const response = await getDealsWithoutOwner(after);
        const deals = response.results;

        if (deals.length === 0) {
            console.log('No more deals without owner found.');
            break;
        }

        totalDeals += deals.length;
        console.log(`\nProcessing batch of ${deals.length} deals...`);

        // Process this batch
        const results = await processBatch(deals);

        // Log batch results
        for (const r of results) {
            if (r.success) {
                console.log(`  ✓ ${r.dealName} -> ${r.ownerName}`);
            } else {
                console.log(`  ✗ Deal ${r.dealId}: ${r.error}`);
            }
        }

        // Memory: Clear results
        results.length = 0;

        // Check for more pages
        after = response.paging?.next?.after;
        hasMore = !!after;

        // Memory: Clear response
        response.results = null;

        // Delay between batches
        await new Promise(r => setTimeout(r, 500));
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total Deals Found: ${totalDeals}`);
    console.log(`Successfully Assigned: ${assignedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('Fatal error:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
    process.exit(1);
});

main().catch(console.error);
