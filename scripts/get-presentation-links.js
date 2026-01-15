#!/usr/bin/env node
/**
 * Generate presentation links for deals in presentationscheduled stage
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const crypto = require('crypto');

const HUBSPOT_TOKEN = process.env.HUBSPOT_API_KEY;
const PRESENTATION_BASE_URL = process.env.PRESENTATION_BASE_URL || 'https://app.enterprise-universe.one';
const PRESENTATION_SECRET = process.env.PRESENTATION_SECRET || 'nexus-enterprise-2026';

function generateToken(dealId) {
    return crypto
        .createHash('sha256')
        .update(`${dealId}-${PRESENTATION_SECRET}`)
        .digest('hex')
        .substring(0, 16);
}

async function main() {
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            filterGroups: [{
                filters: [{
                    propertyName: 'dealstage',
                    operator: 'EQ',
                    value: 'presentationscheduled'
                }]
            }],
            properties: ['dealname', 'amount', 'dealstage', 'hubspot_owner_id'],
            limit: 10
        })
    });

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
        console.log('Keine Deals in presentationscheduled Stage gefunden');
        return;
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('DEALS IN PRÄSENTATIONS-STAGE');
    console.log('═══════════════════════════════════════════════════════════\n');

    for (const deal of data.results) {
        const token = generateToken(deal.id);
        const amount = deal.properties.amount
            ? parseFloat(deal.properties.amount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
            : 'N/A';

        console.log(`Deal: ${deal.properties.dealname}`);
        console.log(`Wert: ${amount}`);
        console.log(`ID: ${deal.id}`);
        console.log(`Token: ${token}`);
        console.log(`\n🔗 PRÄSENTATIONS-LINK:`);
        console.log(`   ${PRESENTATION_BASE_URL}/presentation/${token}`);
        console.log('\n---\n');
    }
}

main().catch(console.error);
