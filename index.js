/**
 * 神 ENTERPRISE UNIVERSE - CONNECTOR INDEX
 * Export all available connectors
 */

const UniversalConnector = require('./universal-connector');
const OdooConnector = require('./odoo-connector');
const ERPNextConnector = require('./erpnext-connector');
const NocoDBConnector = require('./nocodb-connector');
const N8nConnector = require('./n8n-connector');
const TwentyCRMConnector = require('./twenty-crm-connector');
const ChatwootConnector = require('./chatwoot-connector');
const HubSpotConnector = require('./hubspot-connector');

// Connector Registry
const CONNECTORS = {
    // ERP Systems
    odoo: {
        class: OdooConnector,
        name: 'Odoo ERP',
        type: 'erp',
        description: 'Open Source ERP with 30k+ apps',
        website: 'https://odoo.com',
        github: 'https://github.com/odoo/odoo',
        features: ['crm', 'sales', 'inventory', 'accounting', 'hr', 'manufacturing']
    },
    erpnext: {
        class: ERPNextConnector,
        name: 'ERPNext',
        type: 'erp',
        description: 'Free and Open Source ERP by Frappe',
        website: 'https://erpnext.com',
        github: 'https://github.com/frappe/erpnext',
        features: ['crm', 'sales', 'inventory', 'accounting', 'hr', 'manufacturing', 'projects']
    },
    
    // CRM Systems
    twenty: {
        class: TwentyCRMConnector,
        name: 'Twenty CRM',
        type: 'crm',
        description: 'Modern open-source CRM',
        website: 'https://twenty.com',
        github: 'https://github.com/twentyhq/twenty',
        features: ['contacts', 'companies', 'opportunities', 'activities', 'custom-objects']
    },
    hubspot: {
        class: HubSpotConnector,
        name: 'HubSpot',
        type: 'crm',
        description: 'Leading CRM platform for scaling companies',
        website: 'https://hubspot.com',
        github: null,
        features: ['contacts', 'companies', 'deals', 'tickets', 'marketing', 'automation']
    },
    
    // Database Platforms
    nocodb: {
        class: NocoDBConnector,
        name: 'NocoDB',
        type: 'database',
        description: 'Open Source Airtable Alternative',
        website: 'https://nocodb.com',
        github: 'https://github.com/nocodb/nocodb',
        features: ['tables', 'views', 'formulas', 'automations', 'api']
    },
    
    // Automation Platforms
    n8n: {
        class: N8nConnector,
        name: 'n8n',
        type: 'automation',
        description: 'Fair-code workflow automation',
        website: 'https://n8n.io',
        github: 'https://github.com/n8n-io/n8n',
        features: ['workflows', 'webhooks', '400+ integrations', 'code-nodes']
    },
    
    // Communication Platforms
    chatwoot: {
        class: ChatwootConnector,
        name: 'Chatwoot',
        type: 'communication',
        description: 'Open-source customer engagement platform',
        website: 'https://chatwoot.com',
        github: 'https://github.com/chatwoot/chatwoot',
        features: ['live-chat', 'inbox', 'bots', 'whatsapp', 'email', 'sms']
    }
};

// Planned connectors (not yet implemented)
const PLANNED_CONNECTORS = {
    // ERP
    dolibarr: { name: 'Dolibarr', type: 'erp', github: 'https://github.com/Dolibarr/dolibarr' },
    metasfresh: { name: 'Metasfresh', type: 'erp', github: 'https://github.com/metasfresh/metasfresh' },
    akaunting: { name: 'Akaunting', type: 'erp', github: 'https://github.com/akaunting/akaunting' },
    
    // CRM
    espocrm: { name: 'EspoCRM', type: 'crm', github: 'https://github.com/espocrm/espocrm' },
    suitecrm: { name: 'SuiteCRM', type: 'crm', github: 'https://github.com/salesagility/SuiteCRM' },
    yetiforce: { name: 'YetiForce', type: 'crm', github: 'https://github.com/YetiForceCompany/YetiForceCRM' },
    monica: { name: 'Monica', type: 'crm', github: 'https://github.com/monicahq/monica' },
    frappeCrm: { name: 'Frappe CRM', type: 'crm', github: 'https://github.com/frappe/crm' },
    
    // Database
    baserow: { name: 'Baserow', type: 'database', github: 'https://github.com/bram2w/baserow' },
    nocobase: { name: 'NocoBase', type: 'database', github: 'https://github.com/nocobase/nocobase' },
    budibase: { name: 'Budibase', type: 'database', github: 'https://github.com/Budibase/budibase' },
    appsmith: { name: 'Appsmith', type: 'database', github: 'https://github.com/appsmithorg/appsmith' },
    tooljet: { name: 'ToolJet', type: 'database', github: 'https://github.com/ToolJet/ToolJet' },
    
    // Automation
    activepieces: { name: 'Activepieces', type: 'automation', github: 'https://github.com/activepieces/activepieces' },
    huginn: { name: 'Huginn', type: 'automation', github: 'https://github.com/huginn/huginn' },
    windmill: { name: 'Windmill', type: 'automation', github: 'https://github.com/windmill-labs/windmill' },
    automatisch: { name: 'Automatisch', type: 'automation', github: 'https://github.com/automatisch/automatisch' },
    
    // Communication
    chatwoot: { name: 'Chatwoot', type: 'communication', github: 'https://github.com/chatwoot/chatwoot' },
    typebot: { name: 'Typebot', type: 'communication', github: 'https://github.com/baptisteArno/typebot.io' },
    rocketchat: { name: 'Rocket.Chat', type: 'communication', github: 'https://github.com/RocketChat/Rocket.Chat' },
    mattermost: { name: 'Mattermost', type: 'communication', github: 'https://github.com/mattermost/mattermost' },
    
    // Finance
    invoiceninja: { name: 'Invoice Ninja', type: 'finance', github: 'https://github.com/invoiceninja/invoiceninja' },
    crater: { name: 'Crater', type: 'finance', github: 'https://github.com/crater-invoice/crater' },
    fireflyiii: { name: 'Firefly III', type: 'finance', github: 'https://github.com/firefly-iii/firefly-iii' },
    lago: { name: 'Lago', type: 'finance', github: 'https://github.com/getlago/lago' },
    
    // E-Commerce
    medusa: { name: 'Medusa', type: 'ecommerce', github: 'https://github.com/medusajs/medusa' },
    saleor: { name: 'Saleor', type: 'ecommerce', github: 'https://github.com/saleor/saleor' },
    bagisto: { name: 'Bagisto', type: 'ecommerce', github: 'https://github.com/bagisto/bagisto' },
    
    // Smart Home
    homeassistant: { name: 'Home Assistant', type: 'iot', github: 'https://github.com/home-assistant/core' },
    openhab: { name: 'OpenHAB', type: 'iot', github: 'https://github.com/openhab/openhab-core' },
    
    // SaaS Tools
    odooSaasTools: { name: 'Odoo SaaS Tools', type: 'saas', github: 'https://github.com/it-projects-llc/odoo-saas-tools' }
};

/**
 * Create a connector instance
 */
function createConnector(type, config) {
    const connectorInfo = CONNECTORS[type];
    
    if (!connectorInfo) {
        throw new Error(`Unknown connector type: ${type}. Available: ${Object.keys(CONNECTORS).join(', ')}`);
    }
    
    return new connectorInfo.class(config);
}

/**
 * Get available connector types
 */
function getAvailableConnectors() {
    return Object.entries(CONNECTORS).map(([key, info]) => ({
        id: key,
        name: info.name,
        type: info.type,
        description: info.description,
        features: info.features
    }));
}

/**
 * Get planned connectors
 */
function getPlannedConnectors() {
    return Object.entries(PLANNED_CONNECTORS).map(([key, info]) => ({
        id: key,
        ...info,
        status: 'planned'
    }));
}

module.exports = {
    // Base class
    UniversalConnector,
    
    // Connector classes
    OdooConnector,
    ERPNextConnector,
    NocoDBConnector,
    N8nConnector,
    TwentyCRMConnector,
    ChatwootConnector,
    HubSpotConnector,
    
    // Registry
    CONNECTORS,
    PLANNED_CONNECTORS,
    
    // Factory functions
    createConnector,
    getAvailableConnectors,
    getPlannedConnectors
};
