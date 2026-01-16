#!/usr/bin/env node
/**
 * Export ALL ClosedWon Deals from HubSpot
 * With pagination (100 per request)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.HUBSPOT_API_KEY;
const OUTPUT_DIR = path.join(__dirname, '..', 'Data Room', '05_Won_Deals');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function searchDeals(after = null) {
    const body = {
        filterGroups: [{
            filters: [{
                propertyName: 'dealstage',
                operator: 'EQ',
                value: 'closedwon'
            }]
        }],
        properties: [
            'dealname', 'amount', 'dealstage', 'closedate', 
            'hubspot_owner_id', 'pipeline', 'description',
            'hs_lastmodifieddate', 'createdate'
        ],
        limit: 100
    };
    
    if (after) {
        body.after = after;
    }
    
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        throw new Error(`HubSpot API error: ${response.status}`);
    }
    
    return response.json();
}

async function exportAllWonDeals() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     EXPORT ALL CLOSEDWON DEALS FROM HUBSPOT                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    const allDeals = [];
    let after = null;
    let page = 0;
    let totalAmount = 0;
    
    console.log('📊 Fetching deals with pagination...\n');
    
    while (true) {
        page++;
        const result = await searchDeals(after);
        
        for (const deal of result.results) {
            const amount = parseFloat(deal.properties.amount) || 0;
            totalAmount += amount;
            
            allDeals.push({
                id: deal.id,
                name: deal.properties.dealname,
                amount: amount,
                closeDate: deal.properties.closedate,
                createdDate: deal.properties.createdate,
                lastModified: deal.properties.hs_lastmodifieddate,
                pipeline: deal.properties.pipeline,
                description: deal.properties.description
            });
        }
        
        console.log(`  Page ${page}: +${result.results.length} deals (Total: ${allDeals.length})`);
        
        // Check for next page
        after = result.paging?.next?.after;
        if (!after) break;
        
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`✅ EXPORT COMPLETE`);
    console.log(`   Total Deals: ${allDeals.length}`);
    console.log(`   Total Value: €${totalAmount.toLocaleString('de-DE', {minimumFractionDigits: 2})}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Sort by amount (highest first)
    allDeals.sort((a, b) => b.amount - a.amount);
    
    // Save JSON
    const jsonPath = path.join(OUTPUT_DIR, `won_deals_export_${Date.now()}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify({
        exportDate: new Date().toISOString(),
        totalDeals: allDeals.length,
        totalValue: totalAmount,
        currency: 'EUR',
        deals: allDeals
    }, null, 2));
    console.log(`📁 JSON saved: ${jsonPath}`);
    
    // Save CSV
    const csvPath = path.join(OUTPUT_DIR, `won_deals_export_${Date.now()}.csv`);
    const csvHeader = 'ID,Name,Amount,CloseDate,CreatedDate,Pipeline\n';
    const csvRows = allDeals.map(d => 
        `"${d.id}","${(d.name || '').replace(/"/g, '""')}",${d.amount},"${d.closeDate || ''}","${d.createdDate || ''}","${d.pipeline || ''}"`
    ).join('\n');
    fs.writeFileSync(csvPath, csvHeader + csvRows);
    console.log(`📁 CSV saved: ${csvPath}`);
    
    // Summary by value ranges
    console.log('\n📊 BREAKDOWN BY VALUE:');
    const ranges = [
        { min: 1000000, label: '€1M+' },
        { min: 500000, max: 1000000, label: '€500K-1M' },
        { min: 100000, max: 500000, label: '€100K-500K' },
        { min: 0, max: 100000, label: '<€100K' }
    ];
    
    for (const range of ranges) {
        const filtered = allDeals.filter(d => {
            if (range.max) return d.amount >= range.min && d.amount < range.max;
            return d.amount >= range.min;
        });
        const sum = filtered.reduce((acc, d) => acc + d.amount, 0);
        console.log(`   ${range.label}: ${filtered.length} deals (€${sum.toLocaleString('de-DE', {minimumFractionDigits: 0})})`);
    }
    
    return { total: allDeals.length, value: totalAmount, jsonPath, csvPath };
}

exportAllWonDeals().catch(console.error);
