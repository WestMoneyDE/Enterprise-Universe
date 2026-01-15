/**
 * Owner Assignment Daemon Worker
 * Automatically assigns owners to HubSpot deals using round-robin
 *
 * Wraps the assign-deal-owners.js script as a daemon worker
 * Runs every 15 minutes to ensure new deals get owners quickly
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const HUBSPOT_TOKEN = process.env.HUBSPOT_API_KEY || process.env.HUBSPOT_ACCESS_TOKEN;
const HUBSPOT_BASE_URL = 'https://api.hubapi.com';
const BATCH_SIZE = 50;

// Owner rotation state
let owners = [];
let currentOwnerIndex = 0;
let lastOwnerFetch = 0;
const OWNER_CACHE_TTL = 1000 * 60 * 30; // 30 minutes

async function hubspotRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
            'Content-Type': 'application/json'
        }
    };

    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(`${HUBSPOT_BASE_URL}${endpoint}`, options);

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`HubSpot API ${response.status}: ${error}`);
        }

        return response.json();
    } catch (error) {
        console.error('[OwnerAssignment] API Error:', error.message);
        throw error;
    }
}

async function loadOwners() {
    // Cache owners to reduce API calls
    if (owners.length > 0 && Date.now() - lastOwnerFetch < OWNER_CACHE_TTL) {
        return owners;
    }

    const data = await hubspotRequest('/crm/v3/owners?limit=100');
    owners = data.results.filter(o => !o.archived);
    lastOwnerFetch = Date.now();

    return owners;
}

function getNextOwner() {
    const owner = owners[currentOwnerIndex];
    currentOwnerIndex = (currentOwnerIndex + 1) % owners.length;
    return owner;
}

async function getDealsWithoutOwner() {
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

    return hubspotRequest('/crm/v3/objects/deals/search', 'POST', searchBody);
}

async function assignOwnerToDeal(dealId, ownerId) {
    return hubspotRequest(`/crm/v3/objects/deals/${dealId}`, 'PATCH', {
        properties: {
            hubspot_owner_id: ownerId.toString()
        }
    });
}

async function run() {
    const stats = {
        processed: 0,
        assigned: 0,
        errors: 0,
        skipped: 0
    };

    try {
        // Check API key
        if (!HUBSPOT_TOKEN) {
            return {
                success: false,
                summary: 'HUBSPOT_API_KEY not configured',
                stats
            };
        }

        // Load owners
        await loadOwners();

        if (owners.length === 0) {
            return {
                success: false,
                summary: 'No active owners found in HubSpot',
                stats
            };
        }

        // Get deals without owner
        const response = await getDealsWithoutOwner();
        const deals = response.results || [];

        if (deals.length === 0) {
            return {
                success: true,
                summary: 'No deals without owner found',
                stats
            };
        }

        // Process deals
        for (const deal of deals) {
            try {
                const owner = getNextOwner();
                await assignOwnerToDeal(deal.id, owner.id);

                stats.assigned++;
                console.log(`[OwnerAssignment] ${deal.properties.dealname} -> ${owner.firstName} ${owner.lastName}`);

                // Rate limiting
                await new Promise(r => setTimeout(r, 100));
            } catch (error) {
                stats.errors++;
                console.error(`[OwnerAssignment] Error assigning deal ${deal.id}:`, error.message);
            }

            stats.processed++;
        }

        const hasMore = !!response.paging?.next?.after;
        const moreText = hasMore ? ' (more pending)' : '';

        return {
            success: stats.errors === 0,
            summary: `Assigned ${stats.assigned}/${stats.processed} deals${moreText}`,
            stats,
            hasMore
        };

    } catch (error) {
        return {
            success: false,
            summary: `Error: ${error.message}`,
            error: error.message,
            stats
        };
    }
}

module.exports = { run };
