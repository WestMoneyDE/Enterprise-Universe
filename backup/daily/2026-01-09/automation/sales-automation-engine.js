/**
 * GTz Ecosystem - AI Sales Automation Engine
 * Automatische Lead-Generierung, Qualifizierung und Vertragsabschluss
 * 
 * @author Enterprise Universe
 * @version 2.0.0
 * @license Proprietary
 */

// ============================================================================
// KONFIGURATION - HIER DEINE ECHTEN API-KEYS EINTRAGEN
// ============================================================================

const CONFIG = {
    // HubSpot CRM
    hubspot: {
        apiKey: process.env.HUBSPOT_API_KEY || 'YOUR_HUBSPOT_API_KEY',
        portalId: process.env.HUBSPOT_PORTAL_ID || 'YOUR_PORTAL_ID',
        baseUrl: 'https://api.hubapi.com',
        pipelineId: 'default', // oder deine spezifische Pipeline-ID
        stages: {
            new: 'appointmentscheduled',
            qualified: 'qualifiedtobuy',
            proposal: 'presentationscheduled',
            negotiation: 'decisionmakerboughtin',
            won: 'closedwon',
            lost: 'closedlost'
        }
    },

    // WhatsApp Business API
    whatsapp: {
        apiKey: process.env.WHATSAPP_API_KEY || 'YOUR_WHATSAPP_API_KEY',
        phoneNumberId: process.env.WHATSAPP_PHONE_ID || 'YOUR_PHONE_NUMBER_ID',
        businessAccountId: process.env.WHATSAPP_BUSINESS_ID || 'YOUR_BUSINESS_ACCOUNT_ID',
        baseUrl: 'https://graph.facebook.com/v18.0'
    },

    // Zadarma VoIP
    zadarma: {
        apiKey: process.env.ZADARMA_API_KEY || 'YOUR_ZADARMA_KEY',
        apiSecret: process.env.ZADARMA_SECRET || 'YOUR_ZADARMA_SECRET',
        baseUrl: 'https://api.zadarma.com'
    },

    // Anthropic Claude Haiku 4.5 für AI-Funktionen
    anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || 'YOUR_ANTHROPIC_KEY',
        model: 'claude-haiku-4-5-20241022'
    },

    // Unternehmensdaten
    company: {
        name: 'West Money Bau',
        owner: 'Ömer Hüseyin Coşkun',
        email: 'kontakt@westmoney-bau.de',
        phone: '+49 XXX XXXXXXX',
        iban: 'DE42 1001 0178 9758 7887 93',
        services: [
            { name: 'Smart Home Integration', minValue: 15000, maxValue: 150000 },
            { name: 'LOXONE System', minValue: 25000, maxValue: 200000 },
            { name: 'Barrierefreies Bauen', minValue: 50000, maxValue: 500000 },
            { name: 'ComfortClick Integration', minValue: 10000, maxValue: 80000 },
            { name: 'Verisure Security', minValue: 5000, maxValue: 50000 }
        ]
    },

    // Automation Settings
    automation: {
        leadScoringThreshold: 60, // Minimum Score für Auto-Qualifizierung
        autoFollowUpDays: [1, 3, 7, 14, 30], // Tage nach Erstkontakt
        maxAutoMessages: 5, // Max automatische Nachrichten pro Lead
        workingHours: { start: 8, end: 20 }, // Nur während Geschäftszeiten
        responseTimeTargetMinutes: 15 // Ziel-Antwortzeit
    }
};

// ============================================================================
// HUBSPOT API CLIENT
// ============================================================================

class HubSpotClient {
    constructor(config) {
        this.config = config;
        this.headers = {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
        };
    }

    async request(method, endpoint, data = null) {
        const url = `${this.config.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: this.headers
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HubSpot API Error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('HubSpot Request Failed:', error);
            throw error;
        }
    }

    // -------------------------------------------------------------------------
    // CONTACTS
    // -------------------------------------------------------------------------

    async getAllContacts(limit = 100) {
        return this.request('GET', `/crm/v3/objects/contacts?limit=${limit}&properties=email,firstname,lastname,phone,company,lifecyclestage,hs_lead_status,hs_whatsapp_consent`);
    }

    async getContact(contactId) {
        return this.request('GET', `/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname,phone,company,lifecyclestage,hs_lead_status,hs_whatsapp_consent,notes_last_updated`);
    }

    async createContact(properties) {
        return this.request('POST', '/crm/v3/objects/contacts', { properties });
    }

    async updateContact(contactId, properties) {
        return this.request('PATCH', `/crm/v3/objects/contacts/${contactId}`, { properties });
    }

    async searchContacts(filters) {
        return this.request('POST', '/crm/v3/objects/contacts/search', {
            filterGroups: [{ filters }],
            properties: ['email', 'firstname', 'lastname', 'phone', 'company', 'lifecyclestage', 'hs_lead_status', 'hs_whatsapp_consent']
        });
    }

    // -------------------------------------------------------------------------
    // DEALS
    // -------------------------------------------------------------------------

    async getAllDeals(limit = 100) {
        return this.request('GET', `/crm/v3/objects/deals?limit=${limit}&properties=dealname,amount,dealstage,closedate,pipeline,hubspot_owner_id`);
    }

    async getDeal(dealId) {
        return this.request('GET', `/crm/v3/objects/deals/${dealId}?properties=dealname,amount,dealstage,closedate,pipeline`);
    }

    async createDeal(properties) {
        return this.request('POST', '/crm/v3/objects/deals', { properties });
    }

    async updateDeal(dealId, properties) {
        return this.request('PATCH', `/crm/v3/objects/deals/${dealId}`, { properties });
    }

    async associateDealToContact(dealId, contactId) {
        return this.request('PUT', `/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/deal_to_contact`);
    }

    // -------------------------------------------------------------------------
    // COMPANIES
    // -------------------------------------------------------------------------

    async createCompany(properties) {
        return this.request('POST', '/crm/v3/objects/companies', { properties });
    }

    async searchCompanies(query) {
        return this.request('POST', '/crm/v3/objects/companies/search', {
            filterGroups: [{
                filters: [{
                    propertyName: 'name',
                    operator: 'CONTAINS_TOKEN',
                    value: query
                }]
            }]
        });
    }

    // -------------------------------------------------------------------------
    // WHATSAPP CONSENT (nach HubSpot Dokumentation)
    // -------------------------------------------------------------------------

    async updateWhatsAppConsent(contactId, status) {
        // Status: 'opt_in', 'opt_out', 'not_opted', 'revoked'
        return this.updateContact(contactId, {
            hs_whatsapp_consent: status,
            hs_whatsapp_consent_date: new Date().toISOString()
        });
    }

    async bulkUpdateWhatsAppConsent(updates) {
        // updates = [{ contactId, status }, ...]
        const inputs = updates.map(u => ({
            id: u.contactId,
            properties: {
                hs_whatsapp_consent: u.status,
                hs_whatsapp_consent_date: new Date().toISOString()
            }
        }));

        return this.request('POST', '/crm/v3/objects/contacts/batch/update', { inputs });
    }

    async getContactsWithPendingConsent() {
        return this.searchContacts([{
            propertyName: 'hs_whatsapp_consent',
            operator: 'EQ',
            value: 'not_opted'
        }]);
    }

    // -------------------------------------------------------------------------
    // NOTES & ACTIVITIES
    // -------------------------------------------------------------------------

    async createNote(contactId, body) {
        const note = await this.request('POST', '/crm/v3/objects/notes', {
            properties: {
                hs_note_body: body,
                hs_timestamp: new Date().toISOString()
            }
        });

        // Associate note with contact
        await this.request('PUT', `/crm/v3/objects/notes/${note.id}/associations/contacts/${contactId}/note_to_contact`);
        return note;
    }

    // -------------------------------------------------------------------------
    // PIPELINE & ANALYTICS
    // -------------------------------------------------------------------------

    async getPipelineStats() {
        const deals = await this.getAllDeals(500);
        
        const stats = {
            total: deals.results.length,
            totalValue: 0,
            byStage: {},
            won: { count: 0, value: 0 },
            lost: { count: 0, value: 0 },
            open: { count: 0, value: 0 }
        };

        deals.results.forEach(deal => {
            const amount = parseFloat(deal.properties.amount) || 0;
            const stage = deal.properties.dealstage;
            
            stats.totalValue += amount;
            
            if (!stats.byStage[stage]) {
                stats.byStage[stage] = { count: 0, value: 0 };
            }
            stats.byStage[stage].count++;
            stats.byStage[stage].value += amount;

            if (stage === 'closedwon') {
                stats.won.count++;
                stats.won.value += amount;
            } else if (stage === 'closedlost') {
                stats.lost.count++;
                stats.lost.value += amount;
            } else {
                stats.open.count++;
                stats.open.value += amount;
            }
        });

        return stats;
    }
}

// ============================================================================
// WHATSAPP BUSINESS API CLIENT
// ============================================================================

class WhatsAppClient {
    constructor(config) {
        this.config = config;
        this.headers = {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
        };
    }

    async request(method, endpoint, data = null) {
        const url = `${this.config.baseUrl}/${this.config.phoneNumberId}${endpoint}`;
        const options = {
            method,
            headers: this.headers
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        return response.json();
    }

    // Sende Template-Nachricht (für erste Kontaktaufnahme - erfordert Consent)
    async sendTemplate(to, templateName, languageCode = 'de', components = []) {
        return this.request('POST', '/messages', {
            messaging_product: 'whatsapp',
            to: to,
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode },
                components: components
            }
        });
    }

    // Sende Text-Nachricht (nur nach Opt-In)
    async sendTextMessage(to, text) {
        return this.request('POST', '/messages', {
            messaging_product: 'whatsapp',
            to: to,
            type: 'text',
            text: { body: text }
        });
    }

    // Sende Dokument (Angebot, Vertrag)
    async sendDocument(to, documentUrl, filename, caption = '') {
        return this.request('POST', '/messages', {
            messaging_product: 'whatsapp',
            to: to,
            type: 'document',
            document: {
                link: documentUrl,
                filename: filename,
                caption: caption
            }
        });
    }

    // Sende interaktive Buttons
    async sendInteractiveButtons(to, bodyText, buttons) {
        return this.request('POST', '/messages', {
            messaging_product: 'whatsapp',
            to: to,
            type: 'interactive',
            interactive: {
                type: 'button',
                body: { text: bodyText },
                action: {
                    buttons: buttons.map((btn, i) => ({
                        type: 'reply',
                        reply: { id: `btn_${i}`, title: btn }
                    }))
                }
            }
        });
    }

    // Consent-Anfrage senden
    async sendConsentRequest(to, contactName) {
        const text = `Hallo ${contactName},

vielen Dank für Ihr Interesse an West Money Bau! 🏠

Um Sie optimal beraten zu können, möchten wir Sie gerne über WhatsApp kontaktieren.

Bitte bestätigen Sie Ihre Einwilligung zur WhatsApp-Kommunikation gemäß DSGVO Art. 6 Abs. 1 lit. a.

Sie können diese Einwilligung jederzeit widerrufen.`;

        return this.sendInteractiveButtons(to, text, [
            '✅ Ja, einverstanden',
            '❌ Nein, danke'
        ]);
    }
}

// ============================================================================
// AI LEAD SCORING & QUALIFICATION ENGINE
// ============================================================================

class AILeadScoringEngine {
    constructor(anthropicConfig) {
        this.config = anthropicConfig;
    }

    // Lead Score berechnen (0-100)
    calculateLeadScore(contact, interactions = []) {
        let score = 0;

        // Basisdaten (max 30 Punkte)
        if (contact.email) score += 10;
        if (contact.phone) score += 10;
        if (contact.company) score += 10;

        // Engagement (max 40 Punkte)
        const hasWhatsAppConsent = contact.hs_whatsapp_consent === 'opt_in';
        if (hasWhatsAppConsent) score += 15;

        const emailOpens = interactions.filter(i => i.type === 'email_open').length;
        score += Math.min(emailOpens * 3, 15);

        const websiteVisits = interactions.filter(i => i.type === 'page_view').length;
        score += Math.min(websiteVisits * 2, 10);

        // Firmengröße & Budget-Indikatoren (max 30 Punkte)
        if (contact.company) {
            // Hier könnte man externe Daten (z.B. LinkedIn, Handelsregister) abfragen
            score += 15;
        }

        // Zeitliche Faktoren
        const daysSinceCreation = this.daysSince(contact.createdate);
        if (daysSinceCreation < 7) score += 5; // Frischer Lead
        if (daysSinceCreation > 90) score -= 10; // Alter Lead

        return Math.max(0, Math.min(100, score));
    }

    // Lead qualifizieren basierend auf Score
    qualifyLead(score) {
        if (score >= 80) return { status: 'hot', priority: 1, action: 'immediate_call' };
        if (score >= 60) return { status: 'warm', priority: 2, action: 'send_proposal' };
        if (score >= 40) return { status: 'nurture', priority: 3, action: 'email_sequence' };
        return { status: 'cold', priority: 4, action: 'long_term_nurture' };
    }

    // AI-basierte Projekt-Klassifizierung
    async classifyProject(description) {
        const prompt = `Analysiere folgende Projektanfrage und klassifiziere sie:

Anfrage: "${description}"

Kategorien:
1. Smart Home Integration (€15.000-150.000)
2. LOXONE System (€25.000-200.000)
3. Barrierefreies Bauen (€50.000-500.000)
4. ComfortClick Integration (€10.000-80.000)
5. Verisure Security (€5.000-50.000)

Antworte im JSON-Format:
{
  "category": "Kategoriename",
  "estimatedBudget": { "min": 0, "max": 0 },
  "confidence": 0.0-1.0,
  "keyFeatures": ["feature1", "feature2"],
  "recommendedApproach": "Beschreibung"
}`;

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': this.config.apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.config.model,
                    max_tokens: 1024,
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            const data = await response.json();
            return JSON.parse(data.content[0].text);
        } catch (error) {
            console.error('AI Classification Error:', error);
            return null;
        }
    }

    // AI-generierte personalisierte Nachricht
    async generatePersonalizedMessage(contact, context) {
        const prompt = `Erstelle eine professionelle, persönliche WhatsApp-Nachricht für:

Kontakt: ${contact.firstname} ${contact.lastname}
Firma: ${contact.company || 'Privatperson'}
Kontext: ${context}

Die Nachricht soll:
- Professionell aber freundlich sein
- Auf Deutsch sein
- Max. 200 Zeichen
- Einen klaren Call-to-Action haben
- Von West Money Bau (Smart Home & Barrierefreies Bauen) kommen

Nur die Nachricht ausgeben, keine Erklärungen.`;

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': this.config.apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.config.model,
                    max_tokens: 200,
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            const data = await response.json();
            return data.content[0].text.trim();
        } catch (error) {
            console.error('AI Message Generation Error:', error);
            return null;
        }
    }

    daysSince(dateString) {
        if (!dateString) return 999;
        const date = new Date(dateString);
        const now = new Date();
        return Math.floor((now - date) / (1000 * 60 * 60 * 24));
    }

    // =========================================================================
    // ML SCORING INTEGRATION (West Money OS API)
    // =========================================================================

    /**
     * Holt ML-basierten Score von West Money OS API
     * Fallback auf lokales rule-based Scoring wenn API nicht verfügbar
     */
    async getMLScore(contactId, dealData = {}) {
        const apiUrl = process.env.WEST_MONEY_API_URL || 'http://localhost:8000';
        const apiKey = process.env.WEST_MONEY_API_KEY;

        // Prüfen ob ML Scoring aktiviert ist
        if (process.env.USE_ML_SCORING !== 'true') {
            return null;
        }

        try {
            const response = await fetch(`${apiUrl}/api/v1/scoring/score-contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
                },
                body: JSON.stringify({
                    hubspot_contact_id: contactId,
                    email: dealData.email,
                    phone: dealData.phone,
                    name: dealData.name,
                    company: dealData.company,
                    amount: dealData.amount || 0,
                    probability: dealData.probability || 20,
                    stage: dealData.stage || 'lead',
                    source: 'hubspot',
                    description: dealData.description
                })
            });

            if (!response.ok) {
                console.warn(`ML Scoring API returned ${response.status}`);
                return null;
            }

            const result = await response.json();
            return {
                score: result.score,
                probability: result.conversion_probability,
                tier: result.score_tier,
                priority: result.priority,
                action: result.recommended_action,
                factors: result.feature_contributions,
                modelVersion: result.model_version,
                source: 'ml_model'
            };
        } catch (error) {
            console.warn('ML Scoring unavailable, using local scoring:', error.message);
            return null;
        }
    }

    /**
     * Erweiterte Lead-Qualifizierung mit ML-Support
     * Versucht erst ML-Score, dann Fallback auf lokales Scoring
     */
    async qualifyLeadWithML(contact, interactions = []) {
        // Erst ML-Score versuchen
        const mlScore = await this.getMLScore(contact.id || contact.hs_object_id, {
            email: contact.email,
            phone: contact.phone,
            name: `${contact.firstname || ''} ${contact.lastname || ''}`.trim(),
            company: contact.company,
            amount: contact.deal_amount || contact.amount,
            probability: contact.probability,
            stage: contact.lifecyclestage || 'lead',
            description: contact.description
        });

        if (mlScore) {
            console.log(`ML Score für ${contact.email}: ${mlScore.score} (${mlScore.tier})`);
            return {
                score: mlScore.score,
                status: mlScore.tier,
                priority: mlScore.priority,
                action: this.mapActionToLocal(mlScore.action),
                factors: mlScore.factors,
                source: 'ml_model',
                modelVersion: mlScore.modelVersion
            };
        }

        // Fallback auf lokales rule-based Scoring
        const score = this.calculateLeadScore(contact, interactions);
        const qualification = this.qualifyLead(score);

        return {
            score,
            status: qualification.status,
            priority: qualification.priority,
            action: qualification.action,
            factors: this.getLocalFactors(contact, interactions),
            source: 'rule_based'
        };
    }

    /**
     * Mapped ML-Actions zu lokalen Actions
     */
    mapActionToLocal(mlAction) {
        const actionMapping = {
            'immediate_call': 'immediate_call',
            'send_proposal': 'send_proposal',
            'email_sequence': 'email_sequence',
            'long_term_nurture': 'long_term_nurture'
        };
        return actionMapping[mlAction] || 'email_sequence';
    }

    /**
     * Gibt lokale Scoring-Faktoren zurück (für Fallback)
     */
    getLocalFactors(contact, interactions = []) {
        return {
            has_email: contact.email ? 0.15 : 0,
            has_phone: contact.phone ? 0.15 : 0,
            has_company: contact.company ? 0.15 : 0,
            whatsapp_consent: contact.hs_whatsapp_consent === 'opt_in' ? 0.20 : 0,
            engagement: Math.min(interactions.length * 0.05, 0.25),
            freshness: this.daysSince(contact.createdate) < 7 ? 0.10 : 0
        };
    }

    /**
     * Tier zu Priorität konvertieren
     */
    tierToPriority(tier) {
        const mapping = { hot: 1, warm: 2, nurture: 3, cold: 4 };
        return mapping[tier] || 4;
    }

    /**
     * Batch-Scoring für mehrere Kontakte
     */
    async batchScoreContacts(contacts) {
        const results = [];
        for (const contact of contacts) {
            const result = await this.qualifyLeadWithML(contact);
            results.push({
                contactId: contact.id || contact.hs_object_id,
                email: contact.email,
                ...result
            });
        }
        return results;
    }
}

// ============================================================================
// AUTOMATISCHE VERTRAGS-GENERIERUNG
// ============================================================================

class ContractGenerator {
    constructor(companyConfig) {
        this.company = companyConfig;
    }

    generateProposal(contact, project) {
        const today = new Date().toLocaleDateString('de-DE');
        const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE');

        return {
            type: 'proposal',
            number: `ANG-${Date.now()}`,
            date: today,
            validUntil: validUntil,
            client: {
                name: `${contact.firstname} ${contact.lastname}`,
                company: contact.company || '',
                email: contact.email,
                phone: contact.phone
            },
            project: {
                category: project.category,
                description: project.description,
                features: project.features || []
            },
            pricing: {
                subtotal: project.estimatedValue,
                tax: project.estimatedValue * 0.19,
                total: project.estimatedValue * 1.19
            },
            terms: [
                '50% Anzahlung bei Auftragserteilung',
                '50% nach Fertigstellung',
                'Gewährleistung: 2 Jahre',
                'Zahlungsziel: 14 Tage netto'
            ],
            bankDetails: {
                name: this.company.owner,
                iban: this.company.iban,
                bank: 'N26 Bank'
            }
        };
    }

    generateContract(contact, project, proposalNumber) {
        const today = new Date().toLocaleDateString('de-DE');

        return {
            type: 'contract',
            number: `VTR-${Date.now()}`,
            proposalRef: proposalNumber,
            date: today,
            parties: {
                contractor: {
                    name: this.company.name,
                    representative: this.company.owner,
                    address: '[Adresse einfügen]',
                    email: this.company.email,
                    phone: this.company.phone
                },
                client: {
                    name: `${contact.firstname} ${contact.lastname}`,
                    company: contact.company || '',
                    address: contact.address || '[Adresse einfügen]',
                    email: contact.email,
                    phone: contact.phone
                }
            },
            scope: {
                category: project.category,
                description: project.description,
                deliverables: project.features || [],
                timeline: project.timeline || '8-12 Wochen'
            },
            commercialTerms: {
                totalPrice: project.estimatedValue * 1.19,
                paymentSchedule: [
                    { milestone: 'Auftragserteilung', percentage: 50 },
                    { milestone: 'Fertigstellung', percentage: 50 }
                ],
                paymentTerms: '14 Tage netto'
            },
            legalTerms: {
                warranty: '24 Monate',
                liability: 'Gemäß gesetzlicher Regelungen',
                cancellation: '4 Wochen vor Projektbeginn',
                jurisdiction: 'Düsseldorf'
            },
            signatures: {
                contractor: { name: this.company.owner, date: null, signature: null },
                client: { name: `${contact.firstname} ${contact.lastname}`, date: null, signature: null }
            },
            gdprConsent: {
                dataProcessing: true,
                whatsappCommunication: contact.hs_whatsapp_consent === 'opt_in',
                marketingConsent: false
            }
        };
    }

    // HTML-Version des Angebots für PDF-Generierung
    proposalToHTML(proposal) {
        return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Angebot ${proposal.number}</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a2e; }
        .header { display: flex; justify-content: space-between; border-bottom: 3px solid #00f0ff; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #00f0ff; }
        .doc-info { text-align: right; }
        .doc-number { font-size: 18px; font-weight: bold; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 14px; font-weight: bold; color: #666; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        .client-info { background: #f8f9fa; padding: 20px; border-radius: 8px; }
        .project-box { background: linear-gradient(135deg, #00f0ff15, #8b5cf615); padding: 20px; border-radius: 8px; border-left: 4px solid #00f0ff; }
        .pricing-table { width: 100%; border-collapse: collapse; }
        .pricing-table td { padding: 12px; border-bottom: 1px solid #eee; }
        .pricing-table .total { font-size: 18px; font-weight: bold; background: #00f0ff; color: white; }
        .terms { font-size: 12px; color: #666; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        .signature-line { margin-top: 60px; border-top: 1px solid #333; width: 200px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">WEST MONEY BAU</div>
        <div class="doc-info">
            <div class="doc-number">Angebot ${proposal.number}</div>
            <div>Datum: ${proposal.date}</div>
            <div>Gültig bis: ${proposal.validUntil}</div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Kunde</div>
        <div class="client-info">
            <strong>${proposal.client.company || proposal.client.name}</strong><br>
            ${proposal.client.company ? proposal.client.name + '<br>' : ''}
            ${proposal.client.email}<br>
            ${proposal.client.phone || ''}
        </div>
    </div>

    <div class="section">
        <div class="section-title">Projektbeschreibung</div>
        <div class="project-box">
            <strong>${proposal.project.category}</strong><br><br>
            ${proposal.project.description || 'Gemäß Besprechung'}
        </div>
    </div>

    <div class="section">
        <div class="section-title">Preisübersicht</div>
        <table class="pricing-table">
            <tr>
                <td>Nettobetrag</td>
                <td style="text-align: right;">€${proposal.pricing.subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
                <td>MwSt. (19%)</td>
                <td style="text-align: right;">€${proposal.pricing.tax.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr class="total">
                <td>Gesamtbetrag</td>
                <td style="text-align: right;">€${proposal.pricing.total.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Zahlungsbedingungen</div>
        <ul class="terms">
            ${proposal.terms.map(t => `<li>${t}</li>`).join('')}
        </ul>
    </div>

    <div class="section">
        <div class="section-title">Bankverbindung</div>
        <p>
            ${proposal.bankDetails.name}<br>
            IBAN: ${proposal.bankDetails.iban}<br>
            ${proposal.bankDetails.bank}
        </p>
    </div>

    <div class="footer">
        <p>
            Bei Auftragserteilung senden Sie uns bitte dieses Angebot unterschrieben zurück.<br>
            Wir freuen uns auf die Zusammenarbeit!
        </p>
        
        <div class="signature-line"></div>
        <p>Ort, Datum, Unterschrift Auftraggeber</p>
    </div>
</body>
</html>`;
    }
}

// ============================================================================
// AUTOMATION WORKFLOW ENGINE
// ============================================================================

class AutomationWorkflowEngine {
    constructor(hubspot, whatsapp, aiEngine, contractGenerator) {
        this.hubspot = hubspot;
        this.whatsapp = whatsapp;
        this.ai = aiEngine;
        this.contracts = contractGenerator;
        this.workflows = new Map();
        this.auditLog = [];
    }

    // Hauptprozess: Neuen Lead verarbeiten
    async processNewLead(contactData) {
        const log = this.createAuditEntry('PROCESS_NEW_LEAD', contactData);

        try {
            // 1. Kontakt in HubSpot erstellen/aktualisieren
            let contact = await this.hubspot.createContact({
                email: contactData.email,
                firstname: contactData.firstname,
                lastname: contactData.lastname,
                phone: contactData.phone,
                company: contactData.company,
                lifecyclestage: 'lead',
                hs_lead_status: 'NEW'
            });

            log.contactId = contact.id;

            // 2. Lead Score berechnen
            const score = this.ai.calculateLeadScore(contact.properties);
            const qualification = this.ai.qualifyLead(score);

            log.score = score;
            log.qualification = qualification;

            // 3. WhatsApp Consent anfragen (wenn Telefonnummer vorhanden)
            if (contactData.phone && contactData.phone.startsWith('+')) {
                await this.requestWhatsAppConsent(contact.id, contactData);
            }

            // 4. Deal erstellen wenn Score hoch genug
            if (score >= CONFIG.automation.leadScoringThreshold) {
                const deal = await this.createDealForLead(contact, qualification);
                log.dealId = deal.id;
            }

            // 5. Automation-Workflow starten
            this.startWorkflow(contact.id, qualification.action);

            log.status = 'SUCCESS';
            return { contact, score, qualification, log };

        } catch (error) {
            log.status = 'ERROR';
            log.error = error.message;
            throw error;
        } finally {
            this.auditLog.push(log);
        }
    }

    // WhatsApp Consent anfragen
    async requestWhatsAppConsent(contactId, contactData) {
        const phone = contactData.phone.replace(/\s/g, '');
        
        // Consent-Anfrage senden
        await this.whatsapp.sendConsentRequest(phone, contactData.firstname);

        // Status in HubSpot aktualisieren
        await this.hubspot.updateWhatsAppConsent(contactId, 'not_opted');

        // Note erstellen
        await this.hubspot.createNote(contactId, 
            `🔔 WhatsApp Consent-Anfrage gesendet am ${new Date().toLocaleString('de-DE')}`
        );
    }

    // Deal für Lead erstellen
    async createDealForLead(contact, qualification) {
        const properties = contact.properties;
        
        // Geschätzten Wert basierend auf Qualifikation berechnen
        const estimatedValue = this.estimateDealValue(qualification);

        const deal = await this.hubspot.createDeal({
            dealname: `${properties.company || properties.firstname + ' ' + properties.lastname} - Smart Home Projekt`,
            amount: estimatedValue,
            dealstage: CONFIG.hubspot.stages.new,
            pipeline: CONFIG.hubspot.pipelineId,
            closedate: this.calculateExpectedCloseDate(qualification)
        });

        // Deal mit Kontakt verknüpfen
        await this.hubspot.associateDealToContact(deal.id, contact.id);

        return deal;
    }

    // Workflow starten
    startWorkflow(contactId, action) {
        const workflow = {
            contactId,
            action,
            startedAt: new Date(),
            steps: [],
            status: 'ACTIVE'
        };

        this.workflows.set(contactId, workflow);

        // Ersten Schritt planen
        this.scheduleNextStep(contactId);
    }

    // Nächsten Workflow-Schritt planen
    async scheduleNextStep(contactId) {
        const workflow = this.workflows.get(contactId);
        if (!workflow || workflow.status !== 'ACTIVE') return;

        const contact = await this.hubspot.getContact(contactId);
        const stepNumber = workflow.steps.length;

        // Prüfe ob max. Schritte erreicht
        if (stepNumber >= CONFIG.automation.maxAutoMessages) {
            workflow.status = 'COMPLETED_MAX_STEPS';
            return;
        }

        // Hole Follow-Up-Tage
        const daysToWait = CONFIG.automation.autoFollowUpDays[stepNumber] || 30;
        const nextStepDate = new Date(Date.now() + daysToWait * 24 * 60 * 60 * 1000);

        // In Produktion: Hier würde ein Job-Scheduler verwendet werden
        console.log(`📅 Nächster Schritt für ${contactId} geplant: ${nextStepDate.toLocaleDateString('de-DE')}`);

        workflow.nextStep = {
            date: nextStepDate,
            action: this.determineNextAction(contact.properties, stepNumber)
        };
    }

    // Nächste Aktion bestimmen
    determineNextAction(contact, stepNumber) {
        const hasConsent = contact.hs_whatsapp_consent === 'opt_in';
        const dealStage = contact.hs_lead_status;

        if (stepNumber === 0) {
            return hasConsent ? 'whatsapp_intro' : 'email_intro';
        }

        if (stepNumber === 1) {
            return 'send_info_material';
        }

        if (stepNumber === 2) {
            return 'schedule_call';
        }

        if (stepNumber === 3) {
            return 'send_proposal';
        }

        return 'final_followup';
    }

    // Follow-Up ausführen
    async executeFollowUp(contactId) {
        const workflow = this.workflows.get(contactId);
        if (!workflow || !workflow.nextStep) return;

        const contact = await this.hubspot.getContact(contactId);
        const action = workflow.nextStep.action;
        const phone = contact.properties.phone;
        const hasConsent = contact.properties.hs_whatsapp_consent === 'opt_in';

        let result;

        switch (action) {
            case 'whatsapp_intro':
                if (hasConsent && phone) {
                    const message = await this.ai.generatePersonalizedMessage(
                        contact.properties, 
                        'Erstkontakt nach Consent'
                    );
                    result = await this.whatsapp.sendTextMessage(phone, message);
                }
                break;

            case 'send_info_material':
                if (hasConsent && phone) {
                    result = await this.whatsapp.sendDocument(
                        phone,
                        'https://westmoney-bau.de/downloads/info-broschure.pdf',
                        'West_Money_Bau_Infobroschuere.pdf',
                        '📄 Hier ist unsere aktuelle Informationsbroschüre!'
                    );
                }
                break;

            case 'send_proposal':
                await this.generateAndSendProposal(contactId);
                break;

            case 'schedule_call':
                if (hasConsent && phone) {
                    result = await this.whatsapp.sendInteractiveButtons(
                        phone,
                        '📞 Wann passt Ihnen ein kurzes Telefonat am besten?',
                        ['Morgens (9-12)', 'Nachmittags (13-17)', 'Rückruf erbeten']
                    );
                }
                break;

            default:
                console.log(`Unbekannte Aktion: ${action}`);
        }

        // Schritt dokumentieren
        workflow.steps.push({
            action,
            executedAt: new Date(),
            result: result ? 'SUCCESS' : 'SKIPPED'
        });

        // Nächsten Schritt planen
        this.scheduleNextStep(contactId);

        return result;
    }

    // Angebot generieren und senden
    async generateAndSendProposal(contactId) {
        const contact = await this.hubspot.getContact(contactId);
        const properties = contact.properties;
        const phone = properties.phone;
        const hasConsent = properties.hs_whatsapp_consent === 'opt_in';

        // Projekt-Klassifizierung via AI
        const projectInfo = await this.ai.classifyProject(
            properties.message || 'Smart Home Projekt'
        );

        const project = {
            category: projectInfo?.category || 'Smart Home Integration',
            description: 'Smart Home Komplettlösung nach Maß',
            estimatedValue: projectInfo?.estimatedBudget?.min || 25000,
            features: projectInfo?.keyFeatures || ['Lichtsteuerung', 'Heizungssteuerung', 'Sicherheit']
        };

        // Angebot generieren
        const proposal = this.contracts.generateProposal(properties, project);

        // In HubSpot dokumentieren
        await this.hubspot.createNote(contactId, 
            `📄 Angebot ${proposal.number} erstellt\n` +
            `Kategorie: ${project.category}\n` +
            `Wert: €${proposal.pricing.total.toLocaleString('de-DE')}`
        );

        // Deal aktualisieren
        const deals = await this.hubspot.searchContacts([{
            propertyName: 'associations.deal',
            operator: 'HAS_PROPERTY'
        }]);

        // Per WhatsApp senden wenn Consent vorhanden
        if (hasConsent && phone) {
            // In Produktion: PDF generieren und hochladen
            await this.whatsapp.sendTextMessage(phone,
                `📋 Guten Tag ${properties.firstname}!\n\n` +
                `Ihr persönliches Angebot ${proposal.number} ist fertig.\n\n` +
                `Projekt: ${project.category}\n` +
                `Investition: €${proposal.pricing.total.toLocaleString('de-DE')} (inkl. MwSt.)\n\n` +
                `Das Angebot sende ich Ihnen gleich als PDF. Bei Fragen stehe ich gerne zur Verfügung! 🏠`
            );
        }

        return proposal;
    }

    // Vertrag nach Angebotsannahme
    async processProposalAcceptance(contactId, proposalNumber) {
        const contact = await this.hubspot.getContact(contactId);
        const properties = contact.properties;
        const phone = properties.phone;
        const hasConsent = properties.hs_whatsapp_consent === 'opt_in';

        // Projekt-Daten (würde normalerweise aus der DB kommen)
        const project = {
            category: 'Smart Home Integration',
            description: 'Gemäß Angebot ' + proposalNumber,
            estimatedValue: 25000,
            features: [],
            timeline: '8-12 Wochen'
        };

        // Vertrag generieren
        const contract = this.contracts.generateContract(properties, project, proposalNumber);

        // Deal-Status aktualisieren
        await this.hubspot.createNote(contactId,
            `🎉 DEAL GEWONNEN!\n\n` +
            `Angebot ${proposalNumber} angenommen\n` +
            `Vertrag ${contract.number} erstellt\n` +
            `Wert: €${contract.commercialTerms.totalPrice.toLocaleString('de-DE')}`
        );

        // Benachrichtigung senden
        if (hasConsent && phone) {
            await this.whatsapp.sendTextMessage(phone,
                `🎉 Fantastisch, ${properties.firstname}!\n\n` +
                `Vielen Dank für Ihr Vertrauen in West Money Bau!\n\n` +
                `Ihr Vertrag ${contract.number} wird gerade vorbereitet. ` +
                `Sie erhalten ihn in Kürze zur digitalen Unterschrift.\n\n` +
                `Wir freuen uns auf die Zusammenarbeit! 🏠✨`
            );
        }

        return contract;
    }

    // Hilfsfunktionen
    estimateDealValue(qualification) {
        const baseValues = {
            hot: 75000,
            warm: 45000,
            nurture: 25000,
            cold: 15000
        };
        return baseValues[qualification.status] || 25000;
    }

    calculateExpectedCloseDate(qualification) {
        const daysToClose = {
            hot: 30,
            warm: 60,
            nurture: 90,
            cold: 180
        };
        const days = daysToClose[qualification.status] || 90;
        return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    createAuditEntry(action, data) {
        return {
            id: `AUDIT-${Date.now()}`,
            action,
            timestamp: new Date().toISOString(),
            data,
            status: 'PENDING'
        };
    }

    // Statistiken abrufen
    async getAutomationStats() {
        const stats = {
            activeWorkflows: 0,
            completedWorkflows: 0,
            totalMessages: 0,
            proposalsSent: 0,
            contractsGenerated: 0,
            conversionRate: 0
        };

        this.workflows.forEach(w => {
            if (w.status === 'ACTIVE') stats.activeWorkflows++;
            else stats.completedWorkflows++;
            stats.totalMessages += w.steps.length;
        });

        const pipelineStats = await this.hubspot.getPipelineStats();
        if (pipelineStats.total > 0) {
            stats.conversionRate = (pipelineStats.won.count / pipelineStats.total * 100).toFixed(1);
        }

        return { ...stats, pipeline: pipelineStats };
    }
}

// ============================================================================
// LEAD FINDER - Automatische Lead-Generierung
// ============================================================================

class AutomaticLeadFinder {
    constructor(hubspot, config) {
        this.hubspot = hubspot;
        this.config = config;
        this.sources = [];
    }

    // Web-Formular Lead erfassen
    async captureWebFormLead(formData) {
        const lead = {
            email: formData.email,
            firstname: formData.name?.split(' ')[0] || '',
            lastname: formData.name?.split(' ').slice(1).join(' ') || '',
            phone: formData.phone || '',
            company: formData.company || '',
            message: formData.message || '',
            source: 'web_form',
            gdprConsent: formData.gdprConsent === true,
            whatsappConsent: formData.whatsappConsent === true
        };

        if (!lead.gdprConsent) {
            throw new Error('DSGVO-Einwilligung erforderlich');
        }

        return this.hubspot.createContact({
            ...lead,
            hs_whatsapp_consent: lead.whatsappConsent ? 'opt_in' : 'not_opted',
            hs_legal_basis: 'Art. 6 Abs. 1 lit. a DSGVO'
        });
    }

    // WhatsApp eingehende Nachricht verarbeiten
    async processIncomingWhatsApp(message) {
        const phone = message.from;
        const text = message.text?.body || '';
        const name = message.contacts?.[0]?.profile?.name || '';

        // Prüfen ob Kontakt existiert
        const existing = await this.hubspot.searchContacts([{
            propertyName: 'phone',
            operator: 'EQ',
            value: phone
        }]);

        if (existing.total > 0) {
            // Existierender Kontakt - Nachricht als Note speichern
            const contact = existing.results[0];
            await this.hubspot.createNote(contact.id, `📱 WhatsApp Nachricht:\n${text}`);
            
            // Consent bestätigen (Kunde hat aktiv geschrieben)
            await this.hubspot.updateWhatsAppConsent(contact.id, 'opt_in');
            
            return { type: 'existing', contact };
        } else {
            // Neuer Lead aus WhatsApp
            const contact = await this.hubspot.createContact({
                phone: phone,
                firstname: name.split(' ')[0] || 'WhatsApp',
                lastname: name.split(' ').slice(1).join(' ') || 'Kontakt',
                hs_whatsapp_consent: 'opt_in', // Hat aktiv geschrieben
                hs_legal_basis: 'Art. 6 Abs. 1 lit. a DSGVO (aktive Kontaktaufnahme)',
                lifecyclestage: 'lead',
                hs_lead_status: 'NEW'
            });

            await this.hubspot.createNote(contact.id, 
                `🆕 Neuer Lead via WhatsApp\n` +
                `Erste Nachricht: ${text}`
            );

            return { type: 'new', contact };
        }
    }

    // Zadarma Anruf verarbeiten
    async processIncomingCall(callData) {
        const phone = callData.caller_id;
        const duration = callData.duration;

        // Prüfen ob Kontakt existiert
        const existing = await this.hubspot.searchContacts([{
            propertyName: 'phone',
            operator: 'EQ', 
            value: phone
        }]);

        if (existing.total > 0) {
            const contact = existing.results[0];
            await this.hubspot.createNote(contact.id, 
                `📞 Eingehender Anruf\n` +
                `Dauer: ${duration} Sekunden\n` +
                `Zeit: ${new Date().toLocaleString('de-DE')}`
            );
            return { type: 'existing', contact };
        } else {
            // Neuer Lead aus Anruf
            const contact = await this.hubspot.createContact({
                phone: phone,
                firstname: 'Telefonischer',
                lastname: 'Kontakt',
                lifecyclestage: 'lead',
                hs_lead_status: 'NEW'
            });

            await this.hubspot.createNote(contact.id,
                `🆕 Neuer Lead via Telefon\n` +
                `Anrufdauer: ${duration} Sekunden`
            );

            return { type: 'new', contact };
        }
    }
}

// ============================================================================
// EXPORT & INITIALISIERUNG
// ============================================================================

// Singleton-Instanzen erstellen
const hubspotClient = new HubSpotClient(CONFIG.hubspot);
const whatsappClient = new WhatsAppClient(CONFIG.whatsapp);
const aiEngine = new AILeadScoringEngine(CONFIG.anthropic);
const contractGenerator = new ContractGenerator(CONFIG.company);

const automationEngine = new AutomationWorkflowEngine(
    hubspotClient,
    whatsappClient,
    aiEngine,
    contractGenerator
);

const leadFinder = new AutomaticLeadFinder(hubspotClient, CONFIG);

// Export für verschiedene Umgebungen
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG,
        HubSpotClient,
        WhatsAppClient,
        AILeadScoringEngine,
        ContractGenerator,
        AutomationWorkflowEngine,
        AutomaticLeadFinder,
        // Initialisierte Instanzen
        hubspotClient,
        whatsappClient,
        aiEngine,
        contractGenerator,
        automationEngine,
        leadFinder
    };
}

if (typeof window !== 'undefined') {
    window.GTzAutomation = {
        CONFIG,
        hubspotClient,
        whatsappClient,
        aiEngine,
        contractGenerator,
        automationEngine,
        leadFinder
    };
}

// ============================================================================
// BEISPIEL-VERWENDUNG
// ============================================================================

/*
// Neuen Lead verarbeiten
const result = await automationEngine.processNewLead({
    email: 'kunde@beispiel.de',
    firstname: 'Max',
    lastname: 'Mustermann',
    phone: '+49 170 1234567',
    company: 'Mustermann GmbH'
});

console.log('Lead Score:', result.score);
console.log('Qualifikation:', result.qualification);

// WhatsApp-Nachricht verarbeiten
const whatsappLead = await leadFinder.processIncomingWhatsApp({
    from: '+491701234567',
    text: { body: 'Hallo, ich interessiere mich für Smart Home' },
    contacts: [{ profile: { name: 'Max Mustermann' } }]
});

// Angebot senden
const proposal = await automationEngine.generateAndSendProposal(contactId);

// Vertrag nach Annahme
const contract = await automationEngine.processProposalAcceptance(contactId, 'ANG-123456');

// Statistiken abrufen
const stats = await automationEngine.getAutomationStats();
console.log('Pipeline-Wert:', stats.pipeline.totalValue);
console.log('Conversion Rate:', stats.conversionRate + '%');
*/
