/**
 * WhatsApp Consent Manager API
 * West Money OS - Enterprise Universe
 * 
 * Basierend auf HubSpot WhatsApp Consent Management
 * https://knowledge.hubspot.com/de/inbox/edit-the-whatsapp-consent-status-of-your-contacts-in-bulk
 */

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

// Legal Basis Options (DSGVO konform)
const LEGAL_BASIS_OPTIONS = {
    consent: {
        name: 'Einwilligung',
        article: 'Art. 6 Abs. 1 lit. a DSGVO',
        description: 'Die betroffene Person hat ihre Einwilligung gegeben'
    },
    contract: {
        name: 'Vertragserfüllung',
        article: 'Art. 6 Abs. 1 lit. b DSGVO',
        description: 'Erfüllung eines Vertrags'
    },
    legal: {
        name: 'Rechtliche Verpflichtung',
        article: 'Art. 6 Abs. 1 lit. c DSGVO',
        description: 'Erfüllung einer rechtlichen Verpflichtung'
    },
    interest: {
        name: 'Berechtigtes Interesse',
        article: 'Art. 6 Abs. 1 lit. f DSGVO',
        description: 'Berechtigte Interessen des Verantwortlichen'
    }
};

// WhatsApp Consent Status
const CONSENT_STATUS = {
    OPT_IN: 'opt_in',
    OPT_OUT: 'opt_out',
    PENDING: 'pending',
    NOT_SET: 'not_set'
};

/**
 * Bulk Update WhatsApp Consent Status
 * @param {Array} contactIds - Array of HubSpot Contact IDs
 * @param {string} status - 'opt_in' or 'opt_out'
 * @param {string} legalBasis - Legal basis key
 * @param {string} explanation - Explanation for the update
 */
async function bulkUpdateConsentStatus(contactIds, status, legalBasis, explanation) {
    const timestamp = new Date().toISOString();
    
    const updates = contactIds.map(contactId => ({
        id: contactId,
        properties: {
            whatsapp_consent_status: status,
            whatsapp_consent_legal_basis: legalBasis,
            whatsapp_consent_explanation: explanation,
            whatsapp_consent_updated_at: timestamp,
            whatsapp_consent_updated_by: 'West Money OS'
        }
    }));

    try {
        const response = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/contacts/batch/update`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inputs: updates })
        });

        if (!response.ok) {
            throw new Error(`HubSpot API Error: ${response.status}`);
        }

        const result = await response.json();
        
        // Log the update
        await logConsentUpdate({
            contactIds,
            status,
            legalBasis,
            explanation,
            timestamp,
            result: 'success'
        });

        return {
            success: true,
            updated: contactIds.length,
            timestamp,
            details: result
        };
    } catch (error) {
        console.error('Bulk Consent Update Error:', error);
        
        await logConsentUpdate({
            contactIds,
            status,
            legalBasis,
            explanation,
            timestamp,
            result: 'error',
            error: error.message
        });

        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get Contacts by Consent Status
 * @param {string} status - Consent status filter
 * @param {number} limit - Max results
 */
async function getContactsByConsentStatus(status, limit = 100) {
    try {
        const response = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/contacts/search`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filterGroups: [{
                    filters: [{
                        propertyName: 'whatsapp_consent_status',
                        operator: 'EQ',
                        value: status
                    }]
                }],
                properties: [
                    'firstname',
                    'lastname',
                    'email',
                    'phone',
                    'whatsapp_consent_status',
                    'whatsapp_consent_legal_basis',
                    'whatsapp_consent_updated_at'
                ],
                limit
            })
        });

        if (!response.ok) {
            throw new Error(`HubSpot API Error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Get Contacts Error:', error);
        throw error;
    }
}

/**
 * Get Consent Statistics
 */
async function getConsentStatistics() {
    const statuses = ['opt_in', 'opt_out', 'pending', 'not_set'];
    const stats = {};

    for (const status of statuses) {
        try {
            const response = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/contacts/search`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filterGroups: [{
                        filters: [{
                            propertyName: 'whatsapp_consent_status',
                            operator: 'EQ',
                            value: status
                        }]
                    }],
                    limit: 0
                })
            });

            if (response.ok) {
                const data = await response.json();
                stats[status] = data.total || 0;
            }
        } catch (error) {
            stats[status] = 0;
        }
    }

    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    const optInRate = total > 0 ? ((stats.opt_in / total) * 100).toFixed(1) : 0;

    return {
        ...stats,
        total,
        optInRate: `${optInRate}%`,
        timestamp: new Date().toISOString()
    };
}

/**
 * Log Consent Update for Audit Trail
 */
async function logConsentUpdate(logData) {
    // In production, save to database or logging service
    console.log('[CONSENT_LOG]', JSON.stringify(logData, null, 2));
    
    // Could also send to Slack, webhook, etc.
    if (process.env.SLACK_WEBHOOK_URL) {
        try {
            await fetch(process.env.SLACK_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `📱 WhatsApp Consent Update\n` +
                          `Status: ${logData.status}\n` +
                          `Contacts: ${logData.contactIds.length}\n` +
                          `Legal Basis: ${logData.legalBasis}\n` +
                          `Result: ${logData.result}`
                })
            });
        } catch (e) {
            console.error('Slack notification failed:', e);
        }
    }
}

/**
 * Create Custom Properties in HubSpot (One-time setup)
 */
async function setupHubSpotProperties() {
    const properties = [
        {
            name: 'whatsapp_consent_status',
            label: 'WhatsApp Consent Status',
            type: 'enumeration',
            fieldType: 'select',
            groupName: 'contactinformation',
            options: [
                { label: 'Opt-In', value: 'opt_in' },
                { label: 'Opt-Out', value: 'opt_out' },
                { label: 'Pending', value: 'pending' },
                { label: 'Not Set', value: 'not_set' }
            ]
        },
        {
            name: 'whatsapp_consent_legal_basis',
            label: 'WhatsApp Legal Basis',
            type: 'enumeration',
            fieldType: 'select',
            groupName: 'contactinformation',
            options: [
                { label: 'Einwilligung (Art. 6 Abs. 1 lit. a)', value: 'consent' },
                { label: 'Vertragserfüllung (Art. 6 Abs. 1 lit. b)', value: 'contract' },
                { label: 'Rechtliche Verpflichtung (Art. 6 Abs. 1 lit. c)', value: 'legal' },
                { label: 'Berechtigtes Interesse (Art. 6 Abs. 1 lit. f)', value: 'interest' }
            ]
        },
        {
            name: 'whatsapp_consent_explanation',
            label: 'WhatsApp Consent Explanation',
            type: 'string',
            fieldType: 'textarea',
            groupName: 'contactinformation'
        },
        {
            name: 'whatsapp_consent_updated_at',
            label: 'WhatsApp Consent Updated At',
            type: 'datetime',
            fieldType: 'date',
            groupName: 'contactinformation'
        },
        {
            name: 'whatsapp_consent_updated_by',
            label: 'WhatsApp Consent Updated By',
            type: 'string',
            fieldType: 'text',
            groupName: 'contactinformation'
        }
    ];

    const results = [];

    for (const property of properties) {
        try {
            const response = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/properties/contacts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(property)
            });

            if (response.ok) {
                results.push({ property: property.name, status: 'created' });
            } else if (response.status === 409) {
                results.push({ property: property.name, status: 'already_exists' });
            } else {
                results.push({ property: property.name, status: 'error', code: response.status });
            }
        } catch (error) {
            results.push({ property: property.name, status: 'error', message: error.message });
        }
    }

    return results;
}

/**
 * Express.js Route Handler Example
 */
function setupRoutes(app) {
    // Bulk Update Consent
    app.post('/api/whatsapp/consent/bulk-update', async (req, res) => {
        const { contactIds, status, legalBasis, explanation } = req.body;

        if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
            return res.status(400).json({ error: 'contactIds array required' });
        }

        if (!['opt_in', 'opt_out'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Use opt_in or opt_out' });
        }

        if (!LEGAL_BASIS_OPTIONS[legalBasis]) {
            return res.status(400).json({ error: 'Invalid legal basis' });
        }

        const result = await bulkUpdateConsentStatus(contactIds, status, legalBasis, explanation);
        res.json(result);
    });

    // Get Statistics
    app.get('/api/whatsapp/consent/stats', async (req, res) => {
        const stats = await getConsentStatistics();
        res.json(stats);
    });

    // Get Contacts by Status
    app.get('/api/whatsapp/consent/contacts/:status', async (req, res) => {
        const { status } = req.params;
        const { limit = 100 } = req.query;

        try {
            const contacts = await getContactsByConsentStatus(status, parseInt(limit));
            res.json(contacts);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Setup Properties (One-time)
    app.post('/api/whatsapp/consent/setup', async (req, res) => {
        const results = await setupHubSpotProperties();
        res.json({ properties: results });
    });

    // Get Legal Basis Options
    app.get('/api/whatsapp/consent/legal-basis', (req, res) => {
        res.json(LEGAL_BASIS_OPTIONS);
    });
}

// Export for use in server
module.exports = {
    bulkUpdateConsentStatus,
    getContactsByConsentStatus,
    getConsentStatistics,
    setupHubSpotProperties,
    setupRoutes,
    LEGAL_BASIS_OPTIONS,
    CONSENT_STATUS
};
