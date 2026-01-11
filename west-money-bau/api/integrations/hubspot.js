/**
 * HubSpot Integration for West Money Bau
 * Handles CRM operations for projects and subcontractors
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

// Pipeline IDs for Bau projects
const PIPELINES = {
    BAU_PROJECTS: 'bau_projects', // Needs to be created in HubSpot
    STAGES: {
        INQUIRY: 'inquiry',
        CONSULTATION: 'consultation',
        QUOTE: 'quote',
        NEGOTIATION: 'negotiation',
        SIGNED: 'signed',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed'
    }
};

/**
 * Make authenticated request to HubSpot API
 */
async function hubspotRequest(endpoint, method = 'GET', data = null) {
    const url = `${HUBSPOT_BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
            'Content-Type': 'application/json'
        }
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        const result = await response.json();

        if (!response.ok) {
            console.error('[HubSpot] API Error:', result);
            throw new Error(result.message || 'HubSpot API error');
        }

        return result;
    } catch (error) {
        console.error('[HubSpot] Request failed:', error.message);
        throw error;
    }
}

/**
 * Create or update a contact in HubSpot
 */
async function upsertContact(contactData) {
    const { email, firstName, lastName, phone, company, source } = contactData;

    // First, try to find existing contact
    try {
        const searchResult = await hubspotRequest('/crm/v3/objects/contacts/search', 'POST', {
            filterGroups: [{
                filters: [{
                    propertyName: 'email',
                    operator: 'EQ',
                    value: email
                }]
            }]
        });

        if (searchResult.total > 0) {
            // Update existing contact
            const contactId = searchResult.results[0].id;
            return await hubspotRequest(`/crm/v3/objects/contacts/${contactId}`, 'PATCH', {
                properties: {
                    firstname: firstName,
                    lastname: lastName,
                    phone: phone,
                    company: company
                }
            });
        }
    } catch (error) {
        // Contact doesn't exist, create new
    }

    // Create new contact
    return await hubspotRequest('/crm/v3/objects/contacts', 'POST', {
        properties: {
            email: email,
            firstname: firstName,
            lastname: lastName,
            phone: phone,
            company: company,
            hs_lead_status: 'NEW',
            lifecyclestage: 'lead',
            source_platform: 'west_money_bau',
            lead_source: source || 'website'
        }
    });
}

/**
 * Create a deal for a project inquiry
 */
async function createProjectDeal(projectData, contactId) {
    const { title, projectType, description, estimatedValue, source } = projectData;

    const deal = await hubspotRequest('/crm/v3/objects/deals', 'POST', {
        properties: {
            dealname: title,
            pipeline: PIPELINES.BAU_PROJECTS,
            dealstage: PIPELINES.STAGES.INQUIRY,
            amount: estimatedValue || 0,
            description: description,
            project_type: projectType,
            hs_priority: 'medium',
            deal_source: source || 'website'
        }
    });

    // Associate deal with contact
    if (contactId) {
        await hubspotRequest(`/crm/v3/objects/deals/${deal.id}/associations/contacts/${contactId}/deal_to_contact`, 'PUT');
    }

    return deal;
}

/**
 * Update deal stage
 */
async function updateDealStage(dealId, newStage) {
    return await hubspotRequest(`/crm/v3/objects/deals/${dealId}`, 'PATCH', {
        properties: {
            dealstage: newStage
        }
    });
}

/**
 * Create contact for subcontractor application
 */
async function createSubcontractorContact(applicationData) {
    const {
        email, firstName, lastName, companyName, phone,
        country, city, specializations, experienceYears
    } = applicationData;

    return await hubspotRequest('/crm/v3/objects/contacts', 'POST', {
        properties: {
            email: email,
            firstname: firstName,
            lastname: lastName,
            company: companyName,
            phone: phone,
            city: city,
            country: country,
            hs_lead_status: 'NEW',
            lifecyclestage: 'other',
            contact_type: 'subcontractor',
            specializations: Array.isArray(specializations) ? specializations.join(', ') : specializations,
            experience_years: experienceYears,
            source_platform: 'west_money_bau'
        }
    });
}

/**
 * Log activity/note on a contact
 */
async function addNote(contactId, content) {
    const note = await hubspotRequest('/crm/v3/objects/notes', 'POST', {
        properties: {
            hs_note_body: content,
            hs_timestamp: new Date().toISOString()
        }
    });

    // Associate note with contact
    await hubspotRequest(`/crm/v3/objects/notes/${note.id}/associations/contacts/${contactId}/note_to_contact`, 'PUT');

    return note;
}

/**
 * Sync project status to HubSpot
 */
async function syncProjectStatus(project) {
    // Map internal status to HubSpot stage
    const statusToStage = {
        'inquiry': PIPELINES.STAGES.INQUIRY,
        'consultation': PIPELINES.STAGES.CONSULTATION,
        'quote_sent': PIPELINES.STAGES.QUOTE,
        'negotiation': PIPELINES.STAGES.NEGOTIATION,
        'signed': PIPELINES.STAGES.SIGNED,
        'in_progress': PIPELINES.STAGES.IN_PROGRESS,
        'completed': PIPELINES.STAGES.COMPLETED
    };

    if (project.hubspot_deal_id) {
        return await updateDealStage(project.hubspot_deal_id, statusToStage[project.status] || project.status);
    }
}

module.exports = {
    upsertContact,
    createProjectDeal,
    updateDealStage,
    createSubcontractorContact,
    addNote,
    syncProjectStatus,
    PIPELINES
};
