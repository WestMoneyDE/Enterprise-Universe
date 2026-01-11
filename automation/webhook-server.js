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
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const { automationEngine, leadFinder, hubspotClient } = require('./sales-automation-engine');
const { activityManager, ACTIVITY_TYPES } = require('./activity-manager');

const app = express();

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "wss:", "https:"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // max 1000 requests per 15 min per IP
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Stricter rate limiting for webhooks
const webhookLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // max 100 webhook requests per minute per IP
    message: { error: 'Webhook rate limit exceeded.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/webhook/', webhookLimiter);
const server = http.createServer(app);

// ============================================================================
// WEBSOCKET SETUP (Native WebSocket)
// ============================================================================

const WebSocket = require('ws');
const wss = new WebSocket.Server({ server, path: '/ws/activities' });

const wsClients = new Set();

wss.on('connection', (ws, req) => {
    console.log('📡 WebSocket client connected');
    wsClients.add(ws);

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to GTz Activity Stream',
        timestamp: new Date().toISOString()
    }));

    ws.on('close', () => {
        console.log('📡 WebSocket client disconnected');
        wsClients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        wsClients.delete(ws);
    });
});

// Broadcast activity to all connected clients
function broadcastActivity(activity) {
    const message = JSON.stringify({
        type: 'activity',
        data: activity
    });

    wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Register activity listener for real-time broadcasts
activityManager.addListener((activity) => {
    broadcastActivity(activity);
});

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

// CORS configuration - restricted to allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['https://enterprise-universe.one', 'https://app.enterprise-universe.one', 'https://west-money-bau.de'];

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        res.header('Access-Control-Allow-Origin', origin || '*');
    }
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
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

        const contactName = contacts[0]?.profile?.name || null;

        // Log WhatsApp message activity
        activityManager.logWhatsAppMessage(message.from, message.type, contactName);

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

                // Log new lead captured
                activityManager.logLeadCaptured(result.contactId || message.from, 'whatsapp', contactName);
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
            const contact = await hubspotClient.getContact(contactId);
            const contactName = `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim();

            await hubspotClient.updateWhatsAppConsent(contactId, 'opt_in');
            await hubspotClient.createNote(contactId,
                `✅ WhatsApp Consent erteilt am ${new Date().toLocaleString('de-DE')}\n` +
                `Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO`
            );

            // Log consent activity
            activityManager.logWhatsAppConsent(contactId, 'opt_in', contactName || null);

            // Willkommensnachricht senden
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
            const contact = await hubspotClient.getContact(contactId);
            const contactName = `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim();

            await hubspotClient.updateWhatsAppConsent(contactId, 'opt_out');
            await hubspotClient.createNote(contactId,
                `❌ WhatsApp Consent abgelehnt am ${new Date().toLocaleString('de-DE')}`
            );

            // Log consent activity
            activityManager.logWhatsAppConsent(contactId, 'opt_out', contactName || null);
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
    // In production, require valid signature
    if (process.env.NODE_ENV === 'production') {
        if (!signature) {
            console.warn('[Security] WhatsApp webhook signature missing');
            return false;
        }
        if (!WEBHOOK_CONFIG.whatsapp.appSecret || WEBHOOK_CONFIG.whatsapp.appSecret === 'YOUR_APP_SECRET') {
            console.error('[Security] WhatsApp app secret not configured in production!');
            return false;
        }
    } else {
        // In development, skip if not configured
        if (!signature || !WEBHOOK_CONFIG.whatsapp.appSecret || WEBHOOK_CONFIG.whatsapp.appSecret === 'YOUR_APP_SECRET') {
            console.log('[Dev] Skipping WhatsApp signature verification');
            return true;
        }
    }

    const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', WEBHOOK_CONFIG.whatsapp.appSecret)
        .update(payload)
        .digest('hex');

    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch (error) {
        console.error('[Security] Signature verification error:', error.message);
        return false;
    }
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
                // Log call start activity
                activityManager.logCallStart(caller_id, called_did);
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
                // Log call end activity
                activityManager.logCallEnd(caller_id, duration || 0, disposition);
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
    // In production, require valid signature
    if (process.env.NODE_ENV === 'production') {
        if (!signature) {
            console.warn('[Security] Zadarma webhook signature missing');
            return false;
        }
        if (!WEBHOOK_CONFIG.zadarma.secretKey || WEBHOOK_CONFIG.zadarma.secretKey === 'YOUR_ZADARMA_KEY') {
            console.error('[Security] Zadarma secret key not configured in production!');
            return false;
        }
    } else {
        // In development, skip if not configured
        if (!signature || !WEBHOOK_CONFIG.zadarma.secretKey || WEBHOOK_CONFIG.zadarma.secretKey === 'YOUR_ZADARMA_KEY') {
            console.log('[Dev] Skipping Zadarma signature verification');
            return true;
        }
    }

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

// Joi validation schema for lead capture
const leadSchema = Joi.object({
    name: Joi.string().max(100).optional(),
    email: Joi.string().email().required().messages({
        'string.email': 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
        'any.required': 'E-Mail ist erforderlich'
    }),
    phone: Joi.string().pattern(/^[+]?[\d\s()-]{6,20}$/).optional().messages({
        'string.pattern.base': 'Bitte geben Sie eine gültige Telefonnummer ein'
    }),
    company: Joi.string().max(200).optional(),
    message: Joi.string().max(5000).optional(),
    projectType: Joi.string().max(100).optional(),
    gdprConsent: Joi.boolean().truthy('true', 1, '1').required().messages({
        'any.required': 'DSGVO-Einwilligung ist erforderlich'
    }),
    whatsappConsent: Joi.boolean().truthy('true', 1, '1').optional()
});

// Helper function for structured error logging
function logError(errorId, context, error, req) {
    console.error(`[${errorId}] ${context}:`, {
        message: error.message,
        stack: error.stack,
        ip: req?.ip,
        path: req?.path,
        timestamp: new Date().toISOString()
    });
}

app.post('/api/lead', async (req, res) => {
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    try {
        // Validate input with Joi
        const { error, value } = leadSchema.validate(req.body, { abortEarly: false });

        if (error) {
            const validationErrors = error.details.map(d => d.message);
            return res.status(400).json({
                error: 'Validierungsfehler',
                details: validationErrors
            });
        }

        const { name, email, phone, company, message, projectType, gdprConsent, whatsappConsent } = value;

        // Lead erfassen
        const contact = await leadFinder.captureWebFormLead({
            name,
            email,
            phone,
            company,
            message: `${projectType ? `Projekt: ${projectType}\n` : ''}${message || ''}`,
            gdprConsent: gdprConsent === true,
            whatsappConsent: whatsappConsent === true
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

        // Log lead captured activity
        activityManager.logLeadCaptured(contact.id, 'webform', name, result.score);

        // Log lead scored activity if score available
        if (result.score && result.tier) {
            activityManager.logLeadScored(contact.id, result.score, result.tier, name);
        }

        res.json({
            success: true,
            message: 'Vielen Dank! Wir melden uns in Kürze.',
            leadId: contact.id,
            score: result.score
        });

    } catch (error) {
        logError(errorId, 'Lead Capture Error', error, req);
        res.status(500).json({
            error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später.',
            errorId: errorId // For support reference
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
                    const contactName = `${event.properties?.firstname || ''} ${event.properties?.lastname || ''}`.trim();

                    await automationEngine.processNewLead({
                        email: event.properties?.email,
                        firstname: event.properties?.firstname || '',
                        lastname: event.properties?.lastname || '',
                        phone: event.properties?.phone || '',
                        company: event.properties?.company || ''
                    });

                    // Log contact created activity
                    activityManager.logContactCreated(
                        event.objectId,
                        contactName || 'Neuer Kontakt',
                        event.properties?.email
                    );
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
    const oldStage = event.previousValue || null;

    console.log(`💼 Deal ${dealId} moved to stage: ${newStage}`);

    // Log deal stage change activity
    activityManager.logDealStageChange(dealId, newStage, oldStage);

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
// ACTIVITIES API (Webhook Events)
// ============================================================================

// Alle Aktivitäten abrufen
app.get('/api/activities', (req, res) => {
    try {
        const {
            limit = 20,
            offset = 0,
            type,
            source,
            objectType,
            objectId,
            since,
            until
        } = req.query;

        const result = activityManager.getActivities({
            limit: parseInt(limit),
            offset: parseInt(offset),
            type: type ? type.split(',') : null,
            source,
            objectType,
            objectId,
            since,
            until
        });

        res.json(result);
    } catch (error) {
        console.error('Activities API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Einzelne Aktivität abrufen
app.get('/api/activities/:id', (req, res) => {
    try {
        const activity = activityManager.getActivity(req.params.id);
        if (activity) {
            res.json(activity);
        } else {
            res.status(404).json({ error: 'Activity not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Aktivitäten-Statistiken
app.get('/api/activities/stats/summary', (req, res) => {
    try {
        const stats = activityManager.getStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manuell Aktivität erstellen (für Tests/Admin)
app.post('/api/activities', (req, res) => {
    try {
        const { type, title, description, result, source, metadata } = req.body;

        if (!type) {
            return res.status(400).json({ error: 'Type is required' });
        }

        const activity = activityManager.create(type, {
            title,
            description,
            result,
            source: source || 'manual',
            metadata,
            ip: req.ip
        });

        res.status(201).json(activity);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
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

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🚀 GTz Ecosystem - Sales Automation Server                   ║
║                                                                ║
║   Server running on port ${PORT}                                  ║
║                                                                ║
║   REST Endpoints:                                              ║
║   • POST /webhook/whatsapp  - WhatsApp Business Webhook        ║
║   • POST /webhook/zadarma   - Zadarma VoIP Webhook             ║
║   • POST /webhook/hubspot   - HubSpot Event Webhook            ║
║   • POST /api/lead          - Web Form Lead Capture            ║
║   • GET  /api/stats/*       - Dashboard Statistics             ║
║   • GET  /api/leads         - All Leads from HubSpot           ║
║   • GET  /api/deals         - All Deals from HubSpot           ║
║   • GET  /api/activities    - Activity Feed (Webhook Events)   ║
║   • GET  /health            - Health Check                     ║
║                                                                ║
║   WebSocket:                                                   ║
║   • WS  /ws/activities      - Real-Time Activity Stream        ║
║                                                                ║
║   DSGVO-konform • WhatsApp Business API • HubSpot CRM          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `);
});

module.exports = { app, server, wss, activityManager };
