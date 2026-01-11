/**
 * Data Sync Daemon
 * Synchronizes data between HubSpot, Stripe, and local database
 */

const db = require('./utils/database');

// HubSpot API config
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

async function hubspotRequest(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
            'Content-Type': 'application/json'
        }
    };
    if (data) options.body = JSON.stringify(data);

    try {
        const response = await fetch(`${HUBSPOT_BASE_URL}${endpoint}`, options);
        return await response.json();
    } catch (error) {
        console.error('[DataSync] HubSpot error:', error.message);
        return null;
    }
}

async function syncCustomersToHubSpot() {
    let synced = 0;

    try {
        // Get customers not yet synced
        const customers = await db.query(`
            SELECT * FROM bau.customers
            WHERE hubspot_contact_id IS NULL
            AND email IS NOT NULL
            LIMIT 50
        `);

        for (const customer of customers.rows) {
            // Check if contact exists in HubSpot
            const searchResult = await hubspotRequest('/crm/v3/objects/contacts/search', 'POST', {
                filterGroups: [{
                    filters: [{
                        propertyName: 'email',
                        operator: 'EQ',
                        value: customer.email
                    }]
                }]
            });

            let contactId = null;

            if (searchResult?.results?.length > 0) {
                contactId = searchResult.results[0].id;
            } else {
                // Create new contact
                const newContact = await hubspotRequest('/crm/v3/objects/contacts', 'POST', {
                    properties: {
                        email: customer.email,
                        firstname: customer.first_name,
                        lastname: customer.last_name,
                        phone: customer.phone,
                        company: customer.company
                    }
                });
                contactId = newContact?.id;
            }

            if (contactId) {
                await db.query(
                    'UPDATE bau.customers SET hubspot_contact_id = $1 WHERE id = $2',
                    [contactId, customer.id]
                );
                synced++;
            }
        }
    } catch (error) {
        console.error('[DataSync] Customer sync error:', error.message);
    }

    return synced;
}

async function syncProjectsToHubSpot() {
    let synced = 0;

    try {
        // Get projects not yet synced
        const projects = await db.query(`
            SELECT p.*, c.hubspot_contact_id
            FROM bau.projects p
            LEFT JOIN bau.customers c ON p.customer_id = c.id
            WHERE p.hubspot_deal_id IS NULL
            AND c.hubspot_contact_id IS NOT NULL
            LIMIT 20
        `);

        for (const project of projects.rows) {
            const deal = await hubspotRequest('/crm/v3/objects/deals', 'POST', {
                properties: {
                    dealname: project.title || `Projekt ${project.project_number}`,
                    pipeline: 'default',
                    dealstage: mapStatusToStage(project.status),
                    amount: project.estimated_value || 0,
                    description: project.description
                }
            });

            if (deal?.id) {
                // Associate with contact
                await hubspotRequest(
                    `/crm/v3/objects/deals/${deal.id}/associations/contacts/${project.hubspot_contact_id}/deal_to_contact`,
                    'PUT'
                );

                await db.query(
                    'UPDATE bau.projects SET hubspot_deal_id = $1 WHERE id = $2',
                    [deal.id, project.id]
                );
                synced++;
            }
        }
    } catch (error) {
        console.error('[DataSync] Project sync error:', error.message);
    }

    return synced;
}

function mapStatusToStage(status) {
    const mapping = {
        'inquiry': 'appointmentscheduled',
        'consultation': 'qualifiedtobuy',
        'quote_sent': 'presentationscheduled',
        'negotiation': 'decisionmakerboughtin',
        'signed': 'contractsent',
        'in_progress': 'closedwon',
        'completed': 'closedwon',
        'cancelled': 'closedlost'
    };
    return mapping[status] || 'appointmentscheduled';
}

async function syncStripeCustomers() {
    let synced = 0;

    // This would sync Stripe customer IDs for payment processing
    // Implementation depends on Stripe setup

    return synced;
}

async function updateDealStages() {
    let updated = 0;

    try {
        // Get projects with changed status that have HubSpot deal IDs
        const projects = await db.query(`
            SELECT p.id, p.status, p.hubspot_deal_id
            FROM bau.projects p
            WHERE p.hubspot_deal_id IS NOT NULL
            AND p.updated_at > NOW() - INTERVAL '1 hour'
        `);

        for (const project of projects.rows) {
            const newStage = mapStatusToStage(project.status);

            await hubspotRequest(`/crm/v3/objects/deals/${project.hubspot_deal_id}`, 'PATCH', {
                properties: {
                    dealstage: newStage
                }
            });
            updated++;
        }
    } catch (error) {
        console.error('[DataSync] Deal stage update error:', error.message);
    }

    return updated;
}

async function run() {
    const results = {
        customersToHubSpot: 0,
        projectsToHubSpot: 0,
        stripeSync: 0,
        dealStagesUpdated: 0
    };

    try {
        results.customersToHubSpot = await syncCustomersToHubSpot();
        results.projectsToHubSpot = await syncProjectsToHubSpot();
        results.stripeSync = await syncStripeCustomers();
        results.dealStagesUpdated = await updateDealStages();

        // Log sync activity
        const total = Object.values(results).reduce((a, b) => a + b, 0);
        if (total > 0) {
            await db.query(`
                INSERT INTO bau.activity_log (entity_type, action, description)
                VALUES ('system', 'data_sync', $1)
            `, [`Synced: ${results.customersToHubSpot} customers, ${results.projectsToHubSpot} projects to HubSpot`]);
        }

    } catch (error) {
        console.error('[DataSync] Error:', error.message);
    }

    return {
        success: true,
        summary: `Synced ${results.customersToHubSpot} customers, ${results.projectsToHubSpot} projects`,
        results
    };
}

module.exports = { run };
