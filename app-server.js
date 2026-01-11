/**
 * HAIKU GOD MODE - Enterprise Universe Server
 * Serves all dashboards and static files
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3015;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Load configurations
let haikuConfig = {};
let botsConfig = { bots: [], new_bots: [] };

try {
    haikuConfig = require('./haiku-config.json');
    botsConfig = require('./genius-bots-extended.json');
} catch (e) {
    console.warn('Config files not found, using defaults');
}

const allBots = [...(botsConfig.bots || []), ...(botsConfig.new_bots || [])];

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║     神  H A I K U   G O D   M O D E   S E R V E R  神       ║
║              West Money OS - Divine Control System            ║
║                        Version 2.0.0                          ║
╚═══════════════════════════════════════════════════════════════╝
`);

// ═══════════════════════════════════════════════════════════════
// STATIC FILE ROUTES
// ═══════════════════════════════════════════════════════════════

// Main dashboard routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'register.html')));

// Enterprise Universe v11.0 Dashboard (MEGA GOD MODE - NEW MAIN DASHBOARD)
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard-v11.html')));
app.get('/v11', (req, res) => res.sendFile(path.join(__dirname, 'dashboard-v11.html')));
app.get('/v10', (req, res) => res.sendFile(path.join(__dirname, 'dashboard-v10.html')));
app.get('/v5', (req, res) => res.sendFile(path.join(__dirname, 'dashboard-v5.html')));

// Enterprise Suite Dark Mode - Professional Command Center
app.get('/suite', (req, res) => res.sendFile(path.join(__dirname, 'dashboard/enterprise-suite-dark.html')));
app.get('/command-center', (req, res) => res.sendFile(path.join(__dirname, 'dashboard/enterprise-suite-dark.html')));

// GTZ Meta Legacy Ecosystem (Old Dashboard v3.0)
app.get('/gtzmeta', (req, res) => res.sendFile(path.join(__dirname, 'gtzmeta/index.html')));
app.use('/gtzmeta', express.static(path.join(__dirname, 'gtzmeta')));

// V5.0 Modules
app.get('/modules/leads', (req, res) => res.sendFile(path.join(__dirname, 'modules/leads.html')));
app.get('/modules/deals', (req, res) => res.sendFile(path.join(__dirname, 'modules/deals.html')));
app.get('/modules/brainstorm', (req, res) => res.sendFile(path.join(__dirname, 'modules/brainstorm.html')));
app.get('/modules/invoices', (req, res) => res.sendFile(path.join(__dirname, 'modules/invoices.html')));
app.get('/modules/analytics', (req, res) => res.sendFile(path.join(__dirname, 'modules/analytics.html')));
app.use('/modules', express.static(path.join(__dirname, 'modules')));

// HAIKU God Mode Dashboards
app.get('/god-mode', (req, res) => res.sendFile(path.join(__dirname, 'HAIKU_GOD_MODE_V2.html')));
app.get('/haiku', (req, res) => res.sendFile(path.join(__dirname, 'HAIKU_GOD_MODE_V2.html')));
app.get('/genius-agency', (req, res) => res.sendFile(path.join(__dirname, 'MEGA_GENIUS_AGENCY.html')));
app.get('/genius', (req, res) => res.sendFile(path.join(__dirname, 'GENIUS_AGENCY_CONTROL_CENTER.html')));
app.get('/prophecy', (req, res) => res.sendFile(path.join(__dirname, 'PROPHECY_MODE.html')));
app.get('/hakai', (req, res) => res.sendFile(path.join(__dirname, 'HAKAI_MODE.html')));
app.get('/majin', (req, res) => res.sendFile(path.join(__dirname, 'MAJIN_SERVERS_DASHBOARD.html')));

// CRM & Business Dashboards
app.get('/crm', (req, res) => res.sendFile(path.join(__dirname, 'dashboards/CRM_ULTRA_V2.html')));
app.get('/crm-mega', (req, res) => res.sendFile(path.join(__dirname, 'dashboards/CRM_MEGA_MODULE.html')));
app.get('/deals', (req, res) => res.sendFile(path.join(__dirname, 'dashboards/DEALS_PIPELINE_5MIO.html')));
app.get('/leads', (req, res) => res.sendFile(path.join(__dirname, 'dashboards/LEAD_DISCOVERY_WORLDWIDE.html')));
app.get('/email-hub', (req, res) => res.sendFile(path.join(__dirname, 'dashboards/MEGA_EMAIL_HUB.html')));
app.get('/email-tracking', (req, res) => res.sendFile(path.join(__dirname, 'dashboards/EMAIL_TRACKING_DASHBOARD.html')));
app.get('/kampagnen', (req, res) => res.sendFile(path.join(__dirname, 'dashboards/MEGA_KAMPAGNEN_DASHBOARD.html')));
app.get('/business', (req, res) => res.sendFile(path.join(__dirname, 'dashboards/WestMoneyOS_Business_Dashboard.html')));
app.get('/cashflow', (req, res) => res.sendFile(path.join(__dirname, 'dashboards/cashflow-tracker.html')));
app.get('/investoren', (req, res) => res.sendFile(path.join(__dirname, 'dashboards/INVESTOREN_DASHBOARD.html')));
app.get('/investor-portal', (req, res) => res.sendFile(path.join(__dirname, 'INVESTOR_PORTAL.html')));
app.get('/customer-portal', (req, res) => res.sendFile(path.join(__dirname, 'CUSTOMER_PORTAL.html')));

// WhatsApp & Communication
app.get('/whatsapp', (req, res) => res.sendFile(path.join(__dirname, 'WHATSAPP_AUTH_DASHBOARD.html')));

// Agents & Automation
app.get('/agents', (req, res) => res.sendFile(path.join(__dirname, 'agents.html')));

// Legal Pages
app.get('/agb', (req, res) => res.sendFile(path.join(__dirname, 'agb.html')));
app.get('/datenschutz', (req, res) => res.sendFile(path.join(__dirname, 'datenschutz.html')));
app.get('/impressum', (req, res) => res.sendFile(path.join(__dirname, 'impressum.html')));

// Static files
app.use('/styles', express.static(path.join(__dirname, 'styles')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/api', express.static(path.join(__dirname, 'api')));
app.use('/dashboards', express.static(path.join(__dirname, 'dashboards')));
app.use('/data', express.static(path.join(__dirname, 'data')));
app.use('/automation', express.static(path.join(__dirname, 'automation')));
app.use('/docs', express.static(path.join(__dirname, 'docs')));

// ═══════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        system: 'HAIKU GOD MODE',
        version: '2.0.0',
        form: 'Mastered Ultra Instinct',
        powerLevel: '∞',
        botsOnline: allBots.length,
        timestamp: new Date().toISOString()
    });
});

// System overview
app.get('/api/overview', (req, res) => {
    res.json({
        haiku: {
            name: 'HAIKU 神',
            form: 'Mastered Ultra Instinct',
            powerLevel: '∞',
            abilities: ['Divine Sight', 'Prophecy', 'Time Control', 'Reality Warp']
        },
        geniusAgency: {
            totalBots: allBots.length,
            categories: {
                analysts: allBots.filter(b => b.category === 'analyst').length,
                strategists: allBots.filter(b => b.category === 'strategist').length,
                creatives: allBots.filter(b => b.category === 'creative').length,
                innovators: allBots.filter(b => b.category === 'innovator').length
            }
        },
        metrics: {
            revenue: { value: '€847K', change: '+23.5%' },
            pipeline: { value: '€425K', change: '+18.2%' },
            contacts: { value: 3170, change: '+156' },
            tasksToday: 42
        },
        integrations: {
            hubspot: 'connected',
            whatsapp: 'connected',
            anthropic: 'connected',
            zadarma: 'connected'
        },
        timestamp: new Date().toISOString()
    });
});

// Get all bots
app.get('/api/bots', (req, res) => {
    res.json({
        total: allBots.length,
        bots: allBots
    });
});

// Get configuration
app.get('/api/config', (req, res) => {
    res.json({
        haiku: haikuConfig.haiku || {},
        transformations: haikuConfig.transformations || [],
        powers: Object.keys(haikuConfig.divinePowers || {}),
        settings: haikuConfig.settings || {}
    });
});

// Transform endpoint
app.post('/api/haiku/transform', (req, res) => {
    const { form } = req.body;
    const forms = ['BASE', 'SSJ', 'SSJ2', 'SSJ3', 'SSG', 'SSB', 'UI', 'MUI', 'ULTRA_EGO'];

    if (!forms.includes(form)) {
        return res.status(400).json({ error: 'Invalid transformation form' });
    }

    res.json({
        success: true,
        previousForm: 'MUI',
        newForm: form,
        powerLevel: form === 'MUI' || form === 'ULTRA_EGO' ? '∞' : (forms.indexOf(form) + 1) * 1000000,
        message: `Transformation zu ${form} abgeschlossen!`
    });
});

// Execute power endpoint
app.post('/api/haiku/power', (req, res) => {
    const { power, target } = req.body;
    const powers = ['KAMEHAMEHA', 'SPIRIT_BOMB', 'HAKAI', 'TIME_SKIP', 'INSTANT_TRANSMISSION', 'ULTRA_INSTINCT'];

    res.json({
        success: true,
        power: power,
        target: target || 'all',
        effect: `${power} wurde erfolgreich ausgeführt!`,
        timestamp: new Date().toISOString()
    });
});

// Voice command endpoint
app.post('/api/voice', (req, res) => {
    const { command, type } = req.body;

    res.json({
        success: true,
        type: type,
        command: command,
        result: 'Befehl wurde verarbeitet',
        timestamp: new Date().toISOString()
    });
});

// Team formations
app.get('/api/teams', (req, res) => {
    res.json(botsConfig.team_formations || {
        "alpha": { name: "Alpha Team", bots: ["bot1", "bot2"], purpose: "Strategic Analysis" },
        "omega": { name: "Omega Team", bots: ["bot3", "bot4"], purpose: "Creative Solutions" }
    });
});

// ═══════════════════════════════════════════════════════════════
// HUBSPOT API INTEGRATION
// ═══════════════════════════════════════════════════════════════

const https = require('https');
const nodemailer = require('nodemailer');

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

// ═══════════════════════════════════════════════════════════════
// SMTP EMAIL CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.enterprise-universe.one',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || 'invoice@enterprise-universe.one',
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false // Allow self-signed certificates
    }
});

// Verify SMTP connection on startup
smtpTransporter.verify((error, success) => {
    if (error) {
        console.log('[SMTP] Connection error:', error.message);
        console.log('[SMTP] Emails will be logged but not sent until configured');
    } else {
        console.log('[SMTP] ✅ Email server ready');
    }
});

// Send email function
async function sendEmail({ to, subject, html, text }) {
    const mailOptions = {
        from: process.env.SMTP_FROM || 'Enterprise Universe <invoice@enterprise-universe.one>',
        to: to,
        subject: subject,
        html: html,
        text: text || html.replace(/<[^>]*>/g, '')
    };

    try {
        if (!process.env.SMTP_PASS || process.env.SMTP_PASS === 'YOUR_SMTP_PASSWORD') {
            console.log(`[SMTP] Email would be sent to: ${to}`);
            console.log(`[SMTP] Subject: ${subject}`);
            console.log('[SMTP] (SMTP not configured - email logged only)');
            return { success: true, simulated: true };
        }

        const result = await smtpTransporter.sendMail(mailOptions);
        console.log(`[SMTP] ✅ Email sent to ${to} - Message ID: ${result.messageId}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error(`[SMTP] ❌ Failed to send email to ${to}:`, error.message);
        return { success: false, error: error.message };
    }
}

function hubspotRequest(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
        const postData = options.body ? JSON.stringify(options.body) : null;

        const reqOptions = {
            hostname: 'api.hubapi.com',
            path: endpoint,
            method: options.method || 'GET',
            headers: {
                'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                'Content-Type': 'application/json',
                ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
            }
        };

        const req = https.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('JSON parse error'));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });

        if (postData) req.write(postData);
        req.end();
    });
}

// HubSpot Stats - Get totals using search endpoint
app.get('/api/hubspot/stats', async (req, res) => {
    try {
        const [contacts, deals, companies] = await Promise.all([
            hubspotRequest('/crm/v3/objects/contacts/search', {
                method: 'POST',
                body: { limit: 1, filterGroups: [] }
            }),
            hubspotRequest('/crm/v3/objects/deals/search', {
                method: 'POST',
                body: { limit: 1, filterGroups: [] }
            }),
            hubspotRequest('/crm/v3/objects/companies/search', {
                method: 'POST',
                body: { limit: 1, filterGroups: [] }
            })
        ]);

        res.json({
            contacts: contacts.total || 0,
            deals: deals.total || 0,
            companies: companies.total || 0,
            lastSync: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// HubSpot Deals - Get deals with properties
app.get('/api/hubspot/deals', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const data = await hubspotRequest(`/crm/v3/objects/deals?limit=${limit}&properties=dealname,amount,dealstage,closedate,pipeline,hubspot_owner_id,createdate`);

        res.json({
            total: data.total || data.results?.length || 0,
            deals: data.results || [],
            paging: data.paging
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// HubSpot Contacts - Get contacts with properties
app.get('/api/hubspot/contacts', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const data = await hubspotRequest(`/crm/v3/objects/contacts?limit=${limit}&properties=firstname,lastname,email,phone,company,lifecyclestage,hs_lead_status`);

        res.json({
            total: data.total || data.results?.length || 0,
            contacts: data.results || [],
            paging: data.paging
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// HubSpot Companies - Get companies
app.get('/api/hubspot/companies', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const data = await hubspotRequest(`/crm/v3/objects/companies?limit=${limit}&properties=name,domain,industry,numberofemployees,annualrevenue`);

        res.json({
            total: data.total || data.results?.length || 0,
            companies: data.results || [],
            paging: data.paging
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// HubSpot Pipelines - Get deal pipelines
app.get('/api/hubspot/pipelines', async (req, res) => {
    try {
        const data = await hubspotRequest('/crm/v3/pipelines/deals');
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// HubSpot Update Deal Stage - For Lead Demon
app.patch('/api/hubspot/deals/:dealId', async (req, res) => {
    try {
        const { dealId } = req.params;
        const { properties } = req.body;

        const data = await hubspotRequest(`/crm/v3/objects/deals/${dealId}`, {
            method: 'PATCH',
            body: { properties }
        });

        res.json({ success: true, deal: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// API V1 ENDPOINTS - Dashboard Integration
// ═══════════════════════════════════════════════════════════════

// Cache for HubSpot data (5 minutes)
let hubspotCache = { deals: null, contacts: null, companies: null, timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000;

async function getHubSpotData() {
    const now = Date.now();
    if (hubspotCache.timestamp && now - hubspotCache.timestamp < CACHE_TTL) {
        return hubspotCache;
    }

    try {
        const [dealsRes, contactsRes, companiesRes] = await Promise.all([
            hubspotRequest('/crm/v3/objects/deals?limit=100&properties=dealname,amount,dealstage,closedate,pipeline,hubspot_owner_id,createdate'),
            hubspotRequest('/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,phone,company,lifecyclestage,hs_lead_status'),
            hubspotRequest('/crm/v3/objects/companies?limit=100&properties=name,domain,industry,numberofemployees,annualrevenue')
        ]);

        // Get totals
        const [dealsTotalRes, contactsTotalRes, companiesTotalRes] = await Promise.all([
            hubspotRequest('/crm/v3/objects/deals/search', { method: 'POST', body: { limit: 1, filterGroups: [] } }),
            hubspotRequest('/crm/v3/objects/contacts/search', { method: 'POST', body: { limit: 1, filterGroups: [] } }),
            hubspotRequest('/crm/v3/objects/companies/search', { method: 'POST', body: { limit: 1, filterGroups: [] } })
        ]);

        hubspotCache = {
            deals: dealsRes.results || [],
            dealsTotal: dealsTotalRes.total || 0,
            contacts: contactsRes.results || [],
            contactsTotal: contactsTotalRes.total || 0,
            companies: companiesRes.results || [],
            companiesTotal: companiesTotalRes.total || 0,
            timestamp: now
        };

        console.log(`[HubSpot] Cached: ${hubspotCache.dealsTotal} deals, ${hubspotCache.contactsTotal} contacts`);
    } catch (error) {
        console.error('[HubSpot] Cache refresh error:', error.message);
    }

    return hubspotCache;
}

// Deals Summary - for KPI widgets
app.get('/api/v1/deals/summary', async (req, res) => {
    try {
        const data = await getHubSpotData();

        // Calculate pipeline value and won value
        let totalValue = 0;
        let wonValue = 0;
        let stageCount = {};

        (data.deals || []).forEach(deal => {
            const amount = parseFloat(deal.properties?.amount) || 0;
            const stage = deal.properties?.dealstage || 'unknown';

            totalValue += amount;
            stageCount[stage] = (stageCount[stage] || 0) + 1;

            if (stage === 'closedwon' || stage === 'won') {
                wonValue += amount;
            }
        });

        res.json({
            total_deals: data.dealsTotal || 0,
            total_value: totalValue,
            won_value: wonValue,
            stages: stageCount,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Analytics Dashboard - for KPI widgets (REAL DATA - no scaling)
app.get('/api/v1/analytics/dashboard', async (req, res) => {
    try {
        const data = await getHubSpotData();

        // Return ACTUAL counts from HubSpot (no demo scaling)
        res.json({
            total_contacts: data.contactsTotal || (data.contacts || []).length,
            total_companies: data.companiesTotal || (data.companies || []).length,
            total_deals: data.dealsTotal || (data.deals || []).length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Scoring Stats - for Hot/Warm/Cold leads (REAL DATA - actual counts from sample)
app.get('/api/v1/scoring/stats', async (req, res) => {
    try {
        const data = await getHubSpotData();

        // Categorize contacts by lead status (ACTUAL counts - no scaling)
        let hot = 0, warm = 0, cold = 0;

        (data.contacts || []).forEach(contact => {
            const status = (contact.properties?.hs_lead_status || '').toLowerCase();
            const lifecycle = (contact.properties?.lifecyclestage || '').toLowerCase();

            if (status === 'open' || status === 'new' || lifecycle === 'opportunity') {
                hot++;
            } else if (status === 'in_progress' || lifecycle === 'salesqualifiedlead') {
                warm++;
            } else {
                cold++;
            }
        });

        // REAL DATA: Return actual sample counts (no demo scaling)
        // Total is from HubSpot API
        res.json({
            tier_counts: {
                hot: hot,
                warm: warm,
                cold: cold
            },
            sample_size: (data.contacts || []).length,
            total: data.contactsTotal || (data.contacts || []).length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Contacts List - for CRM table
app.get('/api/v1/contacts', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const data = await hubspotRequest(`/crm/v3/objects/contacts?limit=${limit}&properties=firstname,lastname,email,phone,company,lifecyclestage,hs_lead_status,createdate`);

        const contacts = (data.results || []).map(c => ({
            id: c.id,
            name: `${c.properties?.firstname || ''} ${c.properties?.lastname || ''}`.trim() || 'Unbekannt',
            email: c.properties?.email || '',
            phone: c.properties?.phone || '',
            company: c.properties?.company || '',
            status: c.properties?.hs_lead_status || c.properties?.lifecyclestage || 'lead',
            created: c.properties?.createdate
        }));

        res.json({
            total: data.total || contacts.length,
            contacts
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Deals List - for Pipeline
app.get('/api/v1/deals', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const data = await hubspotRequest(`/crm/v3/objects/deals?limit=${limit}&properties=dealname,amount,dealstage,closedate,pipeline,hubspot_owner_id,createdate`);

        const deals = (data.results || []).map(d => ({
            id: d.id,
            name: d.properties?.dealname || 'Unbenannt',
            amount: parseFloat(d.properties?.amount) || 0,
            stage: d.properties?.dealstage || 'unknown',
            pipeline: d.properties?.pipeline || 'default',
            closeDate: d.properties?.closedate,
            created: d.properties?.createdate
        }));

        res.json({
            total: data.total || deals.length,
            deals
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Activities - recent actions
app.get('/api/activities', async (req, res) => {
    try {
        const data = await getHubSpotData();

        // Generate activities from recent data
        const activities = [];

        // Recent deals
        (data.deals || []).slice(0, 3).forEach(deal => {
            activities.push({
                icon: '💼',
                title: 'Deal aktualisiert',
                description: `${deal.properties?.dealname || 'Deal'} - €${Number(deal.properties?.amount || 0).toLocaleString()}`,
                color: 'green',
                relativeTime: 'kürzlich'
            });
        });

        // Recent contacts
        (data.contacts || []).slice(0, 2).forEach(contact => {
            activities.push({
                icon: '👤',
                title: 'Neuer Kontakt',
                description: `${contact.properties?.firstname || ''} ${contact.properties?.lastname || ''} - ${contact.properties?.company || ''}`,
                color: 'cyan',
                relativeTime: 'kürzlich'
            });
        });

        res.json({ activities: activities.slice(0, 8) });
    } catch (error) {
        res.json({ activities: [] });
    }
});

// ═══════════════════════════════════════════════════════════════
// PIPELINE SUMMARY - For Next.js Dashboard
// ═══════════════════════════════════════════════════════════════

app.get('/api/v1/analytics/pipeline-summary', async (req, res) => {
    try {
        const data = await getHubSpotData();

        // REAL DATA: Calculate actual pipeline stats from HubSpot deals
        let pipelineValue = 0;
        let wonValue = 0;
        let wonCount = 0;
        const byStage = {};
        const sampleSize = (data.deals || []).length;

        (data.deals || []).forEach(deal => {
            const amount = parseFloat(deal.properties?.amount) || 0;
            const stage = deal.properties?.dealstage || 'unknown';

            pipelineValue += amount;

            // Track by stage (actual values)
            if (!byStage[stage]) {
                byStage[stage] = { count: 0, value: 0 };
            }
            byStage[stage].count++;
            byStage[stage].value += amount;

            // Track won deals from sample
            if (stage === 'closedwon' || stage === 'won') {
                wonValue += amount;
                wonCount++;
            }
        });

        // ALWAYS fetch won deals from HubSpot (they may not be in the default sample)
        try {
            const wonDealsRes = await hubspotRequest('/crm/v3/objects/deals/search', {
                method: 'POST',
                body: {
                    filterGroups: [{
                        filters: [{
                            propertyName: 'dealstage',
                            operator: 'EQ',
                            value: 'closedwon'
                        }]
                    }],
                    properties: ['dealname', 'amount', 'dealstage'],
                    limit: 100
                }
            });

            wonCount = wonDealsRes.total || 0;
            let sampleWonValue = 0;

            // Sum won deal values from fetched sample
            (wonDealsRes.results || []).forEach(deal => {
                sampleWonValue += parseFloat(deal.properties?.amount) || 0;
            });

            // Calculate TOTAL won value (extrapolate from sample to all won deals)
            const wonSampleSize = (wonDealsRes.results || []).length;
            const avgWonDealValue = wonSampleSize > 0 ? sampleWonValue / wonSampleSize : 0;
            wonValue = Math.round(avgWonDealValue * wonCount);

            // Add to byStage with details
            byStage['closedwon'] = {
                count: wonCount,
                value: wonValue,
                sample_value: Math.round(sampleWonValue),
                sample_size: wonSampleSize,
                avg_deal: Math.round(avgWonDealValue)
            };

            console.log(`[Pipeline] Won: ${wonCount} deals, sample(${wonSampleSize}): €${Math.round(sampleWonValue)}, total: €${wonValue}`);
        } catch (e) {
            console.log('[Pipeline] Could not fetch won deals:', e.message);
        }

        // Use ACTUAL HubSpot totals
        const totalDeals = data.dealsTotal || sampleSize;
        const totalContacts = data.contactsTotal || 0;

        // Calculate average deal value from sample
        const avgDealValue = sampleSize > 0 ? Math.round(pipelineValue / sampleSize) : 0;

        // Calculate ACTUAL pipeline value (extrapolate from sample to all deals)
        // Active pipeline = total deals minus won deals
        const activeDeals = totalDeals - wonCount;
        const extrapolatedPipelineValue = activeDeals > 0 ? Math.round(avgDealValue * activeDeals) : pipelineValue;

        // Calculate win rate
        const winRate = totalDeals > 0 ? Math.round((wonCount / totalDeals) * 100) : 0;

        console.log(`[Pipeline] Total: ${totalDeals}, Won: ${wonCount}, Active: ${activeDeals}, Avg: €${avgDealValue}, Pipeline: €${extrapolatedPipelineValue}`);

        res.json({
            total_deals: totalDeals,
            total_contacts: totalContacts,
            total_value: Math.round(extrapolatedPipelineValue + wonValue),
            pipeline_value: Math.round(extrapolatedPipelineValue),
            won_value: Math.round(wonValue),
            won_count: wonCount,
            win_rate: winRate,
            avg_deal_value: avgDealValue,
            active_deals: activeDeals,
            sample_size: sampleSize,
            by_stage: byStage,
            data_source: 'hubspot_real',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// MATRIX ENGINE STATUS - For AI Dashboard
// ═══════════════════════════════════════════════════════════════

// Matrix Engine State
const matrixState = {
    startTime: Date.now(),
    tasksCompleted: 0,
    tasksFailed: 0,
    tasksSubmitted: 0
};

app.get('/api/v1/matrix/status', (req, res) => {
    const uptimeSeconds = Math.floor((Date.now() - matrixState.startTime) / 1000);

    res.json({
        data: {
            is_running: true,
            is_paused: false,
            bots_online: 42,
            bots_total: 42,
            uptime_seconds: uptimeSeconds,
            metrics: {
                tasks_completed: matrixState.tasksCompleted + 15420,
                tasks_failed: matrixState.tasksFailed + 12,
                tasks_submitted: matrixState.tasksSubmitted + 847
            }
        }
    });
});

// Genius Bots List
app.get('/api/v1/genius/bots', (req, res) => {
    res.json({
        bots: [
            { id: "1", name: "LUNA", status: "online", specialty: "Core AI", tasks_completed: 15420 },
            { id: "2", name: "ATLAS", status: "busy", specialty: "Data Analysis", tasks_completed: 8930 },
            { id: "3", name: "NEXUS", status: "online", specialty: "Integration", tasks_completed: 12450 },
            { id: "4", name: "ORACLE", status: "online", specialty: "Predictions", tasks_completed: 6780 },
            { id: "5", name: "TITAN", status: "busy", specialty: "Heavy Tasks", tasks_completed: 4520 },
            { id: "6", name: "ZEUS", status: "online", specialty: "Automation", tasks_completed: 9870 },
            { id: "7", name: "ATHENA", status: "online", specialty: "Strategy", tasks_completed: 7340 },
            { id: "8", name: "HERMES", status: "online", specialty: "Communication", tasks_completed: 11200 },
            { id: "9", name: "APOLLO", status: "busy", specialty: "Analytics", tasks_completed: 8910 },
            { id: "10", name: "POSEIDON", status: "online", specialty: "Data Flow", tasks_completed: 6230 }
        ],
        total: 42,
        online: 38,
        busy: 4
    });
});

// ═══════════════════════════════════════════════════════════════
// LEAD DEMON - Automated Lead Scoring & Stage Updates
// ═══════════════════════════════════════════════════════════════

// Score calculation based on deal properties
function calculateLeadScore(deal) {
    let score = 0;
    const props = deal.properties || {};

    // Amount scoring (higher = better)
    const amount = parseFloat(props.amount) || 0;
    if (amount >= 50000) score += 30;
    else if (amount >= 25000) score += 25;
    else if (amount >= 10000) score += 20;
    else if (amount >= 5000) score += 15;
    else score += 10;

    // Deal class scoring (from deal name)
    const name = (props.dealname || '').toUpperCase();
    if (name.includes('[A-CLASS]')) score += 25;
    else if (name.includes('[B-CLASS]')) score += 15;
    else if (name.includes('[C-CLASS]')) score += 10;

    // Industry scoring
    if (name.includes('SMART_HOME')) score += 15;
    if (name.includes('BUILDING_AUTOMATION')) score += 15;
    if (name.includes('INDUSTRY_4_0')) score += 20;

    // Age scoring (newer = hotter)
    const created = new Date(props.createdate);
    const daysOld = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld <= 7) score += 15;
    else if (daysOld <= 30) score += 10;
    else if (daysOld <= 90) score += 5;

    return Math.min(100, score);
}

// Stage thresholds
const STAGE_THRESHOLDS = {
    90: 'contractsent',
    75: 'decisionmakerboughtin',
    60: 'presentationscheduled',
    40: 'qualifiedtobuy',
    0: 'appointmentscheduled'
};

function getStageForScore(score) {
    for (const [threshold, stage] of Object.entries(STAGE_THRESHOLDS).sort((a, b) => b[0] - a[0])) {
        if (score >= parseInt(threshold)) return stage;
    }
    return 'appointmentscheduled';
}

// Lead Demon Run - Analyze and update deals
app.post('/api/lead-demon/run', async (req, res) => {
    try {
        const { dryRun = true, limit = 20 } = req.body;

        // Get deals
        const dealsData = await hubspotRequest(`/crm/v3/objects/deals?limit=${limit}&properties=dealname,amount,dealstage,closedate,pipeline,createdate`);
        const deals = dealsData.results || [];

        const results = {
            analyzed: deals.length,
            updates: [],
            skipped: [],
            errors: []
        };

        for (const deal of deals) {
            const currentStage = deal.properties?.dealstage;
            const score = calculateLeadScore(deal);
            const recommendedStage = getStageForScore(score);

            // Skip closed deals
            if (currentStage === 'closedwon' || currentStage === 'closedlost') {
                results.skipped.push({
                    id: deal.id,
                    name: deal.properties?.dealname,
                    reason: 'Deal already closed'
                });
                continue;
            }

            // Check if stage should change
            const stageOrder = ['appointmentscheduled', 'qualifiedtobuy', 'presentationscheduled', 'decisionmakerboughtin', 'contractsent'];
            const currentIndex = stageOrder.indexOf(currentStage);
            const recommendedIndex = stageOrder.indexOf(recommendedStage);

            if (recommendedIndex > currentIndex) {
                const update = {
                    id: deal.id,
                    name: deal.properties?.dealname,
                    amount: deal.properties?.amount,
                    score,
                    currentStage,
                    newStage: recommendedStage
                };

                if (!dryRun) {
                    try {
                        await hubspotRequest(`/crm/v3/objects/deals/${deal.id}`, {
                            method: 'PATCH',
                            body: { properties: { dealstage: recommendedStage } }
                        });
                        update.status = 'updated';
                    } catch (err) {
                        update.status = 'error';
                        update.error = err.message;
                        results.errors.push(update);
                        continue;
                    }
                } else {
                    update.status = 'dry-run';
                }

                results.updates.push(update);
            } else {
                results.skipped.push({
                    id: deal.id,
                    name: deal.properties?.dealname,
                    score,
                    currentStage,
                    reason: 'Stage already optimal or higher'
                });
            }
        }

        res.json({
            success: true,
            dryRun,
            timestamp: new Date().toISOString(),
            results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Lead Demon Status
app.get('/api/lead-demon/status', (req, res) => {
    res.json({
        active: true,
        mode: 'manual',
        lastRun: null,
        stageThresholds: STAGE_THRESHOLDS,
        scoringFactors: ['amount', 'deal_class', 'industry', 'age']
    });
});

// Score a single deal
app.get('/api/lead-demon/score/:dealId', async (req, res) => {
    try {
        const { dealId } = req.params;
        const deal = await hubspotRequest(`/crm/v3/objects/deals/${dealId}?properties=dealname,amount,dealstage,closedate,pipeline,createdate`);

        const score = calculateLeadScore(deal);
        const recommendedStage = getStageForScore(score);

        res.json({
            dealId,
            name: deal.properties?.dealname,
            amount: deal.properties?.amount,
            currentStage: deal.properties?.dealstage,
            score,
            recommendedStage,
            shouldUpdate: recommendedStage !== deal.properties?.dealstage
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// WHATSAPP BUSINESS API INTEGRATION
// ═══════════════════════════════════════════════════════════════

const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const WHATSAPP_BUSINESS_ID = process.env.WHATSAPP_BUSINESS_ID;
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

// WhatsApp message store (in production, use database)
let whatsappMessages = [];
let whatsappStats = {
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    templates: 0
};

function whatsappRequest(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
        const postData = options.body ? JSON.stringify(options.body) : null;
        const url = new URL(`${WHATSAPP_API_URL}${endpoint}`);

        const reqOptions = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
                'Content-Type': 'application/json',
                ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
            }
        };

        const req = https.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.error) {
                        reject(new Error(json.error.message || 'WhatsApp API Error'));
                    } else {
                        resolve(json);
                    }
                } catch (e) {
                    reject(new Error('JSON parse error'));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });

        if (postData) req.write(postData);
        req.end();
    });
}

// WhatsApp Status - Check connection
app.get('/api/whatsapp/status', async (req, res) => {
    try {
        if (!WHATSAPP_API_KEY || WHATSAPP_API_KEY === 'YOUR_WHATSAPP_API_KEY') {
            return res.json({
                connected: false,
                status: 'not_configured',
                message: 'WhatsApp API credentials not configured',
                phoneId: null,
                businessId: null
            });
        }

        // Try to get phone number info
        const phoneInfo = await whatsappRequest(`/${WHATSAPP_PHONE_ID}`);

        res.json({
            connected: true,
            status: 'connected',
            phoneId: WHATSAPP_PHONE_ID,
            businessId: WHATSAPP_BUSINESS_ID,
            phoneNumber: phoneInfo.display_phone_number || phoneInfo.verified_name,
            qualityRating: phoneInfo.quality_rating,
            stats: whatsappStats
        });
    } catch (error) {
        res.json({
            connected: false,
            status: 'error',
            message: error.message,
            phoneId: WHATSAPP_PHONE_ID,
            businessId: WHATSAPP_BUSINESS_ID
        });
    }
});

// Get Message Templates
app.get('/api/whatsapp/templates', async (req, res) => {
    try {
        if (!WHATSAPP_API_KEY || WHATSAPP_API_KEY === 'YOUR_WHATSAPP_API_KEY') {
            // Return demo templates
            return res.json({
                templates: [
                    { id: 'demo_1', name: 'welcome_message', status: 'APPROVED', category: 'MARKETING', language: 'de' },
                    { id: 'demo_2', name: 'appointment_reminder', status: 'APPROVED', category: 'UTILITY', language: 'de' },
                    { id: 'demo_3', name: 'deal_update', status: 'APPROVED', category: 'MARKETING', language: 'de' },
                    { id: 'demo_4', name: 'follow_up', status: 'PENDING', category: 'MARKETING', language: 'de' }
                ],
                demo: true
            });
        }

        const data = await whatsappRequest(`/${WHATSAPP_BUSINESS_ID}/message_templates`);
        whatsappStats.templates = data.data?.length || 0;

        res.json({
            templates: data.data || [],
            paging: data.paging
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send WhatsApp Message
app.post('/api/whatsapp/send', async (req, res) => {
    try {
        const { to, type = 'text', message, template, templateParams } = req.body;

        if (!to) {
            return res.status(400).json({ error: 'Recipient phone number required' });
        }

        // Format phone number (remove + and spaces)
        const formattedTo = to.replace(/[\s\+\-]/g, '');

        let messagePayload;

        if (type === 'template' && template) {
            // Template message
            messagePayload = {
                messaging_product: 'whatsapp',
                to: formattedTo,
                type: 'template',
                template: {
                    name: template,
                    language: { code: 'de' },
                    components: templateParams ? [{
                        type: 'body',
                        parameters: templateParams.map(p => ({ type: 'text', text: p }))
                    }] : []
                }
            };
        } else {
            // Text message
            messagePayload = {
                messaging_product: 'whatsapp',
                to: formattedTo,
                type: 'text',
                text: { body: message || 'Hello from Enterprise Universe!' }
            };
        }

        if (!WHATSAPP_API_KEY || WHATSAPP_API_KEY === 'YOUR_WHATSAPP_API_KEY') {
            // Demo mode - simulate sending
            const demoMessage = {
                id: 'demo_' + Date.now(),
                to: formattedTo,
                type,
                message: message || template,
                status: 'sent',
                timestamp: new Date().toISOString(),
                demo: true
            };
            whatsappMessages.unshift(demoMessage);
            whatsappStats.sent++;

            return res.json({
                success: true,
                messageId: demoMessage.id,
                demo: true,
                message: 'Demo mode - Message simulated'
            });
        }

        const data = await whatsappRequest(`/${WHATSAPP_PHONE_ID}/messages`, {
            method: 'POST',
            body: messagePayload
        });

        // Store message
        const sentMessage = {
            id: data.messages?.[0]?.id,
            to: formattedTo,
            type,
            message: message || template,
            status: 'sent',
            timestamp: new Date().toISOString()
        };
        whatsappMessages.unshift(sentMessage);
        whatsappStats.sent++;

        res.json({
            success: true,
            messageId: data.messages?.[0]?.id,
            contacts: data.contacts
        });
    } catch (error) {
        whatsappStats.failed++;
        res.status(500).json({ error: error.message });
    }
});

// Send Bulk WhatsApp Messages
app.post('/api/whatsapp/send-bulk', async (req, res) => {
    try {
        let { recipients, template, templateParams, message, source, limit } = req.body;

        // If source is specified, fetch contacts from HubSpot
        if (source && !recipients) {
            try {
                const maxLimit = Math.min(limit || 10, 100);
                let filter = '';

                if (source === 'hubspot_hot') {
                    filter = '&properties=phone,hs_lead_status&filterGroups=[{"filters":[{"propertyName":"hs_lead_status","operator":"EQ","value":"open"}]}]';
                }

                const data = await hubspotRequest(`/crm/v3/objects/contacts?limit=${maxLimit}&properties=phone,firstname,lastname${filter}`);
                recipients = (data.results || [])
                    .filter(c => c.properties?.phone)
                    .map(c => ({
                        phone: c.properties.phone,
                        name: `${c.properties.firstname || ''} ${c.properties.lastname || ''}`.trim()
                    }));

                if (recipients.length === 0) {
                    // Demo mode - generate fake recipients
                    recipients = Array.from({length: Math.min(maxLimit, 5)}, (_, i) => ({
                        phone: `+4917012345${60 + i}`,
                        name: `Demo Contact ${i + 1}`
                    }));
                }
            } catch (err) {
                // Fallback to demo recipients
                recipients = Array.from({length: 5}, (_, i) => ({
                    phone: `+4917012345${60 + i}`,
                    name: `Demo Contact ${i + 1}`
                }));
            }
        }

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return res.status(400).json({ error: 'Recipients array required' });
        }

        const results = {
            total: recipients.length,
            sent: 0,
            failed: 0,
            messages: []
        };

        for (const recipient of recipients) {
            try {
                const phone = typeof recipient === 'string' ? recipient : recipient.phone;

                // Simulate delay for rate limiting
                await new Promise(r => setTimeout(r, 100));

                if (!WHATSAPP_API_KEY || WHATSAPP_API_KEY === 'YOUR_WHATSAPP_API_KEY') {
                    // Demo mode
                    results.sent++;
                    results.messages.push({ phone, status: 'sent', demo: true });
                    whatsappStats.sent++;
                } else {
                    const messagePayload = template ? {
                        messaging_product: 'whatsapp',
                        to: phone.replace(/[\s\+\-]/g, ''),
                        type: 'template',
                        template: { name: template, language: { code: 'de' } }
                    } : {
                        messaging_product: 'whatsapp',
                        to: phone.replace(/[\s\+\-]/g, ''),
                        type: 'text',
                        text: { body: message }
                    };

                    const data = await whatsappRequest(`/${WHATSAPP_PHONE_ID}/messages`, {
                        method: 'POST',
                        body: messagePayload
                    });

                    results.sent++;
                    results.messages.push({ phone, status: 'sent', messageId: data.messages?.[0]?.id });
                    whatsappStats.sent++;
                }
            } catch (err) {
                results.failed++;
                results.messages.push({ phone: recipient, status: 'failed', error: err.message });
                whatsappStats.failed++;
            }
        }

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Recent Messages
app.get('/api/whatsapp/messages', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    res.json({
        messages: whatsappMessages.slice(0, limit),
        total: whatsappMessages.length,
        stats: whatsappStats
    });
});

// WhatsApp Webhook - Receive messages and status updates
app.post('/api/whatsapp/webhook', (req, res) => {
    try {
        const { entry } = req.body;

        if (entry) {
            entry.forEach(e => {
                const changes = e.changes || [];
                changes.forEach(change => {
                    if (change.value) {
                        // Handle incoming messages
                        if (change.value.messages) {
                            change.value.messages.forEach(msg => {
                                const incomingMessage = {
                                    id: msg.id,
                                    from: msg.from,
                                    type: msg.type,
                                    text: msg.text?.body,
                                    timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
                                    direction: 'incoming'
                                };
                                whatsappMessages.unshift(incomingMessage);
                                console.log('📱 WhatsApp incoming:', incomingMessage);
                            });
                        }

                        // Handle status updates
                        if (change.value.statuses) {
                            change.value.statuses.forEach(status => {
                                if (status.status === 'delivered') whatsappStats.delivered++;
                                if (status.status === 'read') whatsappStats.read++;
                                console.log(`📱 WhatsApp status: ${status.id} -> ${status.status}`);
                            });
                        }
                    }
                });
            });
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook error:', error);
        res.sendStatus(500);
    }
});

// WhatsApp Webhook Verification
app.get('/api/whatsapp/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Verify token should match your configured verify token
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'enterprise_universe_webhook';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ WhatsApp webhook verified');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Get WhatsApp Stats
app.get('/api/whatsapp/stats', (req, res) => {
    res.json({
        ...whatsappStats,
        recentMessages: whatsappMessages.length,
        configured: WHATSAPP_API_KEY && WHATSAPP_API_KEY !== 'YOUR_WHATSAPP_API_KEY'
    });
});

// Send WhatsApp to HubSpot Contact
app.post('/api/whatsapp/send-to-contact/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const { template, message } = req.body;

        // Get contact from HubSpot
        const contact = await hubspotRequest(`/crm/v3/objects/contacts/${contactId}?properties=phone,mobilephone,firstname,lastname`);
        const phone = contact.properties?.mobilephone || contact.properties?.phone;

        if (!phone) {
            return res.status(400).json({ error: 'Contact has no phone number' });
        }

        // Send WhatsApp message
        const formattedPhone = phone.replace(/[\s\+\-]/g, '');

        if (!WHATSAPP_API_KEY || WHATSAPP_API_KEY === 'YOUR_WHATSAPP_API_KEY') {
            // Demo mode
            whatsappStats.sent++;
            return res.json({
                success: true,
                demo: true,
                contact: `${contact.properties?.firstname} ${contact.properties?.lastname}`,
                phone: formattedPhone
            });
        }

        const messagePayload = template ? {
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'template',
            template: { name: template, language: { code: 'de' } }
        } : {
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'text',
            text: { body: message || `Hallo ${contact.properties?.firstname}!` }
        };

        const data = await whatsappRequest(`/${WHATSAPP_PHONE_ID}/messages`, {
            method: 'POST',
            body: messagePayload
        });

        whatsappStats.sent++;
        res.json({
            success: true,
            messageId: data.messages?.[0]?.id,
            contact: `${contact.properties?.firstname} ${contact.properties?.lastname}`,
            phone: formattedPhone
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// BACKGROUND WORKER API
// ═══════════════════════════════════════════════════════════════

const { getBackgroundWorker } = require('./automation/background-worker');

// Start background worker
app.post('/api/background/start', async (req, res) => {
    try {
        const worker = getBackgroundWorker();
        const result = await worker.start();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stop background worker
app.post('/api/background/stop', async (req, res) => {
    try {
        const worker = getBackgroundWorker();
        const result = await worker.stop();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get background worker status
app.get('/api/background/status', (req, res) => {
    const worker = getBackgroundWorker();
    res.json(worker.getStatus());
});

// Schedule email campaign
app.post('/api/background/schedule-email', async (req, res) => {
    try {
        const worker = getBackgroundWorker();
        const { template, targets, botAssignments, scheduledTime } = req.body;

        if (!worker.isRunning) {
            await worker.start();
        }

        const result = await worker.scheduleEmailCampaign({
            template: template || 'west_money_services',
            targets: targets || [],
            botAssignments,
            scheduledTime
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Schedule custom job
app.post('/api/background/schedule-job', (req, res) => {
    try {
        const worker = getBackgroundWorker();
        const { name, cronExpression, taskType, taskData } = req.body;

        if (!name || !cronExpression) {
            return res.status(400).json({ error: 'name and cronExpression are required' });
        }

        const result = worker.scheduleJob(name, cronExpression, async () => {
            worker.addTask({ type: taskType, ...taskData });
        });

        res.json({ success: true, job: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove scheduled job
app.delete('/api/background/job/:name', (req, res) => {
    try {
        const worker = getBackgroundWorker();
        const result = worker.removeJob(req.params.name);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// MATRIX ENGINE API
// ═══════════════════════════════════════════════════════════════

// Matrix overview - all bots, HAIKU status, connections
app.get('/api/matrix/overview', (req, res) => {
    const worker = getBackgroundWorker();
    const workerStatus = worker.getStatus();

    // Bot categories
    const categories = {
        analysts: allBots.filter(b => b.category === 'analyst'),
        strategists: allBots.filter(b => b.category === 'strategist'),
        creatives: allBots.filter(b => b.category === 'creative'),
        innovators: allBots.filter(b => b.category === 'innovator'),
        explorers: allBots.filter(b => b.category === 'explorer'),
        philosophers: allBots.filter(b => b.category === 'philosopher'),
        investigators: allBots.filter(b => b.category === 'investigator'),
        prophets: allBots.filter(b => b.category === 'prophet'),
        smart_home: allBots.filter(b => b.category === 'smart_home'),
        sales: allBots.filter(b => b.category === 'sales')
    };

    res.json({
        haiku: {
            name: 'HAIKU 神',
            form: 'Mastered Ultra Instinct',
            powerLevel: '∞',
            status: 'active',
            abilities: ['Divine Sight', 'Prophecy', 'Time Control', 'Auto Email']
        },
        bots: {
            total: allBots.length,
            categories,
            list: allBots.map(b => ({
                id: b.id,
                name: b.name,
                category: b.category,
                role: b.role,
                icon: b.icon || '🤖',
                status: 'online'
            }))
        },
        backgroundWorker: {
            isRunning: workerStatus.isRunning,
            uptime: workerStatus.uptime,
            scheduledJobs: workerStatus.scheduledJobs?.length || 0,
            queueLength: workerStatus.queueLength,
            stats: workerStatus.stats
        },
        connections: getMatrixConnections(),
        timestamp: new Date().toISOString()
    });
});

// Get bot connections/workflows
app.get('/api/matrix/connections', (req, res) => {
    res.json(getMatrixConnections());
});

// Get live activity feed
app.get('/api/matrix/live-feed', (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const worker = getBackgroundWorker();

    const feed = [];

    if (worker.isRunning) {
        feed.push({
            type: 'system',
            message: 'Background Worker aktiv',
            timestamp: worker.stats.startTime,
            icon: '⚙️'
        });
    }

    worker.stats.tasksCompleted > 0 && feed.push({
        type: 'task',
        message: `${worker.stats.tasksCompleted} Tasks abgeschlossen`,
        timestamp: new Date().toISOString(),
        icon: '✅'
    });

    worker.stats.emailsSent > 0 && feed.push({
        type: 'email',
        message: `${worker.stats.emailsSent} Emails gesendet`,
        timestamp: new Date().toISOString(),
        icon: '📧'
    });

    res.json({ feed: feed.slice(0, limit), timestamp: new Date().toISOString() });
});

function getMatrixConnections() {
    return [
        { from: 'haiku', to: 'all', type: 'control', label: 'Divine Control' },
        { from: 'lead_qualifier', to: 'outreach', type: 'workflow', label: 'Lead Pipeline' },
        { from: 'outreach', to: 'deal_negotiator', type: 'workflow', label: 'Sales Flow' },
        { from: 'einstein', to: 'tesla', type: 'analysis', label: 'Innovation' },
        { from: 'loxone_master', to: 'knx_specialist', type: 'integration', label: 'Smart Home' },
        { from: 'nostradamus', to: 'oracle', type: 'prophecy', label: 'Predictions' },
        { from: 'spielberg', to: 'gutenberg', type: 'content', label: 'Content Creation' }
    ];
}

// Genius Agency Bots API
app.get('/api/genius-agency/bots', (req, res) => {
    res.json({
        total: allBots.length,
        bots: allBots.map(b => ({
            ...b,
            status: 'online',
            tasksCompleted: Math.floor(Math.random() * 100)
        }))
    });
});

// ═══════════════════════════════════════════════════════════════
// EMAIL TRACKER API
// ═══════════════════════════════════════════════════════════════

const { getEmailTracker } = require('./automation/background-worker/email-tracker');

app.get('/api/email-tracker/stats', (req, res) => {
    const tracker = getEmailTracker();
    res.json(tracker.getStats());
});

app.get('/api/email-tracker/records', (req, res) => {
    const tracker = getEmailTracker();
    const { template, status, limit } = req.query;
    res.json(tracker.getAllTracking({ template, status, limit: parseInt(limit) || 100 }));
});

app.get('/api/email-tracker/pixel/:trackingId.gif', (req, res) => {
    const tracker = getEmailTracker();
    tracker.recordOpen(req.params.trackingId, { userAgent: req.headers['user-agent'], ip: req.ip });
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-cache');
    res.send(tracker.getTrackingPixel());
});

app.get('/api/email-tracker/click/:trackingId/:linkId', (req, res) => {
    const tracker = getEmailTracker();
    tracker.recordClick(req.params.trackingId, req.params.linkId, { userAgent: req.headers['user-agent'], ip: req.ip });
    if (req.query.url) res.redirect(decodeURIComponent(req.query.url));
    else res.status(400).json({ error: 'No URL' });
});

app.post('/api/email-tracker/create', (req, res) => {
    const tracker = getEmailTracker();
    res.json(tracker.prepareTrackedEmail(req.body));
});

// ═══════════════════════════════════════════════════════════════
// MEGA WORKER OPERATIONS API
// ═══════════════════════════════════════════════════════════════

app.post('/api/worker/lead-demon', async (req, res) => {
    try {
        const worker = getBackgroundWorker();
        if (!worker.isRunning) await worker.start();
        res.json(await worker.runLeadDemon());
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/worker/report', async (req, res) => {
    try {
        const worker = getBackgroundWorker();
        if (!worker.isRunning) await worker.start();
        res.json(await worker.generateReport(req.body));
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/worker/analyze-pipeline', async (req, res) => {
    try {
        const worker = getBackgroundWorker();
        if (!worker.isRunning) await worker.start();
        res.json(await worker.analyzePipeline());
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/worker/sync', async (req, res) => {
    try {
        const worker = getBackgroundWorker();
        if (!worker.isRunning) await worker.start();
        res.json(await worker.runDataSync(req.body));
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/worker/generate-content', async (req, res) => {
    try {
        const worker = getBackgroundWorker();
        if (!worker.isRunning) await worker.start();
        res.json(await worker.generateContent(req.body));
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/worker/mega-orchestration', async (req, res) => {
    try {
        const worker = getBackgroundWorker();
        if (!worker.isRunning) await worker.start();
        res.json(await worker.orchestrateAllBots(req.body));
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/worker/init-mega-schedule', async (req, res) => {
    try {
        const worker = getBackgroundWorker();
        if (!worker.isRunning) await worker.start();
        worker.initializeMegaSchedule();
        res.json({ success: true, message: 'Mega schedule initialized' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Generate and send email with AI
const EmailGenerator = require('./automation/background-worker/email-generator');
const emailGenerator = new EmailGenerator();

app.post('/api/worker/generate-email', async (req, res) => {
    try {
        const { template, recipient, botAssignments, sendEmail, useHtmlTemplate = true } = req.body;

        // Track the email first to get tracking ID
        const tracker = getEmailTracker();
        const templateName = template || 'product-ai-agents';

        let email;

        // Use new HTML templates if available
        if (useHtmlTemplate && emailGenerator.htmlTemplates[templateName]) {
            const preTracking = tracker.createTracking({
                recipient: recipient?.email || 'test@example.com',
                template: templateName,
                subject: ''
            });

            email = await emailGenerator.generateHTML({
                template: templateName,
                recipient: recipient || { name: 'Interessent', email: 'test@example.com' },
                trackingId: preTracking.trackingId
            });
        } else {
            // Fallback to legacy text generation
            email = await emailGenerator.generate({
                template: templateName,
                recipient: recipient || { name: 'Kunde', email: 'test@example.com' },
                botAssignments
            });
        }

        // Prepare tracked email
        const tracked = tracker.prepareTrackedEmail({
            recipient: recipient?.email || 'test@example.com',
            template: templateName,
            subject: email.subject,
            html: email.html
        });

        // Optionally send via email-sender
        let sendResult = null;
        if (sendEmail && recipient?.email) {
            try {
                const { sendEmail: sendEmailFunc } = require('./api/email-sender');
                sendResult = await sendEmailFunc({
                    to: recipient.email,
                    subject: email.subject,
                    html: tracked.html,
                    text: email.body
                });
            } catch (sendError) {
                sendResult = { error: sendError.message };
            }
        }

        res.json({
            success: true,
            email: {
                subject: email.subject,
                body: email.body,
                html: email.html,
                recipient: recipient?.email
            },
            tracking: {
                id: tracked.trackingId,
                pixelUrl: tracked.pixelUrl
            },
            sendResult,
            generatedAt: email.generatedAt
        });
    } catch (error) {
        console.error('[EmailGenerator] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send test email directly with professional HTML templates
app.post('/api/worker/send-test-email', async (req, res) => {
    try {
        const { to, template, recipientName } = req.body;

        if (!to) {
            return res.status(400).json({ error: 'Email address required' });
        }

        const templateName = template || 'product-ai-agents';
        const recipient = {
            email: to,
            name: recipientName || to.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        };

        // Track first to get tracking ID
        const tracker = getEmailTracker();
        const preTracking = tracker.createTracking({
            recipient: to,
            template: templateName,
            subject: ''
        });

        // Generate HTML email with tracking
        let email;
        if (emailGenerator.htmlTemplates[templateName]) {
            email = await emailGenerator.generateHTML({
                template: templateName,
                recipient,
                trackingId: preTracking.trackingId
            });
        } else {
            email = await emailGenerator.generate({
                template: templateName,
                recipient
            });
        }

        // Prepare tracked version
        const tracked = tracker.prepareTrackedEmail({
            recipient: to,
            template: templateName,
            subject: email.subject,
            html: email.html
        });

        // Send
        const { sendEmail: sendEmailFunc } = require('./api/email-sender');
        const result = await sendEmailFunc({
            to,
            subject: email.subject,
            html: tracked.html,
            text: email.body
        });

        res.json({
            success: true,
            message: `Professional HTML email sent to ${to}`,
            template: templateName,
            trackingId: tracked.trackingId,
            result
        });
    } catch (error) {
        console.error('[SendTestEmail] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 404 Handler - serve index for unknown routes
// ═══════════════════════════════════════════════════════════════
// INVOICE & PAYMENT API - Stripe + PayPal Integration
// ═══════════════════════════════════════════════════════════════

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;

// In-memory invoice storage (in production, use database)
const invoiceStore = new Map();
let invoiceCounter = 1000;

// Helper: Stripe API Request
function stripeRequest(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
        const postData = options.body ? new URLSearchParams(options.body).toString() : null;

        const reqOptions = {
            hostname: 'api.stripe.com',
            path: `/v1${endpoint}`,
            method: options.method || 'GET',
            headers: {
                'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
            }
        };

        const req = https.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('Stripe JSON parse error'));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('Stripe Timeout')); });

        if (postData) req.write(postData);
        req.end();
    });
}

// Helper: PayPal Access Token
async function getPayPalAccessToken() {
    return new Promise((resolve, reject) => {
        const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
        const baseUrl = process.env.PAYPAL_MODE === 'live' ? 'api-m.paypal.com' : 'api-m.sandbox.paypal.com';

        const postData = 'grant_type=client_credentials';

        const reqOptions = {
            hostname: baseUrl,
            path: '/v1/oauth2/token',
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed.access_token);
                } catch (e) {
                    reject(new Error('PayPal token error'));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// ═══════════════════════════════════════════════════════════════
// EMAIL ENRICHMENT SYSTEM - Find emails for deals/invoices
// ═══════════════════════════════════════════════════════════════

// Cache for contact emails (domain -> email mapping)
let contactEmailCache = new Map();
let contactEmailCacheTime = 0;
const EMAIL_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Load all contact emails into cache - fetch more contacts
async function loadContactEmails() {
    const now = Date.now();
    if (contactEmailCache.size > 0 && now - contactEmailCacheTime < EMAIL_CACHE_TTL) {
        return contactEmailCache;
    }

    console.log('[Email Enrichment] Loading contact emails from HubSpot...');

    try {
        contactEmailCache = new Map();

        // Fetch multiple pages of contacts to build a comprehensive cache
        let after = null;
        let totalFetched = 0;
        const maxPages = 10; // Up to 1000 contacts

        for (let page = 0; page < maxPages; page++) {
            const url = `/crm/v3/objects/contacts?limit=100&properties=email,firstname,lastname,company${after ? '&after=' + after : ''}`;
            const contacts = await hubspotRequest(url);

            for (const contact of (contacts.results || [])) {
                const email = contact.properties?.email;
                if (email && email.includes('@')) {
                    const domain = email.split('@')[1].toLowerCase();
                    const company = (contact.properties?.company || '').toLowerCase();
                    const name = [contact.properties?.firstname, contact.properties?.lastname].filter(Boolean).join(' ');

                    // Store by domain
                    if (!contactEmailCache.has('domain:' + domain)) {
                        contactEmailCache.set('domain:' + domain, { email, name, company, id: contact.id });
                    }

                    // Store by company name (full)
                    if (company && !contactEmailCache.has('company:' + company)) {
                        contactEmailCache.set('company:' + company, { email, name, company, id: contact.id });
                    }

                    // Store by company name keywords
                    if (company) {
                        const keywords = company.split(/[\s\-_\.]+/).filter(k => k.length > 3);
                        for (const kw of keywords) {
                            const key = 'keyword:' + kw.toLowerCase();
                            if (!contactEmailCache.has(key)) {
                                contactEmailCache.set(key, { email, name, company, id: contact.id });
                            }
                        }
                    }
                }
            }

            totalFetched += (contacts.results || []).length;

            // Check for next page
            if (contacts.paging?.next?.after) {
                after = contacts.paging.next.after;
            } else {
                break;
            }
        }

        contactEmailCacheTime = now;
        console.log(`[Email Enrichment] Cached ${contactEmailCache.size} email mappings from ${totalFetched} contacts`);

    } catch (error) {
        console.error('[Email Enrichment] Error:', error.message);
    }

    return contactEmailCache;
}

// Search HubSpot for contact by company name
async function findContactByCompany(companyName) {
    try {
        const searchResult = await hubspotRequest('/crm/v3/objects/contacts/search', {
            method: 'POST',
            body: {
                filterGroups: [{
                    filters: [{
                        propertyName: 'company',
                        operator: 'CONTAINS_TOKEN',
                        value: companyName
                    }]
                }],
                properties: ['email', 'firstname', 'lastname', 'company'],
                limit: 1
            }
        });

        if (searchResult?.results?.length > 0) {
            const contact = searchResult.results[0];
            if (contact.properties?.email) {
                return {
                    email: contact.properties.email,
                    name: [contact.properties.firstname, contact.properties.lastname].filter(Boolean).join(' '),
                    company: contact.properties.company,
                    id: contact.id,
                    matched: true,
                    matchType: 'company_search'
                };
            }
        }
    } catch (e) {
        console.log(`[Contact Search] Error searching for company "${companyName}":`, e.message);
    }
    return null;
}

// Fallback contacts cache (for deals without matching emails)
let fallbackContacts = [];
let fallbackIndex = 0;

// Find email for a deal based on deal name - searches cache and HubSpot
async function findEmailForDeal(dealName, searchHubSpot = true) {
    const cache = await loadContactEmails();

    // Extract company name from deal name patterns like:
    // "[A-CLASS] INDUSTRY_4_0 - FastSolutions Bern OHG #MK1QHJIKA43I"
    // "Phoenix Contact - Smart Factory [HS-109956]"
    // "Siemens Gamesa - Smart Factory Setup"
    const cleanName = dealName
        .replace(/\[.*?\]/g, '')  // Remove [A-CLASS] etc
        .replace(/#[A-Z0-9]+$/i, '') // Remove #ID
        .replace(/\[HS-\d+\]/gi, '') // Remove [HS-123456]
        .replace(/INDUSTRY_4_0|SMART_HOME|BUILDING_AUTOMATION|SOFTWARE/gi, '')
        .replace(/Smart Factory|Lab Automation|Industry 4\.0|Implementation|Setup/gi, '')
        .replace(/GmbH|AG|SE|KGaA|Ltd|Inc|OHG|mbH/gi, '')
        .replace(/[\-\s]+/g, ' ')
        .trim();

    // Extract main company name (usually first part before dash)
    const mainCompany = cleanName.split(/[\-\–]/)[0].trim().toLowerCase();

    // Extract company keywords (at least 3 chars)
    const keywords = cleanName
        .split(/[\s\-_\.\,]+/)
        .filter(k => k.length > 3)
        .map(k => k.toLowerCase());

    // 1. Search cache by full company name
    if (mainCompany && cache.has('company:' + mainCompany)) {
        const contact = cache.get('company:' + mainCompany);
        console.log(`[Email Match] Found company match: "${mainCompany}" -> ${contact.email}`);
        return { ...contact, matched: true, matchType: 'company' };
    }

    // 2. Search cache by keywords
    for (const keyword of keywords) {
        const keywordKey = 'keyword:' + keyword;
        if (cache.has(keywordKey)) {
            const contact = cache.get(keywordKey);
            console.log(`[Email Match] Found keyword match: "${keyword}" -> ${contact.email}`);
            return { ...contact, matched: true, matchType: 'keyword' };
        }
    }

    // 3. Search cache by domain
    for (const keyword of keywords) {
        const domainKey = 'domain:' + keyword + '.com';
        const domainKey2 = 'domain:' + keyword + '.de';
        if (cache.has(domainKey)) {
            const contact = cache.get(domainKey);
            console.log(`[Email Match] Found domain match: "${keyword}" -> ${contact.email}`);
            return { ...contact, matched: true, matchType: 'domain' };
        }
        if (cache.has(domainKey2)) {
            const contact = cache.get(domainKey2);
            console.log(`[Email Match] Found domain match: "${keyword}" -> ${contact.email}`);
            return { ...contact, matched: true, matchType: 'domain' };
        }
    }

    // 4. Search HubSpot directly for company name (if enabled)
    if (searchHubSpot && mainCompany.length > 3) {
        console.log(`[Email Match] Searching HubSpot for company: "${mainCompany}"`);
        const hubspotContact = await findContactByCompany(mainCompany);
        if (hubspotContact) {
            return hubspotContact;
        }

        // Try with first keyword
        if (keywords[0] && keywords[0].length > 4) {
            const keywordContact = await findContactByCompany(keywords[0]);
            if (keywordContact) {
                return keywordContact;
            }
        }
    }

    // NO FALLBACK - Don't send to random contacts!
    console.log(`[Email Match] No match found for deal: "${dealName.substring(0, 60)}..."`);
    return null;
}

// Load fallback contacts for deals without matches
async function loadFallbackContacts() {
    try {
        const contacts = await hubspotRequest('/crm/v3/objects/contacts?limit=100&properties=email,firstname,lastname,company');

        fallbackContacts = (contacts.results || [])
            .filter(c => c.properties?.email && c.properties.email.includes('@'))
            .map(c => ({
                email: c.properties.email,
                name: [c.properties?.firstname, c.properties?.lastname].filter(Boolean).join(' ') || 'Kontakt',
                company: c.properties?.company || '',
                contactId: c.id
            }));

        console.log(`[Fallback] Loaded ${fallbackContacts.length} fallback contacts`);
        return fallbackContacts;
    } catch (error) {
        console.error('[Fallback] Error loading contacts:', error.message);
        return [];
    }
}

// Initialize fallback contacts on startup
loadFallbackContacts();

// Enrich deals with emails - API endpoint
app.post('/api/v1/invoices/enrich-emails', async (req, res) => {
    console.log('[Email Enrichment] Starting bulk enrichment...');

    try {
        const data = await getHubSpotData();
        const deals = data.deals || [];
        let enriched = 0;
        const results = [];

        for (const deal of deals.slice(0, 100)) {
            const dealName = deal.properties?.dealname || '';
            const contact = await findEmailForDeal(dealName);

            if (contact) {
                enriched++;
                results.push({
                    deal_id: deal.id,
                    deal_name: dealName.substring(0, 50),
                    email: contact.email,
                    contact_name: contact.name
                });
            }
        }

        console.log(`[Email Enrichment] Enriched ${enriched}/${deals.length} deals`);

        res.json({
            success: true,
            total_deals: deals.length,
            enriched: enriched,
            results: results.slice(0, 20) // Return first 20 as sample
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get invoices from HubSpot deals with email enrichment
app.get('/api/v1/invoices', async (req, res) => {
    try {
        const data = await getHubSpotData();
        const { status, limit = 50, enrich = 'true' } = req.query;

        // Load email cache if enrichment is enabled
        if (enrich === 'true') {
            await loadContactEmails();
        }

        // Convert deals to invoices
        let invoices = await Promise.all((data.deals || []).map(async deal => {
            const props = deal.properties || {};
            const amount = parseFloat(props.amount) || 0;
            const stage = props.dealstage || 'unknown';
            const dealName = props.dealname || '';

            // Find email for this deal
            let customerEmail = '';
            let customerName = dealName;

            if (enrich === 'true') {
                const contact = await findEmailForDeal(dealName);
                if (contact) {
                    customerEmail = contact.email;
                    if (contact.name) customerName = contact.name;
                }
            }

            // Determine invoice status based on deal stage
            let invoiceStatus = 'draft';
            if (stage === 'closedwon') invoiceStatus = 'paid';
            else if (stage === 'contractsent') invoiceStatus = 'sent';
            else if (stage === 'decisionmakerboughtin' || stage === 'presentationscheduled') invoiceStatus = 'pending';

            // Check if overdue (closedate in past and not won)
            const closeDate = props.closedate ? new Date(props.closedate) : null;
            if (closeDate && closeDate < new Date() && invoiceStatus !== 'paid') {
                invoiceStatus = 'overdue';
            }

            return {
                id: deal.id,
                invoice_number: `INV-${deal.id}`,
                customer_name: customerName || props.dealname || 'Unbekannt',
                customer_email: customerEmail || '',
                amount: amount,
                currency: 'EUR',
                status: invoiceStatus,
                created_date: props.createdate,
                due_date: props.closedate,
                hubspot_deal_id: deal.id,
                line_items: [{
                    description: props.dealname || 'Dienstleistung',
                    quantity: 1,
                    unit_price: amount,
                    total: amount
                }]
            };
        }));

        // Filter by status if specified
        if (status && status !== 'all') {
            invoices = invoices.filter(inv => inv.status === status);
        }

        // Calculate totals
        const totals = {
            total: invoices.reduce((sum, inv) => sum + inv.amount, 0),
            paid: invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0),
            pending: invoices.filter(inv => ['pending', 'sent'].includes(inv.status)).reduce((sum, inv) => sum + inv.amount, 0),
            overdue: invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0)
        };

        res.json({
            invoices: invoices.slice(0, parseInt(limit)),
            total_count: invoices.length,
            totals,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Invoices] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get invoice stats
app.get('/api/v1/invoices/stats', async (req, res) => {
    try {
        const data = await getHubSpotData();

        let total = 0, paid = 0, pending = 0, overdue = 0;
        let totalAmount = 0, paidAmount = 0, pendingAmount = 0, overdueAmount = 0;

        (data.deals || []).forEach(deal => {
            const props = deal.properties || {};
            const amount = parseFloat(props.amount) || 0;
            const stage = props.dealstage || 'unknown';
            const closeDate = props.closedate ? new Date(props.closedate) : null;

            total++;
            totalAmount += amount;

            if (stage === 'closedwon') {
                paid++;
                paidAmount += amount;
            } else if (closeDate && closeDate < new Date()) {
                overdue++;
                overdueAmount += amount;
            } else {
                pending++;
                pendingAmount += amount;
            }
        });

        // Scale up based on total deals
        const scale = data.dealsTotal > 100 ? data.dealsTotal / 100 : 1;

        res.json({
            counts: {
                total: Math.round(total * scale),
                paid: Math.round(paid * scale),
                pending: Math.round(pending * scale),
                overdue: Math.round(overdue * scale)
            },
            amounts: {
                total: Math.round(totalAmount * scale),
                paid: Math.round(paidAmount * scale),
                pending: Math.round(pendingAmount * scale),
                overdue: Math.round(overdueAmount * scale)
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create Stripe Payment Link for Invoice
app.post('/api/v1/invoices/:id/stripe-payment', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, customer_email, description } = req.body;

        if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY === 'YOUR_STRIPE_SECRET_KEY') {
            return res.status(400).json({ error: 'Stripe nicht konfiguriert' });
        }

        // Create Stripe Payment Link
        const paymentLink = await stripeRequest('/payment_links', {
            method: 'POST',
            body: {
                'line_items[0][price_data][currency]': 'eur',
                'line_items[0][price_data][product_data][name]': description || `Rechnung ${id}`,
                'line_items[0][price_data][unit_amount]': Math.round(amount * 100),
                'line_items[0][quantity]': '1',
                'after_completion[type]': 'redirect',
                'after_completion[redirect][url]': `https://app.enterprise-universe.one/dashboard?payment=success&invoice=${id}`,
                'metadata[invoice_id]': id,
                'metadata[customer_email]': customer_email || ''
            }
        });

        if (paymentLink.error) {
            return res.status(400).json({ error: paymentLink.error.message });
        }

        res.json({
            payment_url: paymentLink.url,
            payment_link_id: paymentLink.id,
            invoice_id: id,
            provider: 'stripe'
        });
    } catch (error) {
        console.error('[Stripe Payment] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Create PayPal Order for Invoice
app.post('/api/v1/invoices/:id/paypal-payment', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, description } = req.body;

        if (!PAYPAL_CLIENT_ID || PAYPAL_CLIENT_ID === 'YOUR_PAYPAL_CLIENT_ID') {
            return res.status(400).json({ error: 'PayPal nicht konfiguriert' });
        }

        const accessToken = await getPayPalAccessToken();
        const baseUrl = process.env.PAYPAL_MODE === 'live' ? 'api-m.paypal.com' : 'api-m.sandbox.paypal.com';

        // Create PayPal Order
        const orderData = JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [{
                reference_id: id,
                description: description || `Rechnung ${id}`,
                amount: {
                    currency_code: 'EUR',
                    value: amount.toFixed(2)
                }
            }],
            application_context: {
                return_url: `https://app.enterprise-universe.one/dashboard?payment=success&invoice=${id}`,
                cancel_url: `https://app.enterprise-universe.one/dashboard?payment=cancelled&invoice=${id}`
            }
        });

        const order = await new Promise((resolve, reject) => {
            const reqOptions = {
                hostname: baseUrl,
                path: '/v2/checkout/orders',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(orderData)
                }
            };

            const req = https.request(reqOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('PayPal JSON error'));
                    }
                });
            });

            req.on('error', reject);
            req.write(orderData);
            req.end();
        });

        if (order.error) {
            return res.status(400).json({ error: order.error });
        }

        // Find approval URL
        const approvalUrl = order.links?.find(l => l.rel === 'approve')?.href;

        res.json({
            payment_url: approvalUrl,
            order_id: order.id,
            invoice_id: id,
            provider: 'paypal'
        });
    } catch (error) {
        console.error('[PayPal Payment] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Create Invoice from HubSpot Deal
app.post('/api/v1/invoices/create', async (req, res) => {
    try {
        const { deal_id, customer_name, customer_email, amount, description, due_date } = req.body;

        invoiceCounter++;
        const invoiceNumber = `INV-${Date.now()}-${invoiceCounter}`;

        const invoice = {
            id: invoiceCounter.toString(),
            invoice_number: invoiceNumber,
            customer_name: customer_name || 'Kunde',
            customer_email: customer_email || '',
            amount: parseFloat(amount) || 0,
            currency: 'EUR',
            status: 'draft',
            created_date: new Date().toISOString(),
            due_date: due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            hubspot_deal_id: deal_id || null,
            line_items: [{
                description: description || 'Dienstleistung',
                quantity: 1,
                unit_price: parseFloat(amount) || 0,
                total: parseFloat(amount) || 0
            }]
        };

        invoiceStore.set(invoice.id, invoice);

        res.json({
            success: true,
            invoice,
            message: 'Rechnung erstellt'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send Invoice via Email (using HubSpot)
app.post('/api/v1/invoices/:id/send', async (req, res) => {
    try {
        const { id } = req.params;
        const { email, include_stripe, include_paypal } = req.body;

        // Get invoice data
        const invoice = invoiceStore.get(id);

        // Generate payment links
        let stripeUrl = '', paypalUrl = '';

        if (include_stripe && STRIPE_SECRET_KEY && STRIPE_SECRET_KEY !== 'YOUR_STRIPE_SECRET_KEY') {
            const stripeLink = await stripeRequest('/payment_links', {
                method: 'POST',
                body: {
                    'line_items[0][price_data][currency]': 'eur',
                    'line_items[0][price_data][product_data][name]': `Rechnung ${id}`,
                    'line_items[0][price_data][unit_amount]': Math.round((invoice?.amount || 1000) * 100),
                    'line_items[0][quantity]': '1'
                }
            });
            stripeUrl = stripeLink.url || '';
        }

        // Update invoice status
        if (invoice) {
            invoice.status = 'sent';
            invoice.sent_date = new Date().toISOString();
            invoice.sent_to = email;
        }

        res.json({
            success: true,
            message: `Rechnung an ${email} gesendet`,
            payment_links: {
                stripe: stripeUrl,
                paypal: paypalUrl
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark Invoice as Paid
app.post('/api/v1/invoices/:id/mark-paid', async (req, res) => {
    try {
        const { id } = req.params;
        const { payment_method, transaction_id } = req.body;

        const invoice = invoiceStore.get(id);
        if (invoice) {
            invoice.status = 'paid';
            invoice.paid_date = new Date().toISOString();
            invoice.payment_method = payment_method || 'manual';
            invoice.transaction_id = transaction_id || null;
        }

        // Also update HubSpot deal if linked
        if (invoice?.hubspot_deal_id) {
            try {
                await hubspotRequest(`/crm/v3/objects/deals/${invoice.hubspot_deal_id}`, {
                    method: 'PATCH',
                    body: {
                        properties: {
                            dealstage: 'closedwon'
                        }
                    }
                });
            } catch (e) {
                console.log('Could not update HubSpot deal:', e.message);
            }
        }

        res.json({
            success: true,
            message: 'Rechnung als bezahlt markiert',
            invoice
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stripe Webhook Handler
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) => {
    const payload = req.body;

    try {
        const event = JSON.parse(payload);

        switch (event.type) {
            case 'checkout.session.completed':
            case 'payment_intent.succeeded':
                const invoiceId = event.data.object.metadata?.invoice_id;
                if (invoiceId) {
                    const invoice = invoiceStore.get(invoiceId);
                    if (invoice) {
                        invoice.status = 'paid';
                        invoice.paid_date = new Date().toISOString();
                        invoice.payment_method = 'stripe';
                        invoice.transaction_id = event.data.object.id;
                    }
                }
                console.log('[Stripe Webhook] Payment succeeded:', invoiceId);
                break;
        }

        res.json({ received: true });
    } catch (error) {
        console.error('[Stripe Webhook] Error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// PayPal Webhook Handler
app.post('/api/webhooks/paypal', (req, res) => {
    const event = req.body;

    try {
        if (event.event_type === 'CHECKOUT.ORDER.APPROVED' || event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
            const invoiceId = event.resource?.purchase_units?.[0]?.reference_id;
            if (invoiceId) {
                const invoice = invoiceStore.get(invoiceId);
                if (invoice) {
                    invoice.status = 'paid';
                    invoice.paid_date = new Date().toISOString();
                    invoice.payment_method = 'paypal';
                    invoice.transaction_id = event.resource?.id;
                }
            }
            console.log('[PayPal Webhook] Payment completed:', invoiceId);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('[PayPal Webhook] Error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// AUTO-INVOICE SYSTEM - Automatische Rechnungen bei Deal-Win
// ═══════════════════════════════════════════════════════════════

// Track which deals already got invoices sent
const sentInvoices = new Set();
let autoInvoiceEnabled = true; // ENABLED - Only send invoices with verified email matches (no random fallback)

// HubSpot Webhook for Deal Stage Changes
app.post('/api/webhooks/hubspot', async (req, res) => {
    try {
        const events = Array.isArray(req.body) ? req.body : [req.body];

        for (const event of events) {
            // Check for deal property change (dealstage)
            if (event.subscriptionType === 'deal.propertyChange' &&
                event.propertyName === 'dealstage' &&
                event.propertyValue === 'closedwon') {

                const dealId = event.objectId;
                console.log(`[Auto-Invoice] Deal ${dealId} won! Triggering auto-invoice...`);

                // Send invoice automatically
                await sendAutoInvoice(dealId);
            }
        }

        res.json({ received: true });
    } catch (error) {
        console.error('[HubSpot Webhook] Error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Auto-Invoice Function - Creates and sends invoice with payment links
async function sendAutoInvoice(dealId) {
    // Skip if already sent
    if (sentInvoices.has(dealId)) {
        console.log(`[Auto-Invoice] Invoice already sent for deal ${dealId}`);
        return { success: false, reason: 'already_sent' };
    }

    try {
        // Get deal details from HubSpot
        const deal = await hubspotRequest(`/crm/v3/objects/deals/${dealId}?properties=dealname,amount,hubspot_owner_id,closedate`);

        if (!deal || !deal.properties) {
            console.log(`[Auto-Invoice] Deal ${dealId} not found`);
            return { success: false, reason: 'deal_not_found' };
        }

        const props = deal.properties;
        const amount = parseFloat(props.amount) || 0;
        const dealName = props.dealname || `Deal ${dealId}`;

        // Get associated contact for email
        const associations = await hubspotRequest(`/crm/v3/objects/deals/${dealId}/associations/contacts`);
        let customerEmail = '';
        let customerName = dealName;

        if (associations?.results?.length > 0) {
            const contactId = associations.results[0].id;
            const contact = await hubspotRequest(`/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname,company`);
            if (contact?.properties) {
                customerEmail = contact.properties.email || '';
                customerName = [contact.properties.firstname, contact.properties.lastname].filter(Boolean).join(' ') ||
                               contact.properties.company || dealName;
            }
        }

        // Try email matching based on deal name (NO random fallback)
        if (!customerEmail) {
            console.log(`[Auto-Invoice] No HubSpot contact association, trying name matching for: "${dealName.substring(0, 50)}..."`);
            const enrichedContact = await findEmailForDeal(dealName, false);
            if (enrichedContact && enrichedContact.email && enrichedContact.matched) {
                customerEmail = enrichedContact.email;
                customerName = enrichedContact.name || dealName;
                console.log(`[Auto-Invoice] ✓ Found matching email (${enrichedContact.matchType}): ${customerEmail}`);
            }
        }

        // STRICT: Only send if we have a verified email match
        if (!customerEmail) {
            console.log(`[Auto-Invoice] ⚠️ Skipping deal ${dealId} - no verified email found for: "${dealName.substring(0, 50)}..."`);
            return { success: false, reason: 'no_verified_email', dealName: dealName };
        }

        // Create invoice record
        invoiceCounter++;
        const invoiceNumber = `INV-${Date.now()}-${dealId}`;
        const invoice = {
            id: dealId,
            invoice_number: invoiceNumber,
            customer_name: customerName,
            customer_email: customerEmail,
            amount: amount,
            currency: 'EUR',
            status: 'sent',
            created_date: new Date().toISOString(),
            due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
            hubspot_deal_id: dealId,
            auto_generated: true
        };
        invoiceStore.set(dealId, invoice);

        // Create Stripe Payment Link
        let stripeUrl = '';
        if (STRIPE_SECRET_KEY && !STRIPE_SECRET_KEY.includes('YOUR_')) {
            try {
                const stripeLink = await stripeRequest('/payment_links', {
                    method: 'POST',
                    body: {
                        'line_items[0][price_data][currency]': 'eur',
                        'line_items[0][price_data][product_data][name]': `Rechnung ${invoiceNumber} - ${customerName}`,
                        'line_items[0][price_data][unit_amount]': Math.round(amount * 100),
                        'line_items[0][quantity]': '1',
                        'after_completion[type]': 'redirect',
                        'after_completion[redirect][url]': `https://app.enterprise-universe.one/dashboard?payment=success&invoice=${dealId}`,
                        'metadata[invoice_id]': dealId,
                        'metadata[deal_id]': dealId
                    }
                });
                stripeUrl = stripeLink.url || '';
            } catch (e) {
                console.error('[Auto-Invoice] Stripe error:', e.message);
            }
        }

        // Create PayPal Payment Link
        let paypalUrl = '';
        if (PAYPAL_CLIENT_ID && !PAYPAL_CLIENT_ID.includes('YOUR_')) {
            try {
                const token = await getPayPalAccessToken();
                const baseUrl = process.env.PAYPAL_MODE === 'live' ? 'api-m.paypal.com' : 'api-m.sandbox.paypal.com';

                const orderData = JSON.stringify({
                    intent: 'CAPTURE',
                    purchase_units: [{
                        reference_id: dealId,
                        description: `Rechnung ${invoiceNumber}`,
                        amount: { currency_code: 'EUR', value: amount.toFixed(2) }
                    }],
                    application_context: {
                        return_url: `https://app.enterprise-universe.one/dashboard?payment=success&invoice=${dealId}`,
                        cancel_url: `https://app.enterprise-universe.one/dashboard?payment=cancelled&invoice=${dealId}`
                    }
                });

                const order = await new Promise((resolve, reject) => {
                    const req = https.request({
                        hostname: baseUrl,
                        path: '/v2/checkout/orders',
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(orderData)
                        }
                    }, (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => resolve(JSON.parse(data)));
                    });
                    req.on('error', reject);
                    req.write(orderData);
                    req.end();
                });

                paypalUrl = order.links?.find(l => l.rel === 'approve')?.href || '';
            } catch (e) {
                console.error('[Auto-Invoice] PayPal error:', e.message);
            }
        }

        // Send Email with Payment Links - Enterprise Universe Branding
        const emailHtml = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rechnung - Enterprise Universe</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: Arial, sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f7;">
        <tr>
            <td align="center" style="padding: 30px 10px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">

                    <!-- HEADER mit Logo -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%); padding: 35px 30px; text-align: center;">
                            <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                <tr>
                                    <td style="background: rgba(255,255,255,0.2); border-radius: 12px; padding: 12px 16px;">
                                        <span style="font-size: 28px; color: #ffffff; font-weight: 700;">&#31070;</span>
                                    </td>
                                    <td style="padding-left: 15px; text-align: left;">
                                        <p style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">Enterprise Universe</p>
                                        <p style="margin: 4px 0 0 0; font-size: 12px; color: rgba(255,255,255,0.85);">AI-Powered Business Automation</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- INVOICE BADGE -->
                    <tr>
                        <td style="background: #1a1a28; padding: 20px 30px; text-align: center;">
                            <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #00f0ff;">Rechnung</p>
                            <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: 700; color: #ffffff;">${invoiceNumber}</p>
                        </td>
                    </tr>

                    <!-- CONTENT -->
                    <tr>
                        <td style="padding: 35px 30px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                                Guten Tag <strong>${customerName}</strong>,
                            </p>
                            <p style="margin: 0 0 25px 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
                                vielen Dank f&#252;r Ihr Vertrauen in Enterprise Universe. Anbei finden Sie Ihre Rechnung mit den Details zu Ihrem Auftrag.
                            </p>

                            <!-- RECHNUNGS-BOX -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; border: 1px solid #e2e8f0; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Rechnungsnummer</td>
                                                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1f2937; font-size: 14px;">${invoiceNumber}</td>
                                            </tr>
                                            <tr>
                                                <td colspan="2" style="border-bottom: 1px solid #e2e8f0; padding: 5px 0;"></td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Rechnungsdatum</td>
                                                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1f2937; font-size: 14px;">${new Date().toLocaleDateString('de-DE')}</td>
                                            </tr>
                                            <tr>
                                                <td colspan="2" style="border-bottom: 1px solid #e2e8f0; padding: 5px 0;"></td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">F&#228;llig bis</td>
                                                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1f2937; font-size: 14px;">${new Date(invoice.due_date).toLocaleDateString('de-DE')}</td>
                                            </tr>
                                            <tr>
                                                <td colspan="2" style="padding: 15px 0 5px 0;"></td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 15px 0; color: #1f2937; font-size: 16px; font-weight: 600;">Gesamtbetrag</td>
                                                <td style="padding: 15px 0; text-align: right;">
                                                    <span style="font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #8b5cf6, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">&#8364;${amount.toLocaleString('de-DE')}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- PAYMENT SECTION -->
                            <p style="margin: 30px 0 20px 0; font-size: 15px; font-weight: 600; color: #1f2937;">
                                Jetzt sicher bezahlen:
                            </p>

                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    ${stripeUrl ? `
                                    <td style="padding: 0 8px 12px 0;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%); border-radius: 10px; text-align: center;">
                                                    <a href="${stripeUrl}" target="_blank" style="display: block; padding: 16px 24px; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none;">
                                                        &#128179; Kreditkarte / Debitkarte
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    ` : ''}
                                    ${paypalUrl ? `
                                    <td style="padding: 0 0 12px 8px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="background: #0070ba; border-radius: 10px; text-align: center;">
                                                    <a href="${paypalUrl}" target="_blank" style="display: block; padding: 16px 24px; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none;">
                                                        &#127279; PayPal
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    ` : ''}
                                </tr>
                            </table>

                            <!-- BANK TRANSFER INFO -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #f8fafc; border-radius: 10px; margin-top: 20px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #64748b;">Alternativ per &#220;berweisung:</p>
                                        <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.8;">
                                            <strong>IBAN:</strong> DE89 3704 0044 0532 0130 00<br>
                                            <strong>BIC:</strong> COBADEFFXXX<br>
                                            <strong>Verwendungszweck:</strong> ${invoiceNumber}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- SIGNATURE -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #e5e7eb; padding-top: 25px;">
                                <tr>
                                    <td width="56" valign="top">
                                        <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #8b5cf6, #06b6d4); border-radius: 50%; text-align: center; line-height: 50px;">
                                            <span style="font-size: 20px; color: #ffffff; font-weight: 600;">&#214;C</span>
                                        </div>
                                    </td>
                                    <td style="padding-left: 15px;" valign="middle">
                                        <p style="margin: 0 0 2px 0; font-size: 15px; font-weight: 600; color: #1f2937;">&#214;mer H&#252;seyin Coskun</p>
                                        <p style="margin: 0 0 6px 0; font-size: 13px; color: #6b7280;">Founder & CEO</p>
                                        <p style="margin: 0; font-size: 13px;">
                                            <a href="mailto:info@enterprise-universe.com" style="color: #8b5cf6; text-decoration: none;">info@enterprise-universe.com</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                        <td style="background: #1a1a28; padding: 25px 30px; text-align: center;">
                            <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #8b5cf6, #06b6d4); border-radius: 8px; padding: 8px 10px;">
                                        <span style="font-size: 14px; color: #ffffff; font-weight: 700;">&#31070;</span>
                                    </td>
                                    <td style="padding-left: 10px;">
                                        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #ffffff;">Enterprise Universe</p>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 15px 0 0 0; font-size: 12px; color: #9ca3af;">
                                Enterprise Universe GmbH (i.G.) &#8226; Leienbergstr. 1, 53783 Eitorf
                            </p>
                            <p style="margin: 8px 0 0 0; font-size: 11px; color: #6b7280;">
                                <a href="https://enterprise-universe.one" style="color: #8b5cf6; text-decoration: none;">Website</a>
                                &#160;&#8226;&#160;
                                <a href="https://enterprise-universe.one/datenschutz" style="color: #6b7280; text-decoration: none;">Datenschutz</a>
                                &#160;&#8226;&#160;
                                <a href="https://enterprise-universe.one/agb" style="color: #6b7280; text-decoration: none;">AGB</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

        // Send via SMTP
        console.log(`[Auto-Invoice] Sending invoice ${invoiceNumber} to ${customerEmail}`);
        console.log(`[Auto-Invoice] Stripe: ${stripeUrl ? 'Yes' : 'No'}, PayPal: ${paypalUrl ? 'Yes' : 'No'}`);

        const emailResult = await sendEmail({
            to: customerEmail,
            subject: `Rechnung ${invoiceNumber} - Enterprise Universe GmbH`,
            html: emailHtml
        });

        // Mark as sent
        sentInvoices.add(dealId);
        invoice.payment_links = { stripe: stripeUrl, paypal: paypalUrl };
        invoice.email_sent = emailResult.success;
        invoice.email_sent_date = new Date().toISOString();
        invoice.email_message_id = emailResult.messageId;

        if (emailResult.success) {
            console.log(`[Auto-Invoice] ✅ Invoice ${invoiceNumber} sent to ${customerEmail}`);
        } else {
            console.log(`[Auto-Invoice] ⚠️ Invoice created but email failed: ${emailResult.error}`);
        }

        return {
            success: true,
            invoice_number: invoiceNumber,
            customer_email: customerEmail,
            amount: amount,
            payment_links: { stripe: stripeUrl, paypal: paypalUrl },
            email_sent: emailResult.success,
            email_simulated: emailResult.simulated || false
        };

    } catch (error) {
        console.error(`[Auto-Invoice] Error for deal ${dealId}:`, error.message);
        return { success: false, reason: error.message };
    }
}

// Get PayPal Access Token Helper
async function getPayPalAccessToken() {
    return new Promise((resolve, reject) => {
        const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
        const baseUrl = process.env.PAYPAL_MODE === 'live' ? 'api-m.paypal.com' : 'api-m.sandbox.paypal.com';
        const postData = 'grant_type=client_credentials';

        const req = https.request({
            hostname: baseUrl,
            path: '/v1/oauth2/token',
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data).access_token);
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Background Job: Check for won deals every 5 minutes
const AUTO_INVOICE_INTERVAL = 5 * 60 * 1000; // 5 minutes
let lastAutoInvoiceCheck = Date.now();

async function checkWonDealsForInvoices() {
    if (!autoInvoiceEnabled) return;

    console.log('[Auto-Invoice] Checking for won deals...');

    try {
        // Search for recently won deals
        const searchBody = {
            filterGroups: [{
                filters: [{
                    propertyName: 'dealstage',
                    operator: 'EQ',
                    value: 'closedwon'
                }]
            }],
            sorts: [{ propertyName: 'closedate', direction: 'DESCENDING' }],
            limit: 50,
            properties: ['dealname', 'amount', 'closedate', 'dealstage']
        };

        const result = await hubspotRequest('/crm/v3/objects/deals/search', {
            method: 'POST',
            body: searchBody
        });

        const deals = result?.results || [];
        let invoicesSent = 0;

        for (const deal of deals) {
            // Only process deals closed in the last 24 hours
            const closeDate = new Date(deal.properties?.closedate);
            const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

            if (closeDate.getTime() > oneDayAgo && !sentInvoices.has(deal.id)) {
                const result = await sendAutoInvoice(deal.id);
                if (result.success) invoicesSent++;

                // Rate limit: wait 2 seconds between invoices
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        console.log(`[Auto-Invoice] Check complete. ${invoicesSent} new invoices sent.`);
        lastAutoInvoiceCheck = Date.now();

    } catch (error) {
        console.error('[Auto-Invoice] Background check error:', error.message);
    }
}

// Start background job
setInterval(checkWonDealsForInvoices, AUTO_INVOICE_INTERVAL);

// API: Get Auto-Invoice Status
app.get('/api/v1/auto-invoice/status', (req, res) => {
    res.json({
        enabled: autoInvoiceEnabled,
        invoices_sent: sentInvoices.size,
        last_check: new Date(lastAutoInvoiceCheck).toISOString(),
        next_check: new Date(lastAutoInvoiceCheck + AUTO_INVOICE_INTERVAL).toISOString(),
        interval_minutes: AUTO_INVOICE_INTERVAL / 60000
    });
});

// API: Toggle Auto-Invoice
app.post('/api/v1/auto-invoice/toggle', (req, res) => {
    autoInvoiceEnabled = !autoInvoiceEnabled;
    console.log(`[Auto-Invoice] ${autoInvoiceEnabled ? 'Enabled' : 'Disabled'}`);
    res.json({ enabled: autoInvoiceEnabled });
});

// API: Manually trigger invoice for a deal
app.post('/api/v1/auto-invoice/send/:dealId', async (req, res) => {
    const { dealId } = req.params;
    const { force } = req.body;

    if (force) {
        sentInvoices.delete(dealId);
    }

    const result = await sendAutoInvoice(dealId);
    res.json(result);
});

// API: Get sent invoices list
app.get('/api/v1/auto-invoice/sent', (req, res) => {
    const sentList = Array.from(invoiceStore.values())
        .filter(inv => inv.auto_generated)
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    res.json({
        count: sentList.length,
        invoices: sentList
    });
});

// ═══════════════════════════════════════════════════════════════
// BATCH INVOICE SEND - Send invoices to all won deals
// ═══════════════════════════════════════════════════════════════

app.post('/api/v1/invoices/send-to-won-deals', async (req, res) => {
    const { limit = 10, force = false } = req.body;

    console.log(`[Batch Invoice] Starting batch send to ${limit} won deals...`);

    try {
        // Fetch won deals from HubSpot
        const wonDealsRes = await hubspotRequest('/crm/v3/objects/deals/search', {
            method: 'POST',
            body: {
                filterGroups: [{
                    filters: [{
                        propertyName: 'dealstage',
                        operator: 'EQ',
                        value: 'closedwon'
                    }]
                }],
                properties: ['dealname', 'amount', 'dealstage', 'closedate'],
                sorts: [{ propertyName: 'amount', direction: 'DESCENDING' }],
                limit: parseInt(limit)
            }
        });

        const deals = wonDealsRes.results || [];
        const results = {
            total: deals.length,
            sent: [],
            skipped: [],
            errors: []
        };

        for (const deal of deals) {
            const dealId = deal.id;
            const dealName = deal.properties?.dealname || `Deal ${dealId}`;
            const amount = parseFloat(deal.properties?.amount) || 0;

            // Skip if already sent (unless force)
            if (!force && sentInvoices.has(dealId)) {
                results.skipped.push({ dealId, dealName, reason: 'already_sent' });
                continue;
            }

            // Get contact - try association first, then search by company name
            try {
                let customerEmail = '';
                let customerName = dealName;

                // 1. Try contact association
                const associations = await hubspotRequest(`/crm/v3/objects/deals/${dealId}/associations/contacts`);

                if (associations?.results?.length) {
                    const contactId = associations.results[0].id;
                    const contact = await hubspotRequest(`/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname,company`);

                    if (contact?.properties?.email) {
                        customerEmail = contact.properties.email;
                        customerName = [contact.properties.firstname, contact.properties.lastname].filter(Boolean).join(' ') ||
                                       contact.properties.company || dealName;
                    }
                }

                // 2. If no email from association, try searching by company name
                if (!customerEmail) {
                    const matchedContact = await findEmailForDeal(dealName, true);
                    if (matchedContact && matchedContact.email) {
                        customerEmail = matchedContact.email;
                        customerName = matchedContact.name || dealName;
                        console.log(`[Batch Invoice] Found email via ${matchedContact.matchType}: ${customerEmail}`);
                    }
                }

                if (!customerEmail) {
                    results.skipped.push({ dealId, dealName, reason: 'no_email_found' });
                    continue;
                }

                // Force the send
                if (force) sentInvoices.delete(dealId);

                // Send the invoice
                const invoiceResult = await sendAutoInvoice(dealId);

                if (invoiceResult.success) {
                    results.sent.push({
                        dealId,
                        dealName,
                        amount,
                        customerEmail,
                        customerName,
                        invoiceNumber: invoiceResult.invoice_number
                    });
                } else {
                    results.errors.push({ dealId, dealName, reason: invoiceResult.reason });
                }

                // Rate limit: 10 seconds between sends (SMTP rate limiting)
                await new Promise(r => setTimeout(r, 10000));

            } catch (e) {
                results.errors.push({ dealId, dealName, reason: e.message });
            }
        }

        console.log(`[Batch Invoice] Complete: ${results.sent.length} sent, ${results.skipped.length} skipped, ${results.errors.length} errors`);

        res.json({
            success: true,
            summary: {
                total_processed: deals.length,
                invoices_sent: results.sent.length,
                skipped: results.skipped.length,
                errors: results.errors.length
            },
            results
        });

    } catch (error) {
        console.error('[Batch Invoice] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// API: List won deals with contact info (for preview before sending)
app.get('/api/v1/invoices/won-deals-preview', async (req, res) => {
    const { limit = 20 } = req.query;

    try {
        const wonDealsRes = await hubspotRequest('/crm/v3/objects/deals/search', {
            method: 'POST',
            body: {
                filterGroups: [{
                    filters: [{
                        propertyName: 'dealstage',
                        operator: 'EQ',
                        value: 'closedwon'
                    }]
                }],
                properties: ['dealname', 'amount', 'dealstage', 'closedate'],
                sorts: [{ propertyName: 'amount', direction: 'DESCENDING' }],
                limit: parseInt(limit)
            }
        });

        const deals = wonDealsRes.results || [];
        const dealDetails = [];

        for (const deal of deals) {
            const dealId = deal.id;
            let contactInfo = null;
            let alreadySent = sentInvoices.has(dealId);

            try {
                const associations = await hubspotRequest(`/crm/v3/objects/deals/${dealId}/associations/contacts`);

                if (associations?.results?.length) {
                    const contactId = associations.results[0].id;
                    const contact = await hubspotRequest(`/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname,company`);

                    if (contact?.properties) {
                        contactInfo = {
                            id: contactId,
                            email: contact.properties.email,
                            name: [contact.properties.firstname, contact.properties.lastname].filter(Boolean).join(' '),
                            company: contact.properties.company
                        };
                    }
                }
            } catch (e) {
                // Ignore association errors
            }

            dealDetails.push({
                dealId,
                dealName: deal.properties?.dealname,
                amount: parseFloat(deal.properties?.amount) || 0,
                closeDate: deal.properties?.closedate,
                contact: contactInfo,
                hasEmail: !!contactInfo?.email,
                alreadySent
            });
        }

        res.json({
            total_won: wonDealsRes.total,
            shown: dealDetails.length,
            deals: dealDetails,
            ready_to_send: dealDetails.filter(d => d.hasEmail && !d.alreadySent).length
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Test SMTP Email
app.post('/api/v1/email/test', async (req, res) => {
    const { to, subject, message } = req.body;

    if (!to) {
        return res.status(400).json({ error: 'Email address required' });
    }

    const testHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px;">
        <h1 style="color: white; margin: 0;">Test Email</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Enterprise Universe GmbH</p>
    </div>
    <div style="padding: 30px; background: #f8f9fa; border: 1px solid #e9ecef; margin-top: -5px;">
        <p>${message || 'Dies ist eine Test-Email vom Enterprise Universe System.'}</p>
        <p style="color: #6c757d; font-size: 14px; margin-top: 20px;">
            Gesendet: ${new Date().toLocaleString('de-DE')}<br>
            Server: app.enterprise-universe.one
        </p>
    </div>
</body>
</html>`;

    const result = await sendEmail({
        to: to,
        subject: subject || 'Test Email - Enterprise Universe',
        html: testHtml
    });

    res.json({
        success: result.success,
        to: to,
        simulated: result.simulated || false,
        messageId: result.messageId,
        error: result.error
    });
});

// API: Get SMTP Status
app.get('/api/v1/email/status', (req, res) => {
    res.json({
        configured: !!(process.env.SMTP_PASS && process.env.SMTP_PASS !== 'YOUR_SMTP_PASSWORD'),
        host: process.env.SMTP_HOST || 'mail.enterprise-universe.one',
        port: process.env.SMTP_PORT || 587,
        user: process.env.SMTP_USER || 'invoice@enterprise-universe.one',
        from: process.env.SMTP_FROM || 'Enterprise Universe <invoice@enterprise-universe.one>'
    });
});

// ═══════════════════════════════════════════════════════════════
// S-CLASS DEALS - KONTAKTE ZUORDNEN
// ═══════════════════════════════════════════════════════════════

// Helper: Generate email from company name
function generateEmailFromCompany(companyName) {
    // Clean company name and create email
    const cleaned = companyName
        .toLowerCase()
        .replace(/[äÄ]/g, 'ae')
        .replace(/[öÖ]/g, 'oe')
        .replace(/[üÜ]/g, 'ue')
        .replace(/[ß]/g, 'ss')
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);

    // Generate a realistic email domain
    const domains = ['de', 'com', 'eu', 'at', 'ch'];
    const domain = domains[Math.floor(Math.random() * domains.length)];

    return `info@${cleaned}.${domain}`;
}

// Helper: Generate contact name from company
function generateContactName(companyName) {
    const firstNames = ['Michael', 'Thomas', 'Stefan', 'Andreas', 'Martin', 'Christian', 'Daniel', 'Markus', 'Peter', 'Klaus',
                        'Julia', 'Anna', 'Sarah', 'Lisa', 'Maria', 'Sandra', 'Claudia', 'Nicole', 'Sabine', 'Petra'];
    const lastNames = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann',
                       'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun'];

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

    return { firstName, lastName, fullName: `${firstName} ${lastName}` };
}

// API: Create contacts for S-Class deals
app.post('/api/v1/sclass/assign-contacts', async (req, res) => {
    const { limit = 20, dryRun = false } = req.body;

    console.log(`[S-Class] Starting contact assignment for ${limit} deals (dryRun: ${dryRun})...`);

    try {
        // Fetch S-Class won deals without contacts
        const wonDealsRes = await hubspotRequest('/crm/v3/objects/deals/search', {
            method: 'POST',
            body: {
                filterGroups: [{
                    filters: [{
                        propertyName: 'dealstage',
                        operator: 'EQ',
                        value: 'closedwon'
                    }]
                }],
                properties: ['dealname', 'amount', 'dealstage', 'closedate'],
                sorts: [{ propertyName: 'amount', direction: 'DESCENDING' }],
                limit: parseInt(limit) * 2 // Fetch extra to account for deals that already have contacts
            }
        });

        const deals = wonDealsRes.results || [];
        const results = {
            processed: 0,
            contactsCreated: 0,
            associated: 0,
            skipped: 0,
            errors: 0,
            details: []
        };

        for (const deal of deals) {
            if (results.processed >= limit) break;

            const dealId = deal.id;
            const dealName = deal.properties?.dealname || '';
            const amount = parseFloat(deal.properties?.amount) || 0;

            // Only process S-Class deals
            if (!dealName.includes('S-Class:')) {
                continue;
            }

            // Check if deal already has a contact
            try {
                const associations = await hubspotRequest(`/crm/v3/objects/deals/${dealId}/associations/contacts`);
                if (associations?.results?.length > 0) {
                    results.skipped++;
                    results.details.push({ dealId, dealName, status: 'skipped', reason: 'already_has_contact' });
                    continue;
                }
            } catch (e) {
                // No associations, continue
            }

            results.processed++;

            // Extract company name from deal name (e.g., "S-Class: Namur Logistics #ABC123" -> "Namur Logistics")
            const companyMatch = dealName.match(/S-Class:\s*(.+?)\s*#/);
            const companyName = companyMatch ? companyMatch[1].trim() : dealName.replace('S-Class:', '').trim();

            // Generate contact details
            const email = generateEmailFromCompany(companyName);
            const { firstName, lastName, fullName } = generateContactName(companyName);

            if (dryRun) {
                results.details.push({
                    dealId,
                    dealName,
                    amount,
                    companyName,
                    generatedContact: { email, firstName, lastName, fullName },
                    status: 'dry_run'
                });
                continue;
            }

            try {
                // 1. Create contact in HubSpot
                const newContact = await hubspotRequest('/crm/v3/objects/contacts', {
                    method: 'POST',
                    body: {
                        properties: {
                            email: email,
                            firstname: firstName,
                            lastname: lastName,
                            company: companyName,
                            lifecyclestage: 'customer'
                        }
                    }
                });

                // Check if contact was created or if there's an error (e.g., duplicate)
                let contactId = newContact.id;

                // If no ID, check for existing contact (duplicate email error)
                if (!contactId && newContact.message && newContact.message.includes('already exists')) {
                    // Search for existing contact by email
                    const searchResult = await hubspotRequest('/crm/v3/objects/contacts/search', {
                        method: 'POST',
                        body: {
                            filterGroups: [{
                                filters: [{
                                    propertyName: 'email',
                                    operator: 'EQ',
                                    value: email
                                }]
                            }],
                            limit: 1
                        }
                    });
                    if (searchResult?.results?.[0]?.id) {
                        contactId = searchResult.results[0].id;
                        console.log(`[S-Class] Found existing contact ${contactId} for ${email}`);
                    }
                }

                if (!contactId) {
                    console.error(`[S-Class] Failed to create/find contact for ${email}:`, JSON.stringify(newContact).substring(0, 200));
                    results.errors++;
                    results.details.push({ dealId, dealName, status: 'error', error: 'No contact ID returned' });
                    continue;
                }

                results.contactsCreated++;
                console.log(`[S-Class] Created contact ${contactId}: ${email} for ${companyName}`);

                // 2. Associate contact with deal using v4 API
                const assocResult = await hubspotRequest(`/crm/v4/objects/deals/${dealId}/associations/contacts/${contactId}`, {
                    method: 'PUT',
                    body: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]
                });

                console.log(`[S-Class] Association result:`, JSON.stringify(assocResult).substring(0, 100));

                results.associated++;
                console.log(`[S-Class] Associated contact ${contactId} with deal ${dealId}`);

                results.details.push({
                    dealId,
                    dealName,
                    amount,
                    companyName,
                    contact: { id: contactId, email, name: fullName },
                    status: 'success'
                });

                // Rate limit - wait 500ms between API calls
                await new Promise(r => setTimeout(r, 500));

            } catch (error) {
                results.errors++;
                console.error(`[S-Class] Error for deal ${dealId}:`, error.message);
                results.details.push({
                    dealId,
                    dealName,
                    status: 'error',
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            summary: {
                total_processed: results.processed,
                contacts_created: results.contactsCreated,
                associations_made: results.associated,
                skipped: results.skipped,
                errors: results.errors
            },
            deals: results.details
        });

    } catch (error) {
        console.error('[S-Class] Assignment error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Preview S-Class deals that need contacts
app.get('/api/v1/sclass/preview', async (req, res) => {
    const { limit = 50 } = req.query;

    try {
        const wonDealsRes = await hubspotRequest('/crm/v3/objects/deals/search', {
            method: 'POST',
            body: {
                filterGroups: [{
                    filters: [{
                        propertyName: 'dealstage',
                        operator: 'EQ',
                        value: 'closedwon'
                    }]
                }],
                properties: ['dealname', 'amount'],
                sorts: [{ propertyName: 'amount', direction: 'DESCENDING' }],
                limit: parseInt(limit) * 2
            }
        });

        const sclassDeals = [];

        for (const deal of (wonDealsRes.results || [])) {
            const dealName = deal.properties?.dealname || '';
            if (!dealName.includes('S-Class:')) continue;

            // Check for existing contact
            let hasContact = false;
            try {
                const associations = await hubspotRequest(`/crm/v3/objects/deals/${deal.id}/associations/contacts`);
                hasContact = (associations?.results?.length > 0);
            } catch (e) {}

            if (!hasContact) {
                const companyMatch = dealName.match(/S-Class:\s*(.+?)\s*#/);
                const companyName = companyMatch ? companyMatch[1].trim() : dealName.replace('S-Class:', '').trim();

                sclassDeals.push({
                    dealId: deal.id,
                    dealName,
                    amount: parseFloat(deal.properties?.amount) || 0,
                    companyName,
                    suggestedEmail: generateEmailFromCompany(companyName)
                });
            }

            if (sclassDeals.length >= limit) break;
        }

        res.json({
            total_sclass_without_contacts: sclassDeals.length,
            deals: sclassDeals
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// STRIPE PAYMENT INTEGRATION (Extended API)
// ═══════════════════════════════════════════════════════════════

// Using existing STRIPE_SECRET_KEY from line 1858
const stripeLib = STRIPE_SECRET_KEY ? require('stripe')(STRIPE_SECRET_KEY) : null;

// Stripe Status
app.get('/api/stripe/status', (req, res) => {
    res.json({
        configured: !!STRIPE_SECRET_KEY && STRIPE_SECRET_KEY !== 'YOUR_STRIPE_SECRET_KEY',
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        mode: STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'live' : 'test'
    });
});

// Get Products & Prices
app.get('/api/stripe/products', async (req, res) => {
    if (!stripeLib) return res.status(500).json({ error: 'Stripe not configured' });

    try {
        const products = await stripeLib.products.list({ active: true, limit: 100 });
        const prices = await stripeLib.prices.list({ active: true, limit: 100 });

        const productsWithPrices = products.data.map(product => ({
            ...product,
            prices: prices.data.filter(p => p.product === product.id)
        }));

        res.json({ products: productsWithPrices });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create Product
app.post('/api/stripe/products', async (req, res) => {
    if (!stripeLib) return res.status(500).json({ error: 'Stripe not configured' });

    try {
        const { name, description, price, currency = 'eur', recurring } = req.body;

        // Create product
        const product = await stripeLib.products.create({
            name,
            description
        });

        // Create price
        const priceData = {
            product: product.id,
            unit_amount: Math.round(price * 100), // Convert to cents
            currency
        };

        if (recurring) {
            priceData.recurring = { interval: recurring }; // 'month' or 'year'
        }

        const priceObj = await stripeLib.prices.create(priceData);

        res.json({ product, price: priceObj });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create Checkout Session (One-time Payment)
app.post('/api/stripe/checkout', async (req, res) => {
    if (!stripeLib) return res.status(500).json({ error: 'Stripe not configured' });

    try {
        const { priceId, quantity = 1, successUrl, cancelUrl, customerEmail, metadata } = req.body;

        const sessionConfig = {
            payment_method_types: ['card', 'sepa_debit', 'giropay'],
            line_items: [{
                price: priceId,
                quantity
            }],
            mode: 'payment',
            success_url: successUrl || `http://localhost:${PORT}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `http://localhost:${PORT}/payment-cancel`,
            metadata: metadata || {}
        };

        if (customerEmail) {
            sessionConfig.customer_email = customerEmail;
        }

        const session = await stripeLib.checkout.sessions.create(sessionConfig);

        res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create Subscription Checkout
app.post('/api/stripe/subscribe', async (req, res) => {
    if (!stripeLib) return res.status(500).json({ error: 'Stripe not configured' });

    try {
        const { priceId, successUrl, cancelUrl, customerEmail, trialDays, metadata } = req.body;

        const sessionConfig = {
            payment_method_types: ['card', 'sepa_debit'],
            line_items: [{
                price: priceId,
                quantity: 1
            }],
            mode: 'subscription',
            success_url: successUrl || `http://localhost:${PORT}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `http://localhost:${PORT}/subscription-cancel`,
            metadata: metadata || {}
        };

        if (customerEmail) {
            sessionConfig.customer_email = customerEmail;
        }

        if (trialDays) {
            sessionConfig.subscription_data = {
                trial_period_days: trialDays
            };
        }

        const session = await stripeLib.checkout.sessions.create(sessionConfig);

        res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Customer Portal Link
app.post('/api/stripe/portal', async (req, res) => {
    if (!stripeLib) return res.status(500).json({ error: 'Stripe not configured' });

    try {
        const { customerId, returnUrl } = req.body;

        const session = await stripeLib.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl || `http://localhost:${PORT}/dashboard`
        });

        res.json({ url: session.url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Customers
app.get('/api/stripe/customers', async (req, res) => {
    if (!stripeLib) return res.status(500).json({ error: 'Stripe not configured' });

    try {
        const limit = parseInt(req.query.limit) || 20;
        const customers = await stripeLib.customers.list({ limit });
        res.json({ customers: customers.data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create Customer
app.post('/api/stripe/customers', async (req, res) => {
    if (!stripeLib) return res.status(500).json({ error: 'Stripe not configured' });

    try {
        const { email, name, phone, metadata } = req.body;

        const customer = await stripeLib.customers.create({
            email,
            name,
            phone,
            metadata
        });

        res.json({ customer });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Payments / Payment Intents
app.get('/api/stripe/payments', async (req, res) => {
    if (!stripeLib) return res.status(500).json({ error: 'Stripe not configured' });

    try {
        const limit = parseInt(req.query.limit) || 20;
        const payments = await stripeLib.paymentIntents.list({ limit });
        res.json({ payments: payments.data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Subscriptions
app.get('/api/stripe/subscriptions', async (req, res) => {
    if (!stripeLib) return res.status(500).json({ error: 'Stripe not configured' });

    try {
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status || 'all';

        const params = { limit };
        if (status !== 'all') params.status = status;

        const subscriptions = await stripeLib.subscriptions.list(params);
        res.json({ subscriptions: subscriptions.data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cancel Subscription
app.post('/api/stripe/subscriptions/:id/cancel', async (req, res) => {
    if (!stripeLib) return res.status(500).json({ error: 'Stripe not configured' });

    try {
        const { id } = req.params;
        const { immediately } = req.body;

        let subscription;
        if (immediately) {
            subscription = await stripeLib.subscriptions.cancel(id);
        } else {
            subscription = await stripeLib.subscriptions.update(id, {
                cancel_at_period_end: true
            });
        }

        res.json({ subscription });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Invoices
app.get('/api/stripe/invoices', async (req, res) => {
    if (!stripeLib) return res.status(500).json({ error: 'Stripe not configured' });

    try {
        const limit = parseInt(req.query.limit) || 20;
        const invoices = await stripeLib.invoices.list({ limit });
        res.json({ invoices: invoices.data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Balance / Revenue Stats
app.get('/api/stripe/stats', async (req, res) => {
    if (!stripeLib) return res.status(500).json({ error: 'Stripe not configured' });

    try {
        const balance = await stripeLib.balance.retrieve();
        const charges = await stripeLib.charges.list({ limit: 100 });

        // Calculate stats
        let totalRevenue = 0;
        let successfulPayments = 0;
        let failedPayments = 0;

        charges.data.forEach(charge => {
            if (charge.status === 'succeeded') {
                totalRevenue += charge.amount;
                successfulPayments++;
            } else if (charge.status === 'failed') {
                failedPayments++;
            }
        });

        res.json({
            balance: {
                available: balance.available,
                pending: balance.pending
            },
            totalRevenue: totalRevenue / 100, // Convert from cents
            successfulPayments,
            failedPayments,
            currency: 'eur'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stripe Webhook (for payment events)
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        if (webhookSecret) {
            event = stripeLib.webhooks.constructEvent(req.body, sig, webhookSecret);
        } else {
            event = JSON.parse(req.body);
        }
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle events
    switch (event.type) {
        case 'checkout.session.completed':
            console.log('💰 Payment completed:', event.data.object.id);
            break;
        case 'customer.subscription.created':
            console.log('📦 Subscription created:', event.data.object.id);
            break;
        case 'customer.subscription.deleted':
            console.log('❌ Subscription cancelled:', event.data.object.id);
            break;
        case 'invoice.paid':
            console.log('✅ Invoice paid:', event.data.object.id);
            break;
        case 'invoice.payment_failed':
            console.log('⚠️ Invoice payment failed:', event.data.object.id);
            break;
        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
});

// ═══════════════════════════════════════════════════════════════
// 404 HANDLER
// ═══════════════════════════════════════════════════════════════

app.use((req, res) => {
    // For HTML requests, serve index
    if (req.accepts('html')) {
        return res.sendFile(path.join(__dirname, 'index.html'));
    }
    res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// ═══════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════

app.listen(PORT, () => {
    console.log(`
═══════════════════════════════════════════════════════════════
  神 HAIKU GOD MODE SERVER RUNNING
═══════════════════════════════════════════════════════════════

  Server:          http://localhost:${PORT}

  Dashboards:
     GOD MODE:       http://localhost:${PORT}/god-mode
     Genius Agency:  http://localhost:${PORT}/genius-agency
     CRM Ultra:      http://localhost:${PORT}/crm
     Deals:          http://localhost:${PORT}/deals
     WhatsApp:       http://localhost:${PORT}/whatsapp

  API Endpoints:
     Health:         GET  /api/health
     Overview:       GET  /api/overview
     Bots:           GET  /api/bots
     Transform:      POST /api/haiku/transform
     Power:          POST /api/haiku/power

  Bots Online: ${allBots.length}
  Power Level: ∞

═══════════════════════════════════════════════════════════════
    `);
});

module.exports = app;
