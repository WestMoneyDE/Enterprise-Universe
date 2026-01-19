#!/usr/bin/env node
/**
 * 神 SETUP TEAM PROPERTIES
 * Erstellt Custom Properties für Mitarbeiter-Zuweisung in HubSpot
 *
 * Usage: node setup-team-properties.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const HUBSPOT_TOKEN = process.env.HUBSPOT_API_KEY || process.env.HUBSPOT_ACCESS_TOKEN;

const TEAM_PROPERTIES = [
    {
        name: 'mitarbeiter_1',
        label: 'Mitarbeiter 1 (Hauptverantwortlich)',
        type: 'string',
        fieldType: 'text',
        groupName: 'dealinformation',
        description: 'Erster zugewiesener Mitarbeiter'
    },
    {
        name: 'mitarbeiter_2',
        label: 'Mitarbeiter 2',
        type: 'string',
        fieldType: 'text',
        groupName: 'dealinformation',
        description: 'Zweiter zugewiesener Mitarbeiter'
    },
    {
        name: 'mitarbeiter_3',
        label: 'Mitarbeiter 3',
        type: 'string',
        fieldType: 'text',
        groupName: 'dealinformation',
        description: 'Dritter zugewiesener Mitarbeiter'
    },
    {
        name: 'mitarbeiter_4',
        label: 'Mitarbeiter 4',
        type: 'string',
        fieldType: 'text',
        groupName: 'dealinformation',
        description: 'Vierter zugewiesener Mitarbeiter'
    },
    {
        name: 'mitarbeiter_5',
        label: 'Mitarbeiter 5',
        type: 'string',
        fieldType: 'text',
        groupName: 'dealinformation',
        description: 'Fünfter zugewiesener Mitarbeiter'
    },
    {
        name: 'ansprechperson',
        label: 'Ansprechperson',
        type: 'string',
        fieldType: 'text',
        groupName: 'dealinformation',
        description: 'Primäre Ansprechperson für diesen Deal'
    }
];

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
    const data = await response.json();

    if (!response.ok) {
        throw new Error(`HubSpot ${response.status}: ${JSON.stringify(data)}`);
    }

    return data;
}

async function propertyExists(name) {
    try {
        await hubspotRequest(`/crm/v3/properties/deals/${name}`);
        return true;
    } catch (error) {
        return false;
    }
}

async function createProperty(property) {
    return hubspotRequest('/crm/v3/properties/deals', 'POST', property);
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('神 SETUP TEAM PROPERTIES');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    if (!HUBSPOT_TOKEN) {
        console.error('Error: HUBSPOT_ACCESS_TOKEN nicht gesetzt');
        process.exit(1);
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const property of TEAM_PROPERTIES) {
        console.log(`Prüfe Property: ${property.name}...`);

        try {
            if (await propertyExists(property.name)) {
                console.log(`  ⏭ Existiert bereits: ${property.label}`);
                skipped++;
            } else {
                await createProperty(property);
                console.log(`  ✓ Erstellt: ${property.label}`);
                created++;
            }
        } catch (error) {
            console.log(`  ✗ Fehler: ${error.message}`);
            errors++;
        }

        await new Promise(r => setTimeout(r, 100));
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('ERGEBNIS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Erstellt:     ${created}`);
    console.log(`Übersprungen: ${skipped}`);
    console.log(`Fehler:       ${errors}`);
}

main().catch(console.error);
