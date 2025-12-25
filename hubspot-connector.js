/**
 * 神 ENTERPRISE UNIVERSE - HUBSPOT CONNECTOR
 * Connect to HubSpot CRM via REST API
 * 
 * Full integration with Contacts, Companies, Deals, Tickets
 */

const UniversalConnector = require('./universal-connector');

class HubSpotConnector extends UniversalConnector {
    constructor(config) {
        super({
            ...config,
            name: config.name || 'HubSpot',
            type: 'crm',
            provider: 'hubspot',
            baseUrl: 'https://api.hubapi.com'
        });
        
        this.accessToken = config.credentials?.accessToken;
        this.portalId = config.portalId;
        
        this.entityMappings = {
            contacts: {
                object: 'contacts',
                idField: 'id',
                fields: {
                    firstName: 'firstname',
                    lastName: 'lastname',
                    email: 'email',
                    phone: 'phone',
                    mobilePhone: 'mobilephone',
                    company: 'company',
                    jobTitle: 'jobtitle',
                    website: 'website',
                    city: 'city',
                    state: 'state',
                    country: 'country',
                    zip: 'zip',
                    lifecycleStage: 'lifecyclestage',
                    leadStatus: 'hs_lead_status',
                    whatsappOptIn: 'whatsapp_opt_in'
                }
            },
            companies: {
                object: 'companies',
                idField: 'id',
                fields: {
                    name: 'name',
                    domain: 'domain',
                    industry: 'industry',
                    phone: 'phone',
                    city: 'city',
                    country: 'country',
                    employees: 'numberofemployees',
                    revenue: 'annualrevenue',
                    description: 'description',
                    website: 'website'
                }
            },
            deals: {
                object: 'deals',
                idField: 'id',
                fields: {
                    name: 'dealname',
                    stage: 'dealstage',
                    amount: 'amount',
                    closeDate: 'closedate',
                    pipeline: 'pipeline',
                    owner: 'hubspot_owner_id',
                    probability: 'hs_deal_stage_probability',
                    type: 'dealtype'
                }
            },
            tickets: {
                object: 'tickets',
                idField: 'id',
                fields: {
                    subject: 'subject',
                    content: 'content',
                    status: 'hs_pipeline_stage',
                    priority: 'hs_ticket_priority',
                    category: 'hs_ticket_category',
                    pipeline: 'hs_pipeline',
                    owner: 'hubspot_owner_id'
                }
            }
        };
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
        };
    }

    async request(method, endpoint, data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const options = {
            method,
            headers: this.getHeaders()
        };
        
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP ${response.status}`);
        }
        
        return response.json();
    }

    async connect() {
        await this.request('GET', '/crm/v3/objects/contacts?limit=1');
        this.status = 'connected';
        this.onConnect();
        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════
    // CRM OBJECT OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    async create(entity, data) {
        const mapping = this.entityMappings[entity];
        if (!mapping) throw new Error(`Unknown entity: ${entity}`);
        
        const properties = this.transformFromUniversal(entity, data);
        
        const result = await this.request('POST', `/crm/v3/objects/${mapping.object}`, {
            properties
        });
        
        return this.transformToUniversal(entity, result);
    }

    async read(entity, id) {
        const mapping = this.entityMappings[entity];
        if (!mapping) throw new Error(`Unknown entity: ${entity}`);
        
        const properties = Object.values(mapping.fields).join(',');
        
        const result = await this.request('GET', 
            `/crm/v3/objects/${mapping.object}/${id}?properties=${properties}`
        );
        
        return this.transformToUniversal(entity, result);
    }

    async update(entity, id, data) {
        const mapping = this.entityMappings[entity];
        if (!mapping) throw new Error(`Unknown entity: ${entity}`);
        
        const properties = this.transformFromUniversal(entity, data);
        
        const result = await this.request('PATCH', `/crm/v3/objects/${mapping.object}/${id}`, {
            properties
        });
        
        return this.transformToUniversal(entity, result);
    }

    async delete(entity, id) {
        const mapping = this.entityMappings[entity];
        if (!mapping) throw new Error(`Unknown entity: ${entity}`);
        
        await this.request('DELETE', `/crm/v3/objects/${mapping.object}/${id}`);
        return { deleted: true, id };
    }

    async list(entity, filters = {}, options = {}) {
        const mapping = this.entityMappings[entity];
        if (!mapping) throw new Error(`Unknown entity: ${entity}`);
        
        const limit = options.limit || 100;
        const properties = Object.values(mapping.fields).join(',');
        
        let endpoint = `/crm/v3/objects/${mapping.object}?limit=${limit}&properties=${properties}`;
        
        if (options.after) {
            endpoint += `&after=${options.after}`;
        }
        
        const result = await this.request('GET', endpoint);
        
        return {
            records: result.results.map(r => this.transformToUniversal(entity, r)),
            hasMore: !!result.paging?.next,
            after: result.paging?.next?.after
        };
    }

    async search(entity, query, options = {}) {
        const mapping = this.entityMappings[entity];
        if (!mapping) throw new Error(`Unknown entity: ${entity}`);
        
        const result = await this.request('POST', `/crm/v3/objects/${mapping.object}/search`, {
            query,
            limit: options.limit || 20,
            properties: Object.values(mapping.fields)
        });
        
        return {
            records: result.results.map(r => this.transformToUniversal(entity, r)),
            total: result.total
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // ASSOCIATIONS
    // ═══════════════════════════════════════════════════════════════

    async associate(fromEntity, fromId, toEntity, toId, type = null) {
        const fromMapping = this.entityMappings[fromEntity];
        const toMapping = this.entityMappings[toEntity];
        
        if (!fromMapping || !toMapping) throw new Error('Unknown entity');
        
        const associationType = type || `${fromMapping.object}_to_${toMapping.object}`;
        
        return this.request('PUT', 
            `/crm/v4/objects/${fromMapping.object}/${fromId}/associations/${toMapping.object}/${toId}`,
            [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
        );
    }

    async getAssociations(entity, id, toEntity) {
        const fromMapping = this.entityMappings[entity];
        const toMapping = this.entityMappings[toEntity];
        
        return this.request('GET', 
            `/crm/v4/objects/${fromMapping.object}/${id}/associations/${toMapping.object}`
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // PIPELINE & STAGES
    // ═══════════════════════════════════════════════════════════════

    async getPipelines(objectType = 'deals') {
        return this.request('GET', `/crm/v3/pipelines/${objectType}`);
    }

    async getPipelineStages(objectType, pipelineId) {
        const result = await this.request('GET', `/crm/v3/pipelines/${objectType}/${pipelineId}`);
        return result.stages;
    }

    // ═══════════════════════════════════════════════════════════════
    // OWNERS
    // ═══════════════════════════════════════════════════════════════

    async listOwners() {
        return this.request('GET', '/crm/v3/owners');
    }

    async getOwner(ownerId) {
        return this.request('GET', `/crm/v3/owners/${ownerId}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // ENGAGEMENT (Notes, Emails, Calls, Meetings, Tasks)
    // ═══════════════════════════════════════════════════════════════

    async createNote(body, associations = {}) {
        return this.request('POST', '/crm/v3/objects/notes', {
            properties: {
                hs_note_body: body,
                hs_timestamp: Date.now()
            },
            associations: this.buildAssociations(associations)
        });
    }

    async createTask(subject, dueDate, associations = {}) {
        return this.request('POST', '/crm/v3/objects/tasks', {
            properties: {
                hs_task_subject: subject,
                hs_timestamp: Date.now(),
                hs_task_due_date: dueDate
            },
            associations: this.buildAssociations(associations)
        });
    }

    async logEmail(subject, body, associations = {}) {
        return this.request('POST', '/crm/v3/objects/emails', {
            properties: {
                hs_email_subject: subject,
                hs_email_text: body,
                hs_timestamp: Date.now(),
                hs_email_direction: 'EMAIL'
            },
            associations: this.buildAssociations(associations)
        });
    }

    async logCall(body, duration, outcome, associations = {}) {
        return this.request('POST', '/crm/v3/objects/calls', {
            properties: {
                hs_call_body: body,
                hs_call_duration: duration,
                hs_call_disposition: outcome,
                hs_timestamp: Date.now()
            },
            associations: this.buildAssociations(associations)
        });
    }

    buildAssociations(associations) {
        const result = [];
        
        for (const [type, ids] of Object.entries(associations)) {
            for (const id of Array.isArray(ids) ? ids : [ids]) {
                result.push({
                    to: { id },
                    types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
                });
            }
        }
        
        return result;
    }

    // ═══════════════════════════════════════════════════════════════
    // WHATSAPP / CONSENT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    async updateWhatsAppConsent(contactId, optIn) {
        return this.update('contacts', contactId, {
            whatsappOptIn: optIn ? 'true' : 'false'
        });
    }

    async bulkUpdateWhatsAppConsent(contactIds, optIn) {
        const inputs = contactIds.map(id => ({
            id,
            properties: {
                whatsapp_opt_in: optIn ? 'true' : 'false'
            }
        }));
        
        return this.request('POST', '/crm/v3/objects/contacts/batch/update', { inputs });
    }

    async getContactsWithWhatsAppConsent() {
        return this.search('contacts', '', {
            filterGroups: [{
                filters: [{
                    propertyName: 'whatsapp_opt_in',
                    operator: 'EQ',
                    value: 'true'
                }]
            }]
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // WEBHOOK HANDLING
    // ═══════════════════════════════════════════════════════════════

    async handleWebhook(payload, headers) {
        // HubSpot sends array of events
        const events = Array.isArray(payload) ? payload : [payload];
        
        return {
            received: true,
            events: events.map(e => ({
                subscriptionType: e.subscriptionType,
                objectId: e.objectId,
                propertyName: e.propertyName,
                propertyValue: e.propertyValue,
                changeSource: e.changeSource,
                occurredAt: e.occurredAt
            }))
        };
    }

    async registerWebhook(subscriptionType, webhookUrl) {
        return this.request('POST', `/webhooks/v3/${this.portalId}/subscriptions`, {
            subscriptionDetails: {
                subscriptionType,
                propertyName: null
            },
            enabled: true
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // HAIKU GOD MODE INTEGRATION
    // ═══════════════════════════════════════════════════════════════

    async getDealsPipeline() {
        const deals = await this.list('deals', {}, { limit: 100 });
        
        const pipeline = {
            new: [],
            qualified: [],
            proposal: [],
            negotiation: [],
            won: [],
            lost: []
        };
        
        for (const deal of deals.records) {
            const stage = deal.stage?.toLowerCase() || 'new';
            if (pipeline[stage]) {
                pipeline[stage].push(deal);
            }
        }
        
        return pipeline;
    }

    async getRevenueSummary() {
        const deals = await this.list('deals', { stage: 'closedwon' }, { limit: 1000 });
        
        let totalRevenue = 0;
        const byMonth = {};
        
        for (const deal of deals.records) {
            const amount = parseFloat(deal.amount) || 0;
            totalRevenue += amount;
            
            if (deal.closeDate) {
                const month = deal.closeDate.substring(0, 7);
                byMonth[month] = (byMonth[month] || 0) + amount;
            }
        }
        
        return { totalRevenue, byMonth };
    }

    async getLeadSources() {
        const contacts = await this.list('contacts', {}, { limit: 1000 });
        
        const sources = {};
        for (const contact of contacts.records) {
            const source = contact.source || 'Unknown';
            sources[source] = (sources[source] || 0) + 1;
        }
        
        return sources;
    }
}

module.exports = HubSpotConnector;
