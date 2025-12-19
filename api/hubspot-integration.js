/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  HUBSPOT API INTEGRATION - GTz Ecosystem / West Money OS                  ║
 * ║  Complete CRM Sync with WhatsApp Consent Management                       ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Version: 2.0.0 | Release: 01.01.2026                                     ║
 * ║  Author: Ömer Hüseyin Coşkun | Enterprise Universe                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

const HUBSPOT_CONFIG = {
  baseUrl: 'https://api.hubapi.com',
  version: 'v3',
  rateLimit: 100, // requests per 10 seconds
  retryAttempts: 3,
  retryDelay: 1000
};

/**
 * HubSpot API Client
 * Handles all communication with HubSpot CRM
 */
class HubSpotClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseUrl = HUBSPOT_CONFIG.baseUrl;
    this.requestQueue = [];
    this.isProcessing = false;
  }

  /**
   * Set or update the access token
   */
  setAccessToken(token) {
    this.accessToken = token;
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      
      if (response.status === 429) {
        // Rate limited - wait and retry
        const retryAfter = response.headers.get('Retry-After') || 10;
        console.warn(`Rate limited. Waiting ${retryAfter}s...`);
        await this.sleep(retryAfter * 1000);
        return this.request(endpoint, options);
      }

      if (!response.ok) {
        const error = await response.json();
        throw new HubSpotError(error.message || 'API Error', response.status, error);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof HubSpotError) throw error;
      throw new HubSpotError(error.message, 0, { originalError: error });
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTACTS API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all contacts with pagination
   */
  async getAllContacts(properties = [], limit = 100) {
    const defaultProperties = [
      'firstname', 'lastname', 'email', 'phone', 'company',
      'lifecyclestage', 'hs_lead_status', 'createdate', 'lastmodifieddate',
      'whatsapp_consent', 'whatsapp_consent_date', 'marketing_consent'
    ];

    const allProperties = [...new Set([...defaultProperties, ...properties])];
    const contacts = [];
    let after = undefined;

    do {
      const params = new URLSearchParams({
        limit: limit.toString(),
        properties: allProperties.join(',')
      });

      if (after) {
        params.append('after', after);
      }

      const response = await this.request(`/crm/v3/objects/contacts?${params}`);
      contacts.push(...response.results);
      after = response.paging?.next?.after;

      // Progress callback
      console.log(`Fetched ${contacts.length} contacts...`);
    } while (after);

    return contacts;
  }

  /**
   * Get single contact by ID
   */
  async getContact(contactId, properties = []) {
    const params = properties.length > 0 
      ? `?properties=${properties.join(',')}`
      : '';
    return this.request(`/crm/v3/objects/contacts/${contactId}${params}`);
  }

  /**
   * Search contacts
   */
  async searchContacts(filters, properties = [], limit = 100) {
    const body = {
      filterGroups: [{ filters }],
      properties: properties.length > 0 ? properties : [
        'firstname', 'lastname', 'email', 'phone', 'company',
        'lifecyclestage', 'whatsapp_consent'
      ],
      limit
    };

    return this.request('/crm/v3/objects/contacts/search', {
      method: 'POST',
      body
    });
  }

  /**
   * Create new contact
   */
  async createContact(properties) {
    return this.request('/crm/v3/objects/contacts', {
      method: 'POST',
      body: { properties }
    });
  }

  /**
   * Update contact
   */
  async updateContact(contactId, properties) {
    return this.request(`/crm/v3/objects/contacts/${contactId}`, {
      method: 'PATCH',
      body: { properties }
    });
  }

  /**
   * Bulk update contacts (batch)
   */
  async batchUpdateContacts(updates) {
    // updates = [{ id: '123', properties: { ... } }, ...]
    const batches = this.chunkArray(updates, 100);
    const results = [];

    for (const batch of batches) {
      const response = await this.request('/crm/v3/objects/contacts/batch/update', {
        method: 'POST',
        body: { inputs: batch }
      });
      results.push(...response.results);
    }

    return results;
  }

  /**
   * Update WhatsApp consent status for contact
   */
  async updateWhatsAppConsent(contactId, consentGranted, source = 'GTz Ecosystem') {
    const properties = {
      whatsapp_consent: consentGranted ? 'granted' : 'revoked',
      whatsapp_consent_date: new Date().toISOString(),
      whatsapp_consent_source: source
    };

    return this.updateContact(contactId, properties);
  }

  /**
   * Bulk update WhatsApp consent
   */
  async bulkUpdateWhatsAppConsent(contactIds, consentGranted, source = 'GTz Ecosystem') {
    const updates = contactIds.map(id => ({
      id,
      properties: {
        whatsapp_consent: consentGranted ? 'granted' : 'revoked',
        whatsapp_consent_date: new Date().toISOString(),
        whatsapp_consent_source: source
      }
    }));

    return this.batchUpdateContacts(updates);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEALS API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all deals with pagination
   */
  async getAllDeals(properties = [], limit = 100) {
    const defaultProperties = [
      'dealname', 'amount', 'dealstage', 'pipeline', 'closedate',
      'createdate', 'hs_lastmodifieddate', 'hubspot_owner_id'
    ];

    const allProperties = [...new Set([...defaultProperties, ...properties])];
    const deals = [];
    let after = undefined;

    do {
      const params = new URLSearchParams({
        limit: limit.toString(),
        properties: allProperties.join(',')
      });

      if (after) {
        params.append('after', after);
      }

      const response = await this.request(`/crm/v3/objects/deals?${params}`);
      deals.push(...response.results);
      after = response.paging?.next?.after;

      console.log(`Fetched ${deals.length} deals...`);
    } while (after);

    return deals;
  }

  /**
   * Get deal by ID
   */
  async getDeal(dealId, properties = []) {
    const params = properties.length > 0 
      ? `?properties=${properties.join(',')}`
      : '';
    return this.request(`/crm/v3/objects/deals/${dealId}${params}`);
  }

  /**
   * Create deal
   */
  async createDeal(properties, associations = []) {
    const body = { properties };
    if (associations.length > 0) {
      body.associations = associations;
    }
    return this.request('/crm/v3/objects/deals', {
      method: 'POST',
      body
    });
  }

  /**
   * Update deal
   */
  async updateDeal(dealId, properties) {
    return this.request(`/crm/v3/objects/deals/${dealId}`, {
      method: 'PATCH',
      body: { properties }
    });
  }

  /**
   * Get deals pipeline stages
   */
  async getDealPipelines() {
    return this.request('/crm/v3/pipelines/deals');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPANIES API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all companies
   */
  async getAllCompanies(properties = [], limit = 100) {
    const defaultProperties = [
      'name', 'domain', 'industry', 'phone', 'city', 'country',
      'numberofemployees', 'annualrevenue', 'createdate'
    ];

    const allProperties = [...new Set([...defaultProperties, ...properties])];
    const companies = [];
    let after = undefined;

    do {
      const params = new URLSearchParams({
        limit: limit.toString(),
        properties: allProperties.join(',')
      });

      if (after) {
        params.append('after', after);
      }

      const response = await this.request(`/crm/v3/objects/companies?${params}`);
      companies.push(...response.results);
      after = response.paging?.next?.after;
    } while (after);

    return companies;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OWNERS API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all owners (users)
   */
  async getOwners() {
    return this.request('/crm/v3/owners');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS & REPORTING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get account info
   */
  async getAccountInfo() {
    return this.request('/account-info/v3/details');
  }

  /**
   * Get CRM statistics
   */
  async getCRMStats() {
    const [contacts, deals, companies] = await Promise.all([
      this.request('/crm/v3/objects/contacts?limit=1'),
      this.request('/crm/v3/objects/deals?limit=1'),
      this.request('/crm/v3/objects/companies?limit=1')
    ]);

    return {
      totalContacts: contacts.total || 0,
      totalDeals: deals.total || 0,
      totalCompanies: companies.total || 0
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * Custom error class for HubSpot API errors
 */
class HubSpotError extends Error {
  constructor(message, statusCode, details) {
    super(message);
    this.name = 'HubSpotError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Data Sync Manager
 * Handles synchronization between HubSpot and GTz Ecosystem
 */
class DataSyncManager {
  constructor(hubspotClient) {
    this.client = hubspotClient;
    this.syncLog = [];
    this.lastSync = null;
  }

  /**
   * Full sync - pull all data from HubSpot
   */
  async fullSync() {
    const startTime = Date.now();
    const results = {
      contacts: [],
      deals: [],
      companies: [],
      owners: [],
      pipelines: [],
      stats: {},
      errors: []
    };

    try {
      // Get account info
      console.log('📊 Fetching account info...');
      results.accountInfo = await this.client.getAccountInfo();

      // Get owners
      console.log('👥 Fetching owners...');
      const ownersResponse = await this.client.getOwners();
      results.owners = ownersResponse.results || [];

      // Get pipelines
      console.log('📈 Fetching deal pipelines...');
      const pipelinesResponse = await this.client.getDealPipelines();
      results.pipelines = pipelinesResponse.results || [];

      // Get all contacts
      console.log('📇 Fetching all contacts...');
      results.contacts = await this.client.getAllContacts();

      // Get all deals
      console.log('💰 Fetching all deals...');
      results.deals = await this.client.getAllDeals();

      // Get all companies
      console.log('🏢 Fetching all companies...');
      results.companies = await this.client.getAllCompanies();

      // Calculate stats
      results.stats = {
        totalContacts: results.contacts.length,
        totalDeals: results.deals.length,
        totalCompanies: results.companies.length,
        totalOwners: results.owners.length,
        syncDuration: Date.now() - startTime,
        syncedAt: new Date().toISOString()
      };

      // Calculate revenue
      results.stats.totalRevenue = results.deals.reduce((sum, deal) => {
        return sum + (parseFloat(deal.properties.amount) || 0);
      }, 0);

      // Count by stage
      results.stats.dealsByStage = {};
      results.deals.forEach(deal => {
        const stage = deal.properties.dealstage || 'unknown';
        results.stats.dealsByStage[stage] = (results.stats.dealsByStage[stage] || 0) + 1;
      });

      // WhatsApp consent stats
      results.stats.whatsappConsent = {
        granted: results.contacts.filter(c => c.properties.whatsapp_consent === 'granted').length,
        revoked: results.contacts.filter(c => c.properties.whatsapp_consent === 'revoked').length,
        pending: results.contacts.filter(c => !c.properties.whatsapp_consent).length
      };

      this.lastSync = results;
      this.logSync('full', results.stats);

      console.log('✅ Full sync complete!');
      return results;

    } catch (error) {
      results.errors.push({
        type: 'sync_error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      console.error('❌ Sync error:', error);
      throw error;
    }
  }

  /**
   * Sync only contacts with WhatsApp consent
   */
  async syncWhatsAppContacts() {
    const contacts = await this.client.searchContacts([
      {
        propertyName: 'whatsapp_consent',
        operator: 'EQ',
        value: 'granted'
      }
    ]);

    return contacts.results || [];
  }

  /**
   * Export data to JSON
   */
  exportToJSON() {
    if (!this.lastSync) {
      throw new Error('No sync data available. Run fullSync() first.');
    }
    return JSON.stringify(this.lastSync, null, 2);
  }

  /**
   * Export contacts to CSV format
   */
  exportContactsToCSV() {
    if (!this.lastSync?.contacts) {
      throw new Error('No contacts data available.');
    }

    const headers = [
      'ID', 'Vorname', 'Nachname', 'E-Mail', 'Telefon', 'Firma',
      'Status', 'WhatsApp Consent', 'Erstellt', 'Aktualisiert'
    ];

    const rows = this.lastSync.contacts.map(contact => [
      contact.id,
      contact.properties.firstname || '',
      contact.properties.lastname || '',
      contact.properties.email || '',
      contact.properties.phone || '',
      contact.properties.company || '',
      contact.properties.lifecyclestage || '',
      contact.properties.whatsapp_consent || 'pending',
      contact.properties.createdate || '',
      contact.properties.lastmodifieddate || ''
    ]);

    return [headers, ...rows].map(row => row.join(';')).join('\n');
  }

  logSync(type, stats) {
    this.syncLog.push({
      type,
      stats,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * WhatsApp Consent Manager
 * Specialized handler for GDPR-compliant WhatsApp consent
 */
class WhatsAppConsentManager {
  constructor(hubspotClient) {
    this.client = hubspotClient;
  }

  /**
   * Grant consent for a contact
   */
  async grantConsent(contactId, source = 'GTz Ecosystem', ipAddress = null) {
    const properties = {
      whatsapp_consent: 'granted',
      whatsapp_consent_date: new Date().toISOString(),
      whatsapp_consent_source: source,
      whatsapp_consent_method: 'double_opt_in'
    };

    if (ipAddress) {
      properties.whatsapp_consent_ip = this.anonymizeIP(ipAddress);
    }

    const result = await this.client.updateContact(contactId, properties);
    
    // Log for GDPR compliance
    console.log(`[GDPR] Consent granted for contact ${contactId} via ${source}`);
    
    return result;
  }

  /**
   * Revoke consent for a contact
   */
  async revokeConsent(contactId, reason = 'User request') {
    const properties = {
      whatsapp_consent: 'revoked',
      whatsapp_consent_revoked_date: new Date().toISOString(),
      whatsapp_consent_revoke_reason: reason
    };

    const result = await this.client.updateContact(contactId, properties);
    
    console.log(`[GDPR] Consent revoked for contact ${contactId}: ${reason}`);
    
    return result;
  }

  /**
   * Bulk grant consent
   */
  async bulkGrantConsent(contactIds, source = 'Bulk Import') {
    return this.client.bulkUpdateWhatsAppConsent(contactIds, true, source);
  }

  /**
   * Bulk revoke consent
   */
  async bulkRevokeConsent(contactIds, reason = 'Bulk revoke') {
    return this.client.bulkUpdateWhatsAppConsent(contactIds, false, reason);
  }

  /**
   * Get consent statistics
   */
  async getConsentStats() {
    const [granted, revoked, pending] = await Promise.all([
      this.client.searchContacts([
        { propertyName: 'whatsapp_consent', operator: 'EQ', value: 'granted' }
      ]),
      this.client.searchContacts([
        { propertyName: 'whatsapp_consent', operator: 'EQ', value: 'revoked' }
      ]),
      this.client.searchContacts([
        { propertyName: 'whatsapp_consent', operator: 'NOT_HAS_PROPERTY' }
      ])
    ]);

    return {
      granted: granted.total || 0,
      revoked: revoked.total || 0,
      pending: pending.total || 0,
      total: (granted.total || 0) + (revoked.total || 0) + (pending.total || 0)
    };
  }

  /**
   * Anonymize IP for GDPR compliance
   */
  anonymizeIP(ip) {
    if (!ip) return null;
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    return ip.substring(0, ip.lastIndexOf(':')) + ':xxxx';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT FOR USE IN GTz ECOSYSTEM
// ═══════════════════════════════════════════════════════════════════════════

// For Node.js / CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    HubSpotClient,
    HubSpotError,
    DataSyncManager,
    WhatsAppConsentManager,
    HUBSPOT_CONFIG
  };
}

// For Browser / ES Modules
if (typeof window !== 'undefined') {
  window.HubSpotClient = HubSpotClient;
  window.DataSyncManager = DataSyncManager;
  window.WhatsAppConsentManager = WhatsAppConsentManager;
}

// ═══════════════════════════════════════════════════════════════════════════
// USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════════════════════
/*
// Initialize
const client = new HubSpotClient('pat-eu1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
const syncManager = new DataSyncManager(client);
const consentManager = new WhatsAppConsentManager(client);

// Full sync
const data = await syncManager.fullSync();
console.log('Synced:', data.stats);

// Update WhatsApp consent
await consentManager.grantConsent('12345', 'Website Form');

// Get consent stats
const stats = await consentManager.getConsentStats();
console.log('WhatsApp Consent:', stats);

// Export to CSV
const csv = syncManager.exportContactsToCSV();
*/
