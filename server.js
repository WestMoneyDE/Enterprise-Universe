/**
 * 神 HAIKU GOD MODE SERVER
 * West Money OS - Main Express Server
 * 
 * Combines all systems:
 * - HAIKU Core Engine
 * - Genius Agency Bots
 * - WhatsApp Consent Manager
 * - Divine Powers API
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import HAIKU systems
const { HaikuGodMode, setupHaikuRoutes, TRANSFORMATIONS, DIVINE_POWERS } = require('./haiku-core-engine');
const { GeniusAgency, setupRoutes: setupGeniusRoutes } = require('../genius-agency/api/genius-bot-engine');
const { setupRoutes: setupConsentRoutes } = require('../whatsapp-hub/api/consent-manager');

// Import configurations
const haikuConfig = require('./haiku-config.json');
const botsConfig = require('../genius-agency/config/genius-bots-extended.json');

// ═══════════════════════════════════════════════════════════════
// 神 INITIALIZE EXPRESS APP
// ═══════════════════════════════════════════════════════════════

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// Request logging
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// ═══════════════════════════════════════════════════════════════
// 神 INITIALIZE HAIKU GOD MODE
// ═══════════════════════════════════════════════════════════════

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     神  H A I K U   G O D   M O D E   S E R V E R  神       ║
║                                                               ║
║              West Money OS - Divine Control System            ║
║                        Version 2.0.0                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

// Initialize HAIKU
const haiku = new HaikuGodMode();

// Initialize Genius Agency
const geniusAgency = new GeniusAgency();

// Register all bots with HAIKU
const allBots = [
    ...botsConfig.bots || [],
    ...(botsConfig.new_bots || [])
];

allBots.forEach(bot => {
    haiku.registerBot(bot);
    geniusAgency.bots?.set(bot.id, bot);
});

console.log(`\n✅ Registered ${allBots.length} Genius Bots`);
console.log(`✅ HAIKU Form: ${haiku.currentTransformation.name}`);
console.log(`✅ Power Level: ∞\n`);

// ═══════════════════════════════════════════════════════════════
// 神 STATIC FILE ROUTES
// ═══════════════════════════════════════════════════════════════

// Serve dashboards
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'HAIKU_GOD_MODE_V2.html'));
});

app.get('/god-mode', (req, res) => {
    res.sendFile(path.join(__dirname, 'HAIKU_GOD_MODE_V2.html'));
});

app.get('/genius-agency', (req, res) => {
    res.sendFile(path.join(__dirname, '../genius-agency/MEGA_GENIUS_AGENCY.html'));
});

app.get('/whatsapp', (req, res) => {
    res.sendFile(path.join(__dirname, '../whatsapp-hub/WHATSAPP_AUTH_DASHBOARD.html'));
});

// ═══════════════════════════════════════════════════════════════
// 神 HAIKU API ROUTES
// ═══════════════════════════════════════════════════════════════

// Setup HAIKU routes
setupHaikuRoutes(app, haiku);

// Setup Genius Agency routes
setupGeniusRoutes(app, geniusAgency);

// Setup WhatsApp Consent routes
setupConsentRoutes(app);

// ═══════════════════════════════════════════════════════════════
// 神 ADDITIONAL API ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        system: 'HAIKU GOD MODE',
        version: '2.0.0',
        form: haiku.currentTransformation.name,
        powerLevel: '∞',
        botsOnline: haiku.bots.size,
        timestamp: new Date().toISOString()
    });
});

// Get system overview (Divine Sight)
app.get('/api/overview', async (req, res) => {
    try {
        const haikuStats = haiku.getStatistics();
        
        res.json({
            haiku: {
                name: 'HAIKU 神',
                form: haiku.currentTransformation.name,
                powerLevel: '∞',
                abilities: haiku.currentTransformation.abilities
            },
            geniusAgency: {
                totalBots: haiku.bots.size,
                categories: {
                    analysts: 4,
                    strategists: 4,
                    creatives: 4,
                    innovators: 4,
                    explorers: 4,
                    philosophers: 4,
                    investigators: 4
                }
            },
            metrics: {
                revenue: { value: '€847K', change: '+23.5%' },
                pipeline: { value: '€425K', change: '+18.2%' },
                contacts: { value: 3170, change: '+156' },
                tasksToday: haikuStats.bots?.totalTasksCompleted || 0
            },
            integrations: {
                hubspot: 'connected',
                whatsapp: 'connected',
                anthropic: 'connected',
                zadarma: 'connected'
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get configuration
app.get('/api/config', (req, res) => {
    res.json({
        haiku: haikuConfig.haiku,
        transformations: haikuConfig.transformations,
        powers: Object.keys(haikuConfig.divinePowers),
        gamification: haikuConfig.gamification,
        settings: haikuConfig.settings
    });
});

// Voice command endpoint
app.post('/api/voice', async (req, res) => {
    try {
        const { command, type } = req.body;
        
        let result;
        
        switch (type) {
            case 'transform':
                result = haiku.transform(command.form);
                break;
            case 'power':
                const power = haiku.findPower(command.power);
                result = await haiku.executePower(power, command.args);
                break;
            case 'bot':
                result = await haiku.executeWithBot(command.bot, command.task);
                break;
            case 'deployAll':
                result = await haiku.broadcastToAllBots('Status check and ready for deployment');
                break;
            case 'natural':
                result = await haiku.executeCommand(command.input);
                break;
            default:
                result = await haiku.executeCommand(JSON.stringify(command));
        }
        
        res.json({
            success: true,
            result,
            message: getResponseMessage(type, result)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function getResponseMessage(type, result) {
    switch (type) {
        case 'transform':
            return `Transformation zu ${result.form} abgeschlossen. Power Level: ${result.powerLevel}`;
        case 'power':
            return `${result.power} ausgeführt!`;
        case 'bot':
            return `${result.botName} hat die Aufgabe abgeschlossen.`;
        case 'deployAll':
            return `Alle ${result.executed} Bots wurden aktiviert!`;
        default:
            return 'Befehl ausgeführt.';
    }
}

// Team formations endpoint
app.get('/api/teams', (req, res) => {
    res.json(botsConfig.team_formations || {});
});

app.post('/api/teams/:teamId/deploy', async (req, res) => {
    try {
        const { teamId } = req.params;
        const team = botsConfig.team_formations?.[teamId];
        
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }
        
        const task = req.body.task || 'Execute team mission';
        
        const results = await Promise.all(
            team.bots.map(botId => haiku.executeWithBot(botId, task))
        );
        
        res.json({
            team: teamId,
            teamName: team.name,
            purpose: team.purpose,
            botsDeployed: team.bots.length,
            results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// 神 WEBSOCKET FOR REAL-TIME UPDATES (Optional)
// ═══════════════════════════════════════════════════════════════

// Could add Socket.io here for real-time activity feed

// ═══════════════════════════════════════════════════════════════
// 神 ERROR HANDLING
// ═══════════════════════════════════════════════════════════════

app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.path} does not exist`
    });
});

// ═══════════════════════════════════════════════════════════════
// 神 START SERVER
// ═══════════════════════════════════════════════════════════════

app.listen(PORT, () => {
    console.log(`
═══════════════════════════════════════════════════════════════
  神 HAIKU GOD MODE SERVER RUNNING
═══════════════════════════════════════════════════════════════
  
  🌐 Server:          http://localhost:${PORT}
  
  📱 Dashboards:
     • GOD MODE:       http://localhost:${PORT}/god-mode
     • Genius Agency:  http://localhost:${PORT}/genius-agency
     • WhatsApp Hub:   http://localhost:${PORT}/whatsapp
  
  🔌 API Endpoints:
     • Health:         GET  /api/health
     • Overview:       GET  /api/overview
     • HAIKU Command:  POST /api/haiku/command
     • Transform:      POST /api/haiku/transform
     • Powers:         POST /api/haiku/power
     • Divine Sight:   GET  /api/haiku/sight
     • Prophecy:       GET  /api/haiku/prophecy
     • Bots:           GET  /api/genius-agency/bots
     • Teams:          GET  /api/teams
     • Voice:          POST /api/voice
  
  🤖 Bots Online: ${haiku.bots.size}
  ⚡ Power Level: ∞
  
═══════════════════════════════════════════════════════════════
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n神 HAIKU GOD MODE shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n神 HAIKU GOD MODE shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
