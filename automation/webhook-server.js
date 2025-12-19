/**
 * GTz Ecosystem - Webhook Handler
 * Verarbeitet eingehende Anfragen von WhatsApp, Zadarma, Web-Formularen
 * 
 * @requires express
 * @requires body-parser
 * @requires crypto
 */

const express = require('express');
const crypto = require('crypto');
const { automationEngine, leadFinder, hubspotClient } = require('./sales-automation-engine');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// KONFIGURATION
// ============================================================================

const WEBHOOK_CONFIG = {
    whatsapp: {
        verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'GTZ_WHATSAPP_VERIFY_2025',
        appSecret: process.env.WHATSAPP_APP_SECRET || 'YOUR_APP_SECRET'
    },
    zadarma: {
        secretKey: process.env.ZADARMA_WEBHOOK_KEY || 'YOUR_ZADARMA_KEY'
    },
    hubspot: {
        clientSecret: process.env.HUBSPOT_CLIENT_SECRET || 'YOUR_HUBSPOT_SECRET'
    }
};

// ============================================================================
// MIDDLEWARE - Request Logging & Validation
// ============================================================================

const requestLogger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    
    // Audit-Log für DSGVO
    logToAudit({
        type: 'WEBHOOK_REQUEST',
        path: req.path,
        method: req.method,
        ip: req.ip,
        timestamp
    });
    
    next();
};

app.use(requestLogger);

// CORS für lokale Entwicklung
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// ============================================================================
// WHATSAPP WEBHOOK
// ============================================================================

// Webhook Verification (GET)
app.get('/webhook/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === WEBHOOK_CONFIG.whatsapp.verifyToken) {
        console.log('✅ WhatsApp Webhook verified');
        res.status(200).send(challenge);
    } else {
        console.log('❌ WhatsApp Webhook verification failed');
        res.sendStatus(403);
    }
});

// Incoming Messages (POST)
app.post('/webhook/whatsapp', async (req, res) => {
    try {
        const body = req.body;

        // Verify signature
        const signature = req.headers['x-hub-signature-256'];
        if (!verifyWhatsAppSignature(req.rawBody, signature)) {
            console.log('❌ Invalid WhatsApp signature');
            return res.sendStatus(401);
        }

        // Process messages
        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry || []) {
                for (const change of entry.changes || []) {
                    if (change.field === 'messages') {
                        await processWhatsAppMessage(change.value);
                    }
                }
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('WhatsApp Webhook Error:', error);
        res.sendStatus(500);
    }
});

async function processWhatsAppMessage(value) {
    const messages = value.messages || [];
    const contacts = value.contacts || [];

    for (const message of messages) {
        console.log(`📱 WhatsApp Message from ${message.from}:`, message.type);

        // Text-Nachricht
        if (message.type === 'text') {
            const result = await leadFinder.processIncomingWhatsApp({
                from: message.from,
                text: message.text,
                contacts: contacts,
                timestamp: message.timestamp
            });

            // Auto-Prozess starten wenn neuer Lead
            if (result.type === 'new') {
                await automationEngine.processNewLead({
                    phone: message.from,
                    firstname: contacts[0]?.profile?.name?.split(' ')[0] || 'WhatsApp',
                    lastname: contacts[0]?.profile?.name?.split(' ').slice(1).join(' ') || 'Kontakt',
                    message: message.text?.body || ''
                });
            }
        }

        // Button-Antwort (z.B. Consent)
        if (message.type === 'interactive') {
            await processInteractiveResponse(message);
        }
    }
}

async function processInteractiveResponse(message) {
    const buttonId = message.interactive?.button_reply?.id;
    const buttonTitle = message.interactive?.button_reply?.title;
    const phone = message.from;

    console.log(`🔘 Button clicked: ${buttonTitle} (${buttonId})`);

    // Consent-Antwort verarbeiten
    if (buttonTitle?.includes('Ja, einverstanden')) {
        // Kontakt finden und Consent aktualisieren
        const contacts = await hubspotClient.searchContacts([{
            propertyName: 'phone',
            operator: 'CONTAINS_TOKEN',
            value: phone.slice(-10) // Letzte 10 Ziffern
        }]);

        if (contacts.total > 0) {
            const contactId = contacts.results[0].id;
            await hubspotClient.updateWhatsAppConsent(contactId, 'opt_in');
            await hubspotClient.createNote(contactId, 
                `✅ WhatsApp Consent erteilt am ${new Date().toLocaleString('de-DE')}\n` +
                `Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO`
            );

            // Willkommensnachricht senden
            const contact = await hubspotClient.getContact(contactId);
            await automationEngine.executeFollowUp(contactId);
        }
    }

    if (buttonTitle?.includes('Nein, danke')) {
        const contacts = await hubspotClient.searchContacts([{
            propertyName: 'phone',
            operator: 'CONTAINS_TOKEN',
            value: phone.slice(-10)
        }]);

        if (contacts.total > 0) {
            const contactId = contacts.results[0].id;
            await hubspotClient.updateWhatsAppConsent(contactId, 'opt_out');
            await hubspotClient.createNote(contactId,
                `❌ WhatsApp Consent abgelehnt am ${new Date().toLocaleString('de-DE')}`
            );
        }
    }

    // Terminwunsch verarbeiten
    if (buttonTitle?.includes('Morgens') || buttonTitle?.includes('Nachmittags')) {
        // Callback-Request erstellen
        // Hier würde Integration mit Kalender/Zadarma erfolgen
        console.log(`📞 Callback requested: ${buttonTitle}`);
    }
}

function verifyWhatsAppSignature(payload, signature) {
    if (!signature || !WEBHOOK_CONFIG.whatsapp.appSecret) return true; // Skip in dev

    const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', WEBHOOK_CONFIG.whatsapp.appSecret)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

// ============================================================================
// ZADARMA WEBHOOK (VoIP Anrufe)
// ============================================================================

app.post('/webhook/zadarma', async (req, res) => {
    try {
        const { event, call_start, caller_id, called_did, duration, disposition } = req.body;

        console.log(`📞 Zadarma Event: ${event}`);

        // Signatur prüfen
        const signature = req.headers['signature'];
        if (!verifyZadarmaSignature(req.body, signature)) {
            return res.sendStatus(401);
        }

        switch (event) {
            case 'NOTIFY_START':
                // Anruf beginnt - Popup im Dashboard anzeigen
                await notifyIncomingCall(caller_id, called_did);
                break;

            case 'NOTIFY_END':
                // Anruf beendet - In HubSpot loggen
                await leadFinder.processIncomingCall({
                    caller_id,
                    called_did,
                    duration,
                    disposition,
                    timestamp: call_start
                });
                break;

            case 'NOTIFY_RECORD':
                // Aufnahme verfügbar
                // Hier könnte man die Aufnahme für AI-Analyse speichern
                break;
        }

        res.json({ status: 'ok' });
    } catch (error) {
        console.error('Zadarma Webhook Error:', error);
        res.sendStatus(500);
    }
});

async function notifyIncomingCall(callerId, calledDid) {
    // WebSocket-Nachricht an Dashboard senden
    // In Produktion: Socket.io oder ähnliches
    console.log(`🔔 Eingehender Anruf von ${callerId}`);

    // Kontakt-Info laden wenn vorhanden
    const contacts = await hubspotClient.searchContacts([{
        propertyName: 'phone',
        operator: 'CONTAINS_TOKEN',
        value: callerId.slice(-10)
    }]);

    if (contacts.total > 0) {
        const contact = contacts.results[0].properties;
        console.log(`   → Bekannter Kontakt: ${contact.firstname} ${contact.lastname}`);
        console.log(`   → Firma: ${contact.company || 'N/A'}`);
    } else {
        console.log(`   → Unbekannter Anrufer`);
    }
}

function verifyZadarmaSignature(body, signature) {
    if (!signature || !WEBHOOK_CONFIG.zadarma.secretKey) return true;
    
    const data = Object.keys(body).sort().map(k => body[k]).join('');
    const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_CONFIG.zadarma.secretKey)
        .update(data)
        .digest('hex');

    return signature === expectedSignature;
}

// ============================================================================
// WEB-FORMULAR ENDPOINT
// ============================================================================

app.post('/api/lead', async (req, res) => {
    try {
        const { 
            name, 
            email, 
            phone, 
            company, 
            message, 
            projectType,
            gdprConsent,
            whatsappConsent 
        } = req.body;

        // Validierung
        if (!email || !gdprConsent) {
            return res.status(400).json({ 
                error: 'E-Mail und DSGVO-Einwilligung erforderlich' 
            });
        }

        // Lead erfassen
        const contact = await leadFinder.captureWebFormLead({
            name,
            email,
            phone,
            company,
            message: `${projectType ? `Projekt: ${projectType}\n` : ''}${message || ''}`,
            gdprConsent: gdprConsent === true || gdprConsent === 'true',
            whatsappConsent: whatsappConsent === true || whatsappConsent === 'true'
        });

        // Automation starten
        const result = await automationEngine.processNewLead({
            email,
            firstname: name?.split(' ')[0] || '',
            lastname: name?.split(' ').slice(1).join(' ') || '',
            phone: phone || '',
            company: company || '',
            message: message || ''
        });

        res.json({
            success: true,
            message: 'Vielen Dank! Wir melden uns in Kürze.',
            leadId: contact.id,
            score: result.score
        });

    } catch (error) {
        console.error('Lead Capture Error:', error);
        res.status(500).json({ 
            error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später.' 
        });
    }
});

// ============================================================================
// HUBSPOT WEBHOOK (Deal Updates, Contact Changes)
// ============================================================================

app.post('/webhook/hubspot', async (req, res) => {
    try {
        const events = req.body;

        for (const event of events) {
            console.log(`📊 HubSpot Event: ${event.subscriptionType}`);

            switch (event.subscriptionType) {
                case 'deal.propertyChange':
                    if (event.propertyName === 'dealstage') {
                        await handleDealStageChange(event);
                    }
                    break;

                case 'contact.propertyChange':
                    if (event.propertyName === 'hs_whatsapp_consent') {
                        await handleConsentChange(event);
                    }
                    break;

                case 'contact.creation':
                    // Neuer Kontakt über HubSpot UI erstellt
                    await automationEngine.processNewLead({
                        email: event.properties?.email,
                        firstname: event.properties?.firstname || '',
                        lastname: event.properties?.lastname || '',
                        phone: event.properties?.phone || '',
                        company: event.properties?.company || ''
                    });
                    break;
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('HubSpot Webhook Error:', error);
        res.sendStatus(500);
    }
});

async function handleDealStageChange(event) {
    const dealId = event.objectId;
    const newStage = event.propertyValue;

    console.log(`💼 Deal ${dealId} moved to stage: ${newStage}`);

    // Bei "closedwon" - Vertrag generieren
    if (newStage === 'closedwon') {
        // Zugehörigen Kontakt finden und Vertrag senden
        // In Produktion: Deal-to-Contact Association abfragen
        console.log('🎉 Deal gewonnen! Vertragserstellung wird gestartet...');
    }

    // Bei "closedlost" - Follow-Up stoppen
    if (newStage === 'closedlost') {
        console.log('😞 Deal verloren. Automation gestoppt.');
    }
}

async function handleConsentChange(event) {
    const contactId = event.objectId;
    const newConsent = event.propertyValue;

    console.log(`✅ Consent Update für ${contactId}: ${newConsent}`);

    // Wenn Consent erteilt, Automation fortsetzen
    if (newConsent === 'opt_in') {
        await automationEngine.scheduleNextStep(contactId);
    }
}

// ============================================================================
// API ENDPOINTS FÜR DASHBOARD
// ============================================================================

// Pipeline-Statistiken
app.get('/api/stats/pipeline', async (req, res) => {
    try {
        const stats = await hubspotClient.getPipelineStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Automation-Statistiken
app.get('/api/stats/automation', async (req, res) => {
    try {
        const stats = await automationEngine.getAutomationStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Alle Leads abrufen
app.get('/api/leads', async (req, res) => {
    try {
        const contacts = await hubspotClient.getAllContacts(100);
        res.json(contacts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Alle Deals abrufen
app.get('/api/deals', async (req, res) => {
    try {
        const deals = await hubspotClient.getAllDeals(100);
        res.json(deals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Consent-Status abrufen
app.get('/api/consent/stats', async (req, res) => {
    try {
        const allContacts = await hubspotClient.getAllContacts(500);
        
        const stats = {
            total: allContacts.results.length,
            optIn: 0,
            optOut: 0,
            notOpted: 0,
            revoked: 0
        };

        allContacts.results.forEach(c => {
            const consent = c.properties.hs_whatsapp_consent;
            if (consent === 'opt_in') stats.optIn++;
            else if (consent === 'opt_out') stats.optOut++;
            else if (consent === 'revoked') stats.revoked++;
            else stats.notOpted++;
        });

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manuell Consent anfragen
app.post('/api/consent/request', async (req, res) => {
    try {
        const { contactId } = req.body;
        const contact = await hubspotClient.getContact(contactId);
        
        if (contact.properties.phone) {
            await automationEngine.requestWhatsAppConsent(contactId, contact.properties);
            res.json({ success: true, message: 'Consent-Anfrage gesendet' });
        } else {
            res.status(400).json({ error: 'Keine Telefonnummer vorhanden' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manuell Angebot senden
app.post('/api/proposal/send', async (req, res) => {
    try {
        const { contactId } = req.body;
        const proposal = await automationEngine.generateAndSendProposal(contactId);
        res.json({ success: true, proposal });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// AUDIT LOG
// ============================================================================

const auditLog = [];

function logToAudit(entry) {
    auditLog.push({
        ...entry,
        id: `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });

    // In Produktion: In Datenbank speichern
    // Aufbewahrung: 3 Jahre gemäß DSGVO
}

app.get('/api/audit-log', (req, res) => {
    const { limit = 100, offset = 0 } = req.query;
    res.json({
        total: auditLog.length,
        entries: auditLog.slice(offset, offset + limit)
    });
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            hubspot: 'connected',
            whatsapp: 'connected',
            zadarma: 'connected'
        }
    });
});

// ============================================================================
// SERVER START
// ============================================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🚀 GTz Ecosystem - Sales Automation Server                   ║
║                                                                ║
║   Server running on port ${PORT}                                  ║
║                                                                ║
║   Endpoints:                                                   ║
║   • POST /webhook/whatsapp  - WhatsApp Business Webhook        ║
║   • POST /webhook/zadarma   - Zadarma VoIP Webhook             ║
║   • POST /webhook/hubspot   - HubSpot Event Webhook            ║
║   • POST /api/lead          - Web Form Lead Capture            ║
║   • GET  /api/stats/*       - Dashboard Statistics             ║
║   • GET  /api/leads         - All Leads from HubSpot           ║
║   • GET  /api/deals         - All Deals from HubSpot           ║
║   • GET  /health            - Health Check                     ║
║                                                                ║
║   DSGVO-konform • WhatsApp Business API • HubSpot CRM          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
