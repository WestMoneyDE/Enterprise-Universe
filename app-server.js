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

// 404 Handler - serve index for unknown routes
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
