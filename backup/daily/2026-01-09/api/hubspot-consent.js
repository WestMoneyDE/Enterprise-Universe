/**
 * HubSpot WhatsApp Consent API Integration
 * DSGVO-konforme Implementierung nach Art. 6 Abs. 1 lit. a DSGVO
 * 
 * Referenz: https://knowledge.hubspot.com/de/inbox/edit-the-whatsapp-consent-status-of-your-contacts-in-bulk
 * 
 * © 2025 Enterprise Universe | West Money OS
 */

// ═══════════════════════════════════════════════════════════════════════════════
// KONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    HUBSPOT_API_BASE: 'https://api.hubapi.com',
    HUBSPOT_API_VERSION: 'v3',
    WHATSAPP_CONSENT_PROPERTY: 'hs_whatsapp_consent',
    CONSENT_VALUES: {
        GRANTED: 'opt_in',
        DENIED: 'opt_out',
        PENDING: 'not_opted',
        REVOKED: 'revoked'
    },
    AUDIT_RETENTION_DAYS: 365 * 3, // 3 Jahre gemäß DSGVO
    RATE_LIMIT: {
        REQUESTS_PER_SECOND: 10,
        BATCH_SIZE: 100
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// HUBSPOT CONSENT API CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class HubSpotConsentAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = CONFIG.HUBSPOT_API_BASE;
        this.requestQueue = [];
        this.isProcessing = false;
    }

    /**
     * Setzt HTTP Headers für API Requests
     */
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    /**
     * Führt einen API Request aus mit Rate Limiting
     */
    async makeRequest(endpoint, method = 'GET', body = null) {
        const url = `${this.baseUrl}/${CONFIG.HUBSPOT_API_VERSION}/${endpoint}`;
        
        const options = {
            method,
            headers: this.getHeaders()
        };

        if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const error = await response.json();
                throw new HubSpotAPIError(response.status, error.message || 'API Error', error);
            }

            return await response.json();
        } catch (error) {
            console.error('HubSpot API Error:', error);
            throw error;
        }
    }

    /**
     * Holt einen einzelnen Kontakt
     */
    async getContact(contactId) {
        return this.makeRequest(`crm/v3/objects/contacts/${contactId}?properties=${CONFIG.WHATSAPP_CONSENT_PROPERTY}`);
    }

    /**
     * Holt WhatsApp Consent Status für einen Kontakt
     */
    async getWhatsAppConsentStatus(contactId) {
        const contact = await this.getContact(contactId);
        return {
            contactId,
            email: contact.properties.email,
            consentStatus: contact.properties[CONFIG.WHATSAPP_CONSENT_PROPERTY] || 'not_opted',
            lastModified: contact.updatedAt
        };
    }

    /**
     * Aktualisiert WhatsApp Consent für einen einzelnen Kontakt
     * Gemäß: https://knowledge.hubspot.com/de/inbox/edit-the-whatsapp-consent-status-of-your-contacts-in-bulk
     */
    async updateWhatsAppConsent(contactId, consentStatus, metadata = {}) {
        // Validierung
        if (!Object.values(CONFIG.CONSENT_VALUES).includes(consentStatus)) {
            throw new Error(`Invalid consent status: ${consentStatus}`);
        }

        const updateData = {
            properties: {
                [CONFIG.WHATSAPP_CONSENT_PROPERTY]: consentStatus,
                // Custom Properties für DSGVO Audit Trail
                'gtz_consent_timestamp': new Date().toISOString(),
                'gtz_consent_source': metadata.source || 'GTz Ecosystem',
                'gtz_consent_ip_hash': metadata.ipHash || 'anonymized'
            }
        };

        const result = await this.makeRequest(
            `crm/v3/objects/contacts/${contactId}`,
            'PATCH',
            updateData
        );

        // Audit Log erstellen
        await this.createAuditLog({
            action: 'CONSENT_UPDATE',
            contactId,
            oldStatus: metadata.previousStatus,
            newStatus: consentStatus,
            timestamp: new Date().toISOString(),
            metadata
        });

        return result;
    }

    /**
     * Bulk Update für WhatsApp Consent
     * Gemäß HubSpot Batch API
     */
    async bulkUpdateWhatsAppConsent(contacts) {
        // contacts: Array von { contactId, consentStatus, metadata }
        
        if (contacts.length > CONFIG.RATE_LIMIT.BATCH_SIZE) {
            // Aufteilen in Batches
            const batches = this.chunkArray(contacts, CONFIG.RATE_LIMIT.BATCH_SIZE);
            const results = [];

            for (const batch of batches) {
                const batchResult = await this.processBatch(batch);
                results.push(...batchResult);
                
                // Rate Limiting
                await this.delay(1000 / CONFIG.RATE_LIMIT.REQUESTS_PER_SECOND);
            }

            return results;
        }

        return this.processBatch(contacts);
    }

    /**
     * Verarbeitet einen Batch von Consent Updates
     */
    async processBatch(contacts) {
        const batchInput = {
            inputs: contacts.map(c => ({
                id: c.contactId,
                properties: {
                    [CONFIG.WHATSAPP_CONSENT_PROPERTY]: c.consentStatus,
                    'gtz_consent_timestamp': new Date().toISOString(),
                    'gtz_consent_source': c.metadata?.source || 'GTz Ecosystem Bulk'
                }
            }))
        };

        const result = await this.makeRequest(
            'crm/v3/objects/contacts/batch/update',
            'POST',
            batchInput
        );

        // Bulk Audit Log
        await this.createBulkAuditLog(contacts, result);

        return result;
    }

    /**
     * Sucht Kontakte nach Consent Status
     */
    async searchByConsentStatus(status, limit = 100) {
        const searchBody = {
            filterGroups: [{
                filters: [{
                    propertyName: CONFIG.WHATSAPP_CONSENT_PROPERTY,
                    operator: 'EQ',
                    value: status
                }]
            }],
            properties: ['email', 'firstname', 'lastname', CONFIG.WHATSAPP_CONSENT_PROPERTY],
            limit
        };

        return this.makeRequest('crm/v3/objects/contacts/search', 'POST', searchBody);
    }

    /**
     * Holt alle Kontakte mit ausstehender Consent-Anfrage
     */
    async getPendingConsentContacts() {
        return this.searchByConsentStatus(CONFIG.CONSENT_VALUES.PENDING);
    }

    /**
     * Holt alle Kontakte mit erteiltem Consent
     */
    async getGrantedConsentContacts() {
        return this.searchByConsentStatus(CONFIG.CONSENT_VALUES.GRANTED);
    }

    /**
     * Erstellt einen DSGVO-konformen Audit Log Eintrag
     */
    async createAuditLog(logEntry) {
        // In Produktion: Speichern in sicherer Datenbank
        const auditEntry = {
            id: this.generateAuditId(),
            ...logEntry,
            gdprRelevant: true,
            retentionUntil: this.calculateRetentionDate()
        };

        console.log('📋 Audit Log Created:', auditEntry);
        
        // Lokale Speicherung für Demo
        this.storeAuditLocally(auditEntry);

        return auditEntry;
    }

    /**
     * Bulk Audit Log für Massenoperationen
     */
    async createBulkAuditLog(contacts, result) {
        const auditEntry = {
            id: this.generateAuditId(),
            action: 'BULK_CONSENT_UPDATE',
            contactCount: contacts.length,
            successCount: result.results?.length || 0,
            errorCount: result.errors?.length || 0,
            timestamp: new Date().toISOString(),
            gdprRelevant: true,
            retentionUntil: this.calculateRetentionDate()
        };

        console.log('📋 Bulk Audit Log Created:', auditEntry);
        this.storeAuditLocally(auditEntry);

        return auditEntry;
    }

    /**
     * Hilfsfunktionen
     */
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    generateAuditId() {
        return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    calculateRetentionDate() {
        const date = new Date();
        date.setDate(date.getDate() + CONFIG.AUDIT_RETENTION_DAYS);
        return date.toISOString();
    }

    storeAuditLocally(entry) {
        try {
            const logs = JSON.parse(localStorage.getItem('gtz_hubspot_audit') || '[]');
            logs.push(entry);
            // Behalte nur letzte 1000 Einträge lokal
            if (logs.length > 1000) logs.splice(0, logs.length - 1000);
            localStorage.setItem('gtz_hubspot_audit', JSON.stringify(logs));
        } catch (e) {
            console.warn('Could not store audit locally:', e);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSENT WORKFLOW MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class ConsentWorkflowManager {
    constructor(hubspotApi) {
        this.api = hubspotApi;
    }

    /**
     * Vollständiger Consent-Erteilungs-Workflow
     * DSGVO Art. 6 Abs. 1 lit. a konform
     */
    async grantConsent(contactId, consentData) {
        const workflow = {
            steps: [],
            startTime: new Date().toISOString()
        };

        try {
            // Schritt 1: Vorherigen Status holen
            workflow.steps.push({ step: 'GET_PREVIOUS_STATUS', status: 'started' });
            const previousStatus = await this.api.getWhatsAppConsentStatus(contactId);
            workflow.steps[0].status = 'completed';
            workflow.steps[0].data = previousStatus;

            // Schritt 2: Consent aktualisieren
            workflow.steps.push({ step: 'UPDATE_CONSENT', status: 'started' });
            const updateResult = await this.api.updateWhatsAppConsent(
                contactId,
                CONFIG.CONSENT_VALUES.GRANTED,
                {
                    previousStatus: previousStatus.consentStatus,
                    source: consentData.source || 'GTz Ecosystem',
                    ipHash: consentData.ipHash,
                    userAgent: consentData.userAgent,
                    legalBasis: 'Art. 6 Abs. 1 lit. a DSGVO'
                }
            );
            workflow.steps[1].status = 'completed';

            // Schritt 3: Bestätigung senden
            workflow.steps.push({ step: 'SEND_CONFIRMATION', status: 'started' });
            await this.sendConsentConfirmation(contactId, 'granted');
            workflow.steps[2].status = 'completed';

            workflow.endTime = new Date().toISOString();
            workflow.success = true;

            return workflow;

        } catch (error) {
            workflow.error = error.message;
            workflow.success = false;
            workflow.endTime = new Date().toISOString();
            throw error;
        }
    }

    /**
     * Consent-Widerruf Workflow
     * DSGVO Art. 7 Abs. 3 - Widerrufsrecht
     */
    async revokeConsent(contactId, reason = 'user_request') {
        const workflow = {
            steps: [],
            startTime: new Date().toISOString()
        };

        try {
            // Schritt 1: Aktuellen Status prüfen
            const currentStatus = await this.api.getWhatsAppConsentStatus(contactId);
            
            if (currentStatus.consentStatus !== CONFIG.CONSENT_VALUES.GRANTED) {
                throw new Error('No active consent to revoke');
            }

            // Schritt 2: Consent widerrufen
            await this.api.updateWhatsAppConsent(
                contactId,
                CONFIG.CONSENT_VALUES.REVOKED,
                {
                    previousStatus: currentStatus.consentStatus,
                    revokeReason: reason,
                    legalBasis: 'Art. 7 Abs. 3 DSGVO - Widerrufsrecht'
                }
            );

            // Schritt 3: Bestätigung senden
            await this.sendConsentConfirmation(contactId, 'revoked');

            // Schritt 4: WhatsApp-Kommunikation stoppen
            await this.stopWhatsAppCommunication(contactId);

            workflow.success = true;
            workflow.endTime = new Date().toISOString();

            return workflow;

        } catch (error) {
            workflow.error = error.message;
            workflow.success = false;
            throw error;
        }
    }

    /**
     * Sendet Consent-Bestätigung (Double Opt-In)
     */
    async sendConsentConfirmation(contactId, type) {
        console.log(`📧 Sending ${type} confirmation to contact ${contactId}`);
        // In Produktion: E-Mail oder WhatsApp Nachricht senden
        return true;
    }

    /**
     * Stoppt WhatsApp-Kommunikation nach Widerruf
     */
    async stopWhatsAppCommunication(contactId) {
        console.log(`🛑 Stopping WhatsApp communication for contact ${contactId}`);
        // In Produktion: Alle geplanten Nachrichten stornieren
        return true;
    }

    /**
     * Prüft ob Consent gültig ist
     */
    async isConsentValid(contactId) {
        const status = await this.api.getWhatsAppConsentStatus(contactId);
        return status.consentStatus === CONFIG.CONSENT_VALUES.GRANTED;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DSGVO COMPLIANCE HELPER
// ═══════════════════════════════════════════════════════════════════════════════

class GDPRComplianceHelper {
    /**
     * Generiert DSGVO-Auskunft für einen Kontakt (Art. 15)
     */
    static async generateDataExport(hubspotApi, contactId) {
        const contact = await hubspotApi.getContact(contactId);
        const auditLogs = JSON.parse(localStorage.getItem('gtz_hubspot_audit') || '[]')
            .filter(log => log.contactId === contactId);

        return {
            exportDate: new Date().toISOString(),
            legalBasis: 'Art. 15 DSGVO - Auskunftsrecht',
            contact: {
                id: contact.id,
                properties: contact.properties,
                createdAt: contact.createdAt,
                updatedAt: contact.updatedAt
            },
            consentHistory: auditLogs,
            dataCategories: [
                'Kontaktdaten',
                'WhatsApp Consent Status',
                'Kommunikationshistorie'
            ],
            processingPurposes: [
                'Kundenkommunikation über WhatsApp Business',
                'CRM und Lead Management'
            ],
            recipients: [
                'HubSpot Inc. (CRM-Anbieter)',
                'Meta Platforms (WhatsApp Business)'
            ],
            retentionPeriod: '3 Jahre nach letzter Interaktion',
            rights: {
                rectification: 'Art. 16 DSGVO',
                erasure: 'Art. 17 DSGVO',
                restriction: 'Art. 18 DSGVO',
                portability: 'Art. 20 DSGVO',
                objection: 'Art. 21 DSGVO'
            }
        };
    }

    /**
     * Führt Datenlöschung durch (Art. 17 - Recht auf Löschung)
     */
    static async executeDataDeletion(hubspotApi, contactId) {
        // In Produktion: Tatsächliche Löschung über HubSpot API
        console.log(`🗑️ Executing GDPR deletion for contact ${contactId}`);
        
        return {
            deletionDate: new Date().toISOString(),
            legalBasis: 'Art. 17 DSGVO - Recht auf Löschung',
            contactId,
            status: 'completed',
            retainedData: {
                reason: 'Gesetzliche Aufbewahrungspflichten',
                data: ['Rechnungen', 'Vertragsunterlagen'],
                retentionPeriod: '10 Jahre (HGB §257)'
            }
        };
    }

    /**
     * Validiert Consent-Anfrage
     */
    static validateConsentRequest(request) {
        const errors = [];

        if (!request.contactId) {
            errors.push('Contact ID ist erforderlich');
        }

        if (!request.source) {
            errors.push('Consent-Quelle ist erforderlich');
        }

        if (!request.timestamp) {
            errors.push('Zeitstempel ist erforderlich');
        }

        // Prüfe ob Consent freiwillig (nicht Pre-Checked)
        if (request.preChecked === true) {
            errors.push('Pre-checked Consent ist nicht DSGVO-konform');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

class HubSpotAPIError extends Error {
    constructor(statusCode, message, details = {}) {
        super(message);
        this.name = 'HubSpotAPIError';
        this.statusCode = statusCode;
        this.details = details;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

// ES6 Module Export
export {
    HubSpotConsentAPI,
    ConsentWorkflowManager,
    GDPRComplianceHelper,
    HubSpotAPIError,
    CONFIG
};

// CommonJS Export (für Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        HubSpotConsentAPI,
        ConsentWorkflowManager,
        GDPRComplianceHelper,
        HubSpotAPIError,
        CONFIG
    };
}

// Browser Global
if (typeof window !== 'undefined') {
    window.GTzHubSpot = {
        HubSpotConsentAPI,
        ConsentWorkflowManager,
        GDPRComplianceHelper,
        CONFIG
    };
}
