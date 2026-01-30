#!/usr/bin/env node
// =============================================================================
// DEAL-FINDER BOT - Automatischer HubSpot Won Deal Monitor
// =============================================================================
// Überwacht HubSpot auf neue Won Deals und importiert Kontakte automatisch

import pg from 'pg';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const { Pool } = pg;

const HUBSPOT_API_BASE = 'https://api.hubapi.com';
const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const STATE_FILE = '/tmp/deal-finder-state.json';

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'westmoney_os',
  user: 'westmoney',
  password: 'westmoney',
});

// Statistics
const stats = {
  newDeals: 0,
  newContacts: 0,
  skipped: 0,
  errors: 0,
  startTime: new Date(),
};

function loadState() {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
    }
  } catch {
    // Ignore
  }
  return { lastCheck: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() };
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function hubspotRequest(endpoint, options = {}) {
  if (!HUBSPOT_TOKEN) {
    throw new Error('HUBSPOT_ACCESS_TOKEN not set');
  }

  const response = await fetch(`${HUBSPOT_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HubSpot API error: ${response.status}`);
  }

  return response.json();
}

async function getWonDealsSince(since) {
  console.log(`Suche Won Deals seit ${since}...`);

  const response = await hubspotRequest('/crm/v3/objects/deals/search', {
    method: 'POST',
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            { propertyName: 'dealstage', operator: 'EQ', value: 'closedwon' },
            { propertyName: 'hs_lastmodifieddate', operator: 'GTE', value: since },
          ],
        },
      ],
      properties: ['dealname', 'amount', 'dealstage', 'closedate', 'hs_object_id'],
      limit: 100,
    }),
  });

  return response.results || [];
}

async function getContactsForDeal(dealId) {
  try {
    const response = await hubspotRequest(
      `/crm/v3/objects/deals/${dealId}/associations/contacts`
    );

    const contacts = [];
    for (const assoc of response.results || []) {
      try {
        const contact = await hubspotRequest(
          `/crm/v3/objects/contacts/${assoc.id}?properties=firstname,lastname,email`
        );
        if (contact.properties.email) {
          contacts.push({
            id: contact.id,
            email: contact.properties.email,
            name: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim(),
          });
        }
      } catch {
        // Skip
      }
    }
    return contacts;
  } catch {
    return [];
  }
}

async function dealExistsInDB(hubspotDealId) {
  const result = await pool.query(
    'SELECT 1 FROM deal_contacts WHERE hubspot_deal_id = $1 LIMIT 1',
    [hubspotDealId]
  );
  return result.rows.length > 0;
}

async function saveContact(contact) {
  try {
    await pool.query(
      `INSERT INTO deal_contacts
       (hubspot_deal_id, deal_name, deal_value, contact_email, contact_name, source, created_at)
       VALUES ($1, $2, $3, $4, $5, 'deal_finder_bot', NOW())
       ON CONFLICT (hubspot_deal_id, contact_email) DO NOTHING`,
      [
        contact.hubspotDealId,
        contact.dealName,
        contact.dealValue,
        contact.email,
        contact.name,
      ]
    );
    return true;
  } catch (error) {
    console.error(`  Fehler beim Speichern: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       DEAL-FINDER BOT v1.0                                  ║');
  console.log('║       HubSpot Won Deal Monitor                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (!HUBSPOT_TOKEN) {
    console.error('FEHLER: HUBSPOT_ACCESS_TOKEN nicht gesetzt!');
    process.exit(1);
  }

  const state = loadState();
  console.log(`Letzte Prüfung: ${state.lastCheck}\n`);

  try {
    // Get new won deals since last check
    const deals = await getWonDealsSince(state.lastCheck);
    console.log(`Gefundene Deals: ${deals.length}\n`);

    for (const deal of deals) {
      const dealId = deal.id;
      const dealName = deal.properties.dealname || `Deal ${dealId}`;
      const dealValue = parseFloat(deal.properties.amount || '0');

      // Check if already in DB
      if (await dealExistsInDB(dealId)) {
        console.log(`⊘ ${dealName} - bereits importiert`);
        stats.skipped++;
        continue;
      }

      console.log(`▶ ${dealName} (€${dealValue.toLocaleString('de-DE')})`);
      stats.newDeals++;

      // Get contacts for this deal
      const contacts = await getContactsForDeal(dealId);
      console.log(`  Kontakte gefunden: ${contacts.length}`);

      for (const contact of contacts) {
        const saved = await saveContact({
          hubspotDealId: dealId,
          dealName,
          dealValue,
          email: contact.email,
          name: contact.name,
        });

        if (saved) {
          console.log(`  ✓ ${contact.email}`);
          stats.newContacts++;
        }
      }
    }

    // Update state
    state.lastCheck = new Date().toISOString();
    state.lastRun = {
      timestamp: state.lastCheck,
      newDeals: stats.newDeals,
      newContacts: stats.newContacts,
      skipped: stats.skipped,
    };
    saveState(state);

  } catch (error) {
    console.error(`\nFEHLER: ${error.message}`);
    stats.errors++;
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    ZUSAMMENFASSUNG                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`Neue Deals:     ${stats.newDeals}`);
  console.log(`Neue Kontakte:  ${stats.newContacts}`);
  console.log(`Übersprungen:   ${stats.skipped}`);
  console.log(`Fehler:         ${stats.errors}\n`);

  await pool.end();
}

main().catch(console.error);
