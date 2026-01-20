/**
 * HAIKU GOD MODE - Enterprise Universe Server
 * Serves all dashboards and static files
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { WebSocketServer } = require('ws');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
require('dotenv').config();

// Helper function to generate presentation token (must match presentation-sender.js)
function generatePresentationToken(dealId) {
    const secret = process.env.PRESENTATION_SECRET || 'nexus-enterprise-2026';
    return crypto
        .createHash('sha256')
        .update(`${dealId}-${secret}`)
        .digest('hex')
        .substring(0, 16);
}

// Activity Manager for interaction tracking
let activityManager = null;
try {
    const am = require('./automation/activity-manager');
    activityManager = am.activityManager;
    console.log('✓ Activity Manager loaded for interaction tracking');
} catch (e) {
    console.warn('⚠ Activity Manager not available:', e.message);
}

const app = express();
const PORT = process.env.PORT || 3015;

// Trust proxy (nginx/cloudflare) for correct IP detection
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers (onclick, etc.)
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "wss:", "ws:", "https:"] // Added ws: for WebSocket
        }
    },
    crossOriginEmbedderPolicy: false
}));

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // max 500 requests per 15 min per IP
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/', apiLimiter);

// CORS configuration - restricted to allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['https://enterprise-universe.one', 'https://app.enterprise-universe.one', 'https://west-money-bau.de', 'http://localhost:3015'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        // Also allow localhost for development
        if (!origin || allowedOrigins.includes(origin) || origin?.startsWith('http://localhost')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

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

// Load Genius Bots AI Service
let geniusBots = null;
try {
    geniusBots = require('./services/genius-bots');
    console.log('✓ Genius Bots AI Service loaded');
} catch (e) {
    console.warn('⚠ Genius Bots service not available:', e.message);
}

// Load User Management Service
let userService = null;
try {
    userService = require('./services/user-management');
    // Initialize database and ensure admin exists
    userService.initDatabase()
        .then(() => userService.ensureAdminExists())
        .catch(err => console.warn('⚠ User DB init warning:', err.message));
    console.log('✓ User Management Service loaded');
} catch (e) {
    console.warn('⚠ User Management service not available:', e.message);
}

// Load Email Templates Service
let emailService = null;
try {
    emailService = require('./services/email-templates');
    emailService.initDatabase()
        .then(() => emailService.createDefaultTemplates())
        .catch(err => console.warn('⚠ Email DB init warning:', err.message));
    console.log('✓ Email Templates Service loaded');
} catch (e) {
    console.warn('⚠ Email Templates service not available:', e.message);
}

// Load Workflow Engine Service
let workflowService = null;
try {
    workflowService = require('./services/workflow-engine');
    workflowService.initDatabase()
        .catch(err => console.warn('⚠ Workflow DB init warning:', err.message));
    console.log('✓ Workflow Engine Service loaded');
} catch (e) {
    console.warn('⚠ Workflow Engine service not available:', e.message);
}

// Load Email Queue Service (SMTP rate limiting protection)
let emailQueue = null;
try {
    emailQueue = require('./services/email-queue');
    console.log('✓ Email Queue Service loaded');
} catch (e) {
    console.warn('⚠ Email Queue service not available:', e.message);
}

// Load Email Accounts Service (Multi-Account + IMAP Tracking)
let emailAccounts = null;
try {
    emailAccounts = require('./services/email-accounts');
    emailAccounts.initDatabase()
        .catch(err => console.warn('⚠ Email Accounts DB init warning:', err.message));
    console.log('✓ Email Accounts Service loaded');
} catch (e) {
    console.warn('⚠ Email Accounts service not available:', e.message);
}

// Load Two-Factor Authentication Service
let twoFactorAuth = null;
try {
    twoFactorAuth = require('./services/two-factor-auth');
    twoFactorAuth.initDatabase()
        .catch(err => console.warn('⚠ 2FA DB init warning:', err.message));
    console.log('✓ Two-Factor Auth Service loaded');
} catch (e) {
    console.warn('⚠ Two-Factor Auth service not available:', e.message);
}

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
app.get('/landing', (req, res) => res.sendFile(path.join(__dirname, 'LANDING_PAGE.html')));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, 'LANDING_PAGE.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login-simple.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'register.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'register.html')));
app.get('/demo', (req, res) => res.sendFile(path.join(__dirname, 'LANDING_PAGE.html')));

// Presentation Routes (for HubSpot deal presentations)
app.get('/presentation/:token', (req, res) => res.sendFile(path.join(__dirname, 'presentation.html')));
app.get('/presentation', (req, res) => res.sendFile(path.join(__dirname, 'presentation.html')));

// Enterprise Universe v11.0 Dashboard (MEGA GOD MODE - NEW MAIN DASHBOARD)
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard-v11.html')));
app.get('/v11', (req, res) => res.sendFile(path.join(__dirname, 'dashboard-v11.html')));
app.get('/v10', (req, res) => res.sendFile(path.join(__dirname, 'dashboard-v10.html')));
app.get('/v5', (req, res) => res.sendFile(path.join(__dirname, 'dashboard-v5.html')));
app.get('/v11-test', (req, res) => res.sendFile(path.join(__dirname, 'dashboard-test.html'))); // TEST: No auth

// ULTIMATE DASHBOARD - All-in-One Command Center (no-cache for development)
app.get('/ultimate', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'ULTIMATE-DASHBOARD.html'));
});

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
app.get('/scifi', (req, res) => res.sendFile(path.join(__dirname, 'SCIFI-DASHBOARD.html')));
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
app.get('/bauherren-pass', (req, res) => res.sendFile(path.join(__dirname, 'dashboards/BAUHERREN_PASS.html')));

// Customer Requirements & Internal Tools
app.get('/projekt-anforderungen', (req, res) => res.sendFile(path.join(__dirname, 'projekt-anforderungen.html')));
app.get('/projekt-anforderungen.html', (req, res) => res.sendFile(path.join(__dirname, 'projekt-anforderungen.html')));
app.get('/kunde-karte', (req, res) => res.sendFile(path.join(__dirname, 'kunde-karte.html')));
app.get('/kunde-karte.html', (req, res) => res.sendFile(path.join(__dirname, 'kunde-karte.html')));
app.get('/kunde-karte-test.html', (req, res) => res.sendFile(path.join(__dirname, 'kunde-karte-test.html')));
app.get('/investor-signup', (req, res) => res.sendFile(path.join(__dirname, 'investor-signup.html')));
app.get('/investor-signup.html', (req, res) => res.sendFile(path.join(__dirname, 'investor-signup.html')));

// WhatsApp & Communication
app.get('/whatsapp', (req, res) => res.sendFile(path.join(__dirname, 'WHATSAPP_AUTH_DASHBOARD.html')));

// Agents & Automation
app.get('/agents', (req, res) => res.sendFile(path.join(__dirname, 'agents.html')));

// Legal Pages
app.get('/agb', (req, res) => res.sendFile(path.join(__dirname, 'agb.html')));
app.get('/datenschutz', (req, res) => res.sendFile(path.join(__dirname, 'datenschutz.html')));
app.get('/impressum', (req, res) => res.sendFile(path.join(__dirname, 'impressum.html')));

// Awards Page
app.get('/awards', (req, res) => res.sendFile(path.join(__dirname, 'awards.html')));

// Data Room (Investor Documents)
app.get('/data-room', (req, res) => res.sendFile(path.join(__dirname, 'Data Room/index.html')));
app.use('/Data%20Room', express.static(path.join(__dirname, 'Data Room')));

// GOD MODE Dashboard
app.get('/god-mode-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'GOD_MODE_DASHBOARD.html')));

// Customer Intake Form
app.get('/intake/:token', (req, res) => res.sendFile(path.join(__dirname, 'customer-intake.html')));

// Static files
app.use('/styles', express.static(path.join(__dirname, 'styles')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// Astro Landing Page Assets (generated by Astro build)
app.use('/_astro', express.static(path.join(__dirname, '_astro'), {
    maxAge: '1y',
    immutable: true
}));

// Serve favicon.svg for Astro landing page
app.get('/favicon.svg', (req, res) => res.sendFile(path.join(__dirname, 'landing-page/dist/favicon.svg')));
// Note: /api folder contains JS modules, not static files - don't serve as static
app.use('/dashboards', express.static(path.join(__dirname, 'dashboards')));
app.use('/data', express.static(path.join(__dirname, 'data')));
app.use('/automation', express.static(path.join(__dirname, 'automation')));
app.use('/docs', express.static(path.join(__dirname, 'docs')));

// ═══════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════

// Presentation API - Get deal data for personalized presentation
app.get('/api/presentation/:token', async (req, res) => {
    const { token } = req.params;
    const HUBSPOT_TOKEN = process.env.HUBSPOT_API_KEY;

    if (!HUBSPOT_TOKEN) {
        return res.status(500).json({ error: 'HubSpot not configured' });
    }

    try {
        // Search for deal with this presentation token
        const searchResponse = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filterGroups: [{
                    filters: [{
                        propertyName: 'presentation_url',
                        operator: 'CONTAINS_TOKEN',
                        value: token
                    }]
                }],
                properties: [
                    'dealname', 'amount', 'dealstage', 'pipeline',
                    'description', 'project_type', 'hubspot_owner_id',
                    'presentation_sent', 'presentation_url',
                    'customer_intake_completed', 'customer_project_types',
                    'customer_priorities', 'customer_project_phase',
                    'customer_area_size', 'customer_room_count',
                    'customer_timeline', 'customer_integrations', 'customer_notes'
                ],
                limit: 1
            })
        });

        const searchData = await searchResponse.json();
        let deal = null;

        if (searchData.results && searchData.results.length > 0) {
            deal = searchData.results[0];
        } else {
            // Fallback: Search deals in presentationscheduled stage and match token
            const stageSearchResponse = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filterGroups: [{
                        filters: [{
                            propertyName: 'dealstage',
                            operator: 'EQ',
                            value: 'presentationscheduled'
                        }]
                    }],
                    properties: [
                        'dealname', 'amount', 'dealstage', 'pipeline',
                        'description', 'project_type', 'hubspot_owner_id',
                        'customer_intake_completed', 'customer_project_types',
                        'customer_priorities', 'customer_project_phase',
                        'customer_area_size', 'customer_room_count',
                        'customer_timeline', 'customer_integrations', 'customer_notes'
                    ],
                    limit: 100
                })
            });
            const stageData = await stageSearchResponse.json();

            if (stageData.results) {
                for (const d of stageData.results) {
                    if (generatePresentationToken(d.id) === token) {
                        deal = d;
                        break;
                    }
                }
            }
        }

        if (!deal) {
            // No matching deal found - return generic presentation data
            return res.json({
                found: false,
                deal: {
                    name: 'Smart Building Projekt',
                    type: 'Smart Home',
                    value: null,
                    description: 'Maßgeschneiderte Smart Building Lösung',
                    features: ['LOXONE Automation', 'Energie-Management', 'Security', 'Mobile Steuerung']
                }
            });
        }

        // Get associated contact
        let contact = null;
        try {
            const assocResponse = await fetch(
                `https://api.hubapi.com/crm/v3/objects/deals/${deal.id}/associations/contacts`,
                {
                    headers: { 'Authorization': `Bearer ${HUBSPOT_TOKEN}` }
                }
            );
            const assocData = await assocResponse.json();

            if (assocData.results && assocData.results.length > 0) {
                const contactResponse = await fetch(
                    `https://api.hubapi.com/crm/v3/objects/contacts/${assocData.results[0].id}?properties=email,firstname,lastname,company`,
                    {
                        headers: { 'Authorization': `Bearer ${HUBSPOT_TOKEN}` }
                    }
                );
                contact = await contactResponse.json();
            }
        } catch (e) {
            console.error('[Presentation API] Contact fetch error:', e.message);
        }

        // Determine features based on deal type/stage
        const dealName = deal.properties.dealname || '';
        const features = [];

        if (dealName.toLowerCase().includes('smart home') || dealName.toLowerCase().includes('automation')) {
            features.push('LOXONE Automation', 'Energie-Management', 'Mobile Steuerung');
        }
        if (dealName.toLowerCase().includes('security') || dealName.toLowerCase().includes('verisure')) {
            features.push('Verisure Security', '24/7 Alarmzentrale', 'Videoüberwachung');
        }
        if (dealName.toLowerCase().includes('iot') || dealName.toLowerCase().includes('industry')) {
            features.push('IoT Integration', 'Industrie 4.0', 'Predictive Maintenance');
        }
        if (dealName.toLowerCase().includes('software')) {
            features.push('Custom Software', 'API Integration', 'Cloud Services');
        }

        // Default features if none matched
        if (features.length === 0) {
            features.push('LOXONE Automation', 'Energie-Management', 'Verisure Security', 'Mobile Steuerung');
        }

        // Check if customer has completed intake form
        const intakeCompleted = deal.properties.customer_intake_completed === 'true';

        // Build customer requirements object if intake was completed
        const customerRequirements = intakeCompleted ? {
            projectTypes: deal.properties.customer_project_types?.split(', ').filter(Boolean) || [],
            priorities: deal.properties.customer_priorities?.split(', ').filter(Boolean) || [],
            projectPhase: deal.properties.customer_project_phase || null,
            areaSize: deal.properties.customer_area_size || null,
            roomCount: deal.properties.customer_room_count || null,
            timeline: deal.properties.customer_timeline || null,
            integrations: deal.properties.customer_integrations?.split(', ').filter(Boolean) || [],
            notes: deal.properties.customer_notes || null
        } : null;

        // If customer requirements exist, use them for features
        if (intakeCompleted && customerRequirements) {
            features.length = 0; // Clear default features

            // Map integrations to display features
            const integrationMap = {
                'lighting': 'Intelligente Beleuchtung',
                'shading': 'Automatische Beschattung',
                'heating': 'Smarte Heizungssteuerung',
                'cooling': 'Klimaanlagen-Integration',
                'multiroom': 'Multiroom Audio System',
                'access': 'Zutrittskontrolle',
                'intercom': 'Video-Gegensprechanlage',
                'irrigation': 'Bewässerungssteuerung',
                'pool': 'Pool & Wellness'
            };

            customerRequirements.integrations.forEach(int => {
                if (integrationMap[int]) features.push(integrationMap[int]);
            });

            // Add priority-based features
            if (customerRequirements.priorities.includes('security')) {
                features.push('Verisure Security System');
            }
            if (customerRequirements.priorities.includes('energy_saving')) {
                features.push('Energie-Optimierung');
            }

            // Ensure we have at least some features
            if (features.length === 0) {
                features.push('LOXONE Automation', 'Energie-Management', 'Mobile Steuerung');
            }
        }

        res.json({
            found: true,
            deal: {
                id: deal.id,
                name: deal.properties.dealname,
                type: deal.properties.project_type || 'Smart Building',
                value: deal.properties.amount ? parseFloat(deal.properties.amount) : null,
                description: deal.properties.description || 'Maßgeschneiderte Smart Building Lösung',
                stage: deal.properties.dealstage,
                features: features
            },
            contact: contact ? {
                firstName: contact.properties?.firstname,
                lastName: contact.properties?.lastname,
                company: contact.properties?.company,
                email: contact.properties?.email
            } : null,
            intakeCompleted: intakeCompleted,
            customerRequirements: customerRequirements
        });

    } catch (error) {
        console.error('[Presentation API] Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch deal data' });
    }
});

// Customer Intake API - Save customer requirements to HubSpot
app.post('/api/customer-intake', async (req, res) => {
    const HUBSPOT_TOKEN = process.env.HUBSPOT_API_KEY;
    const intakeData = req.body;

    if (!HUBSPOT_TOKEN) {
        return res.status(500).json({ error: 'HubSpot not configured' });
    }

    if (!intakeData.token) {
        return res.status(400).json({ error: 'Token required' });
    }

    try {
        // Find the deal by token
        let dealId = null;

        // Search in presentationscheduled stage
        const stageSearchResponse = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filterGroups: [{
                    filters: [{
                        propertyName: 'dealstage',
                        operator: 'EQ',
                        value: 'presentationscheduled'
                    }]
                }],
                properties: ['dealname'],
                limit: 100
            })
        });
        const stageData = await stageSearchResponse.json();

        if (stageData.results) {
            for (const deal of stageData.results) {
                if (generatePresentationToken(deal.id) === intakeData.token) {
                    dealId = deal.id;
                    break;
                }
            }
        }

        if (!dealId) {
            return res.status(404).json({ error: 'Deal not found' });
        }

        // Prepare properties for HubSpot update
        const properties = {
            customer_intake_completed: 'true',
            customer_intake_date: new Date().toISOString().split('T')[0],
            customer_project_types: intakeData.project_types?.join(', ') || '',
            customer_priorities: intakeData.priorities?.join(', ') || '',
            customer_project_phase: intakeData.project_phase || '',
            customer_area_size: intakeData.area_size || '',
            customer_room_count: intakeData.room_count || '',
            customer_timeline: intakeData.timeline || '',
            customer_integrations: intakeData.integrations?.join(', ') || '',
            customer_notes: intakeData.additional_notes || '',
            customer_contact_preference: intakeData.contact_preference || ''
        };

        // Try to update deal with intake data
        try {
            await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${dealId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ properties })
            });
        } catch (propError) {
            // Properties might not exist, continue anyway
            console.log('[CustomerIntake] Some properties may not exist:', propError.message);
        }

        // Create a note on the deal with all intake details
        const noteContent = `📋 KUNDENANFORDERUNGEN EINGEGANGEN

🏠 Projekttypen: ${intakeData.project_types?.join(', ') || 'Nicht angegeben'}
⭐ Prioritäten: ${intakeData.priorities?.join(', ') || 'Nicht angegeben'}
📍 Projektphase: ${intakeData.project_phase || 'Nicht angegeben'}
📐 Fläche: ${intakeData.area_size || '?'} m²
🚪 Räume: ${intakeData.room_count || '?'}
⏰ Zeitrahmen: ${intakeData.timeline || 'Nicht angegeben'}
🔧 Gewünschte Integrationen: ${intakeData.integrations?.join(', ') || 'Keine angegeben'}
📞 Kontaktpräferenz: ${intakeData.contact_preference || 'Nicht angegeben'}

📝 Zusätzliche Wünsche:
${intakeData.additional_notes || 'Keine weiteren Angaben'}

─────────────────────────────
Erfasst am: ${new Date().toLocaleString('de-DE')}`;

        // Create the note
        const noteResponse = await fetch('https://api.hubapi.com/crm/v3/objects/notes', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                properties: {
                    hs_note_body: noteContent,
                    hs_timestamp: new Date().toISOString()
                }
            })
        });

        if (noteResponse.ok) {
            const note = await noteResponse.json();

            // Associate note with deal
            await fetch(
                `https://api.hubapi.com/crm/v3/objects/notes/${note.id}/associations/deals/${dealId}/note_to_deal`,
                {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${HUBSPOT_TOKEN}` }
                }
            );
        }

        console.log(`[CustomerIntake] Saved intake data for deal ${dealId}`);

        res.json({
            success: true,
            message: 'Intake data saved successfully',
            dealId: dealId
        });

    } catch (error) {
        console.error('[CustomerIntake] Error:', error.message);
        res.status(500).json({ error: 'Failed to save intake data' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        system: 'HAIKU GOD MODE',
        version: '2.0.0',
        form: 'Mastered Ultra Instinct',
        powerLevel: '∞',
        botsOnline: allBots.length,
        wsClients: global.wsClients?.size || 0,
        timestamp: new Date().toISOString()
    });
});

// WebSocket status endpoint
app.get('/api/ws/status', (req, res) => {
    const clients = [];
    if (global.wsClients) {
        global.wsClients.forEach((meta) => {
            clients.push({
                id: meta.id,
                connectedAt: meta.connectedAt,
                channels: meta.channels,
                uptime: Date.now() - meta.connectedAt
            });
        });
    }
    res.json({
        connected: clients.length,
        clients,
        serverUptime: process.uptime()
    });
});

// Send notification to all connected clients
app.post('/api/notify', (req, res) => {
    const { type, title, message, duration } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    if (global.wsBroadcast) {
        global.wsBroadcast('notification', {
            type: type || 'info',
            title,
            message: message || '',
            duration: duration || 5000
        });
        res.json({
            success: true,
            message: 'Notification sent',
            recipients: global.wsClients?.size || 0
        });
    } else {
        res.status(503).json({ error: 'WebSocket not available' });
    }
});

// Email queue status
app.get('/api/email-queue/status', (req, res) => {
    if (emailQueue) {
        res.json(emailQueue.getQueueStatus());
    } else {
        res.json({ error: 'Email queue not available', queueSize: 0 });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL ACCOUNTS API (Multi-Account + IMAP Tracking)
// ═══════════════════════════════════════════════════════════════════════════

// Get all email accounts
app.get('/api/v1/email/accounts', async (req, res) => {
    try {
        if (!emailAccounts) {
            return res.json({ accounts: [], error: 'Email accounts service not available' });
        }
        const accounts = await emailAccounts.getAccounts();
        res.json({ accounts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get email statistics per account
app.get('/api/v1/email/accounts/stats', async (req, res) => {
    try {
        if (!emailAccounts) {
            return res.json({ stats: [] });
        }
        const days = parseInt(req.query.days) || 30;
        const stats = await emailAccounts.getEmailStats(days);
        res.json({ stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get sent emails (from IMAP sync)
app.get('/api/v1/email/sent', async (req, res) => {
    try {
        if (!emailAccounts) {
            return res.json({ emails: [], total: 0 });
        }
        const result = await emailAccounts.getSentEmails({
            accountId: req.query.account,
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0,
            search: req.query.search
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send email from specific account
app.post('/api/v1/email/send', async (req, res) => {
    try {
        if (!emailAccounts) {
            return res.status(503).json({ error: 'Email accounts service not available' });
        }
        const { account, to, subject, html, text, replyTo, cc, bcc } = req.body;

        if (!to || !subject) {
            return res.status(400).json({ error: 'Missing required fields: to, subject' });
        }

        const result = await emailAccounts.sendEmail(account || 'info', {
            to, subject, html, text, replyTo, cc, bcc
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Sync sent emails from IMAP
app.post('/api/v1/email/sync', async (req, res) => {
    try {
        if (!emailAccounts) {
            return res.status(503).json({ error: 'Email accounts service not available' });
        }
        const { account } = req.body;

        if (account) {
            const result = await emailAccounts.syncSentEmails(account, {
                maxEmails: parseInt(req.body.maxEmails) || 50,
                sinceDays: parseInt(req.body.sinceDays) || 30
            });
            res.json({ [account]: result });
        } else {
            const results = await emailAccounts.syncAllAccounts();
            res.json(results);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// System overview - Dynamic HubSpot Data
app.get('/api/overview', async (req, res) => {
    try {
        const [statsData, wonDealsData, allDealsData] = await Promise.all([
            Promise.all([
                hubspotRequest('/crm/v3/objects/contacts/search', { method: 'POST', body: { limit: 1, filterGroups: [] } }),
                hubspotRequest('/crm/v3/objects/deals/search', { method: 'POST', body: { limit: 1, filterGroups: [] } }),
                hubspotRequest('/crm/v3/objects/companies/search', { method: 'POST', body: { limit: 1, filterGroups: [] } })
            ]),
            hubspotRequest('/crm/v3/objects/deals/search', {
                method: 'POST',
                body: { limit: 100, filterGroups: [{ filters: [{ propertyName: 'dealstage', operator: 'EQ', value: 'closedwon' }] }], properties: ['amount', 'dealstage'] }
            }),
            hubspotRequest('/crm/v3/objects/deals/search', {
                method: 'POST',
                body: { limit: 100, filterGroups: [], properties: ['amount', 'dealstage'] }
            })
        ]);

        const [contacts, deals, companies] = statsData;
        const totalContacts = contacts.total || 0;
        const totalDeals = deals.total || 0;
        const totalCompanies = companies.total || 0;

        const wonTotal = wonDealsData.total || 0;
        const wonSample = wonDealsData.results || [];
        const wonSampleSum = wonSample.reduce((sum, d) => sum + parseFloat(d.properties?.amount || 0), 0);
        const wonAvg = wonSample.length > 0 ? wonSampleSum / wonSample.length : 0;
        const wonAmount = wonTotal <= 100 ? wonSampleSum : wonAvg * wonTotal;

        const allDealsTotal = allDealsData.total || 0;
        const allDealsSample = allDealsData.results || [];
        const closedStages = ['closedwon', 'closedlost'];
        const openSample = allDealsSample.filter(d => !closedStages.includes(d.properties?.dealstage));
        const openSampleSum = openSample.reduce((sum, d) => sum + parseFloat(d.properties?.amount || 0), 0);
        const openRatio = allDealsSample.length > 0 ? openSample.length / allDealsSample.length : 0;
        const openTotal = Math.round(allDealsTotal * openRatio);
        const openAvg = openSample.length > 0 ? openSampleSum / openSample.length : 0;
        const pipelineAmount = openTotal <= 100 ? openSampleSum : openAvg * openTotal;

        const formatCurrency = (val) => {
            if (val >= 1000000000) return `€${(val/1000000000).toFixed(1)}B`;
            if (val >= 1000000) return `€${(val/1000000).toFixed(1)}M`;
            if (val >= 1000) return `€${Math.round(val/1000)}K`;
            return `€${Math.round(val)}`;
        };
        const formatNumber = (num) => num.toLocaleString('de-DE');

        res.json({
            haiku: { name: 'HAIKU 神', form: 'Mastered Ultra Instinct', powerLevel: '∞', abilities: ['Divine Sight', 'Prophecy', 'Time Control', 'Reality Warp'] },
            geniusAgency: { totalBots: allBots.length, categories: { analysts: allBots.filter(b => b.category === 'analyst').length, strategists: allBots.filter(b => b.category === 'strategist').length, creatives: allBots.filter(b => b.category === 'creative').length, innovators: allBots.filter(b => b.category === 'innovator').length } },
            metrics: {
                revenue: { value: formatCurrency(wonAmount), change: `+${wonTotal} Won`, rawValue: wonAmount, wonDeals: wonTotal },
                pipeline: { value: formatCurrency(pipelineAmount), change: `${formatNumber(openTotal)} Deals`, rawValue: pipelineAmount, openDeals: openTotal },
                contacts: { value: formatNumber(totalContacts), change: `+${formatNumber(Math.round(totalContacts * 0.001))}`, rawValue: totalContacts },
                companies: { value: formatNumber(totalCompanies), rawValue: totalCompanies },
                tasksToday: 42
            },
            integrations: { hubspot: 'connected', whatsapp: 'connected', anthropic: 'connected', zadarma: 'connected' },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[API Overview] Error:', error.message);
        res.status(500).json({ error: 'Failed to load overview data' });
    }
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
// SKILLS API - Command Center
// ═══════════════════════════════════════════════════════════════

// Get all available skills/commands
app.get('/api/skills', (req, res) => {
    res.json({
        total: 6,
        skills: [
            {
                name: 'dashboard',
                command: '/dashboard',
                description: 'Dashboard-Daten abrufen und aktualisieren',
                actions: ['refresh', 'stats', 'pipeline'],
                category: 'analytics',
                icon: 'chart-bar',
                color: 'indigo'
            },
            {
                name: 'deals',
                command: '/deals',
                description: 'HubSpot Deals verwalten und analysieren',
                actions: ['list', 'won', 'stats', 'search'],
                category: 'crm',
                icon: 'currency-dollar',
                color: 'green'
            },
            {
                name: 'payments',
                command: '/payments',
                description: 'Stripe Zahlungen verwalten',
                actions: ['status', 'recent', 'link', 'balance'],
                category: 'finance',
                icon: 'credit-card',
                color: 'amber'
            },
            {
                name: 'invoice',
                command: '/invoice',
                description: 'Rechnungen erstellen und versenden',
                actions: ['send', 'batch', 'preview', 'status'],
                category: 'finance',
                icon: 'document-text',
                color: 'blue'
            },
            {
                name: 'security',
                command: '/security',
                description: 'Server-Sicherheit prüfen und verwalten',
                actions: ['status', 'logs', 'banned', 'audit'],
                category: 'security',
                icon: 'shield-check',
                color: 'red'
            },
            {
                name: 'crm-expert',
                command: 'skill:crm-expert',
                description: 'HubSpot CRM Experte für Deal-Management und Pipeline-Analyse',
                actions: ['analyze', 'forecast', 'optimize'],
                category: 'ai-skill',
                icon: 'light-bulb',
                color: 'purple',
                isSkill: true
            }
        ],
        timestamp: new Date().toISOString()
    });
});

// Execute skill command
app.post('/api/skills/execute', (req, res) => {
    const { skill, action, params } = req.body;

    const validSkills = ['dashboard', 'deals', 'payments', 'invoice', 'security', 'crm-expert'];
    if (!validSkills.includes(skill)) {
        return res.status(400).json({ error: 'Invalid skill', validSkills });
    }

    res.json({
        success: true,
        skill: skill,
        action: action || 'default',
        params: params || {},
        result: `Skill /${skill} ${action || ''} wurde ausgeführt`,
        timestamp: new Date().toISOString()
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
        // Only disable cert validation in development for self-signed certs
        rejectUnauthorized: process.env.NODE_ENV === 'production'
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

// Send email function - Now uses queue for rate limiting
async function sendEmail({ to, subject, html, text }, metadata = {}) {
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

        // Use email queue for rate limiting if available
        if (emailQueue) {
            const queueResult = emailQueue.queueEmail(mailOptions, metadata);
            if (queueResult.success) {
                console.log(`[SMTP] Email queued: ${queueResult.id} to ${to}`);
                return { success: true, queued: true, queueId: queueResult.id };
            } else {
                console.warn(`[SMTP] Queue failed: ${queueResult.reason}, sending directly`);
            }
        }

        // Fallback to direct send if queue not available or failed
        const result = await smtpTransporter.sendMail(mailOptions);
        console.log(`[SMTP] Email sent to ${to} - Message ID: ${result.messageId}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error(`[SMTP] Failed to send email to ${to}:`, error.message);
        return { success: false, error: error.message };
    }
}

// Direct send function (bypasses queue - use sparingly for urgent emails)
async function sendEmailDirect({ to, subject, html, text }) {
    const mailOptions = {
        from: process.env.SMTP_FROM || 'Enterprise Universe <invoice@enterprise-universe.one>',
        to: to,
        subject: subject,
        html: html,
        text: text || html.replace(/<[^>]*>/g, '')
    };

    try {
        const result = await smtpTransporter.sendMail(mailOptions);
        console.log(`[SMTP] Direct email sent to ${to} - Message ID: ${result.messageId}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error(`[SMTP] Direct send failed to ${to}:`, error.message);
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

// HubSpot Deals - Get deals with properties (supports pagination)
app.get('/api/hubspot/deals', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const after = req.query.after || '';
        let url = `/crm/v3/objects/deals?limit=${limit}&properties=dealname,amount,dealstage,closedate,pipeline,hubspot_owner_id,createdate`;
        if (after) url += `&after=${after}`;

        const data = await hubspotRequest(url);

        res.json({
            total: data.total || data.results?.length || 0,
            deals: data.results || [],
            paging: data.paging
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// HubSpot Deals - Get deals WITH associated contacts (for pipeline view)
app.get('/api/hubspot/deals/with-contacts', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const stage = req.query.stage || '';

        // Build search query
        const searchBody = {
            limit,
            properties: ['dealname', 'amount', 'dealstage', 'closedate', 'pipeline', 'hubspot_owner_id', 'createdate'],
            sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }]
        };

        // Filter by stage if provided
        if (stage) {
            searchBody.filterGroups = [{
                filters: [{ propertyName: 'dealstage', operator: 'EQ', value: stage }]
            }];
        }

        const dealsData = await hubspotRequest('/crm/v3/objects/deals/search', {
            method: 'POST',
            body: searchBody
        });

        const deals = dealsData.results || [];

        // Fetch contacts for all deals in parallel (max 10 concurrent)
        const enrichedDeals = [];
        const batchSize = 10;

        for (let i = 0; i < deals.length; i += batchSize) {
            const batch = deals.slice(i, i + batchSize);
            const enrichedBatch = await Promise.all(batch.map(async (deal) => {
                try {
                    // Get associated contact
                    const associations = await hubspotRequest(`/crm/v3/objects/deals/${deal.id}/associations/contacts`);

                    let contact = null;
                    if (associations?.results?.length > 0) {
                        const contactId = associations.results[0].id;
                        const contactData = await hubspotRequest(`/crm/v3/objects/contacts/${contactId}?properties=firstname,lastname,email,phone,company`);
                        contact = {
                            id: contactId,
                            name: ((contactData.properties?.firstname || '') + ' ' + (contactData.properties?.lastname || '')).trim() || contactData.properties?.company || 'Unknown',
                            email: contactData.properties?.email || null,
                            phone: contactData.properties?.phone || null,
                            company: contactData.properties?.company || null
                        };
                    }

                    return {
                        ...deal,
                        contact
                    };
                } catch (err) {
                    return { ...deal, contact: null };
                }
            }));
            enrichedDeals.push(...enrichedBatch);
        }

        res.json({
            total: enrichedDeals.length,
            deals: enrichedDeals,
            paging: dealsData.paging
        });
    } catch (error) {
        console.error('[Deals With Contacts] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// HubSpot Deals - Get ALL deals with pagination (fetches all pages)
app.get('/api/hubspot/deals/all', async (req, res) => {
    try {
        const allDeals = [];
        let after = null;
        let totalFetched = 0;
        const maxDeals = parseInt(req.query.max) || 1000000;  // Increased from 10k to 1M to fetch all deals

        console.log('[Deals All] Starting to fetch all deals...');

        while (totalFetched < maxDeals) {
            let url = '/crm/v3/objects/deals?limit=100&properties=dealname,amount,dealstage,closedate,pipeline,hubspot_owner_id,createdate';
            if (after) url += `&after=${after}`;

            const data = await hubspotRequest(url);
            const deals = data.results || [];

            if (deals.length === 0) break;

            allDeals.push(...deals);
            totalFetched += deals.length;

            console.log(`[Deals All] Fetched ${totalFetched} deals so far...`);

            // Check for next page
            if (data.paging?.next?.after) {
                after = data.paging.next.after;
            } else {
                break;
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`[Deals All] Complete! Total: ${allDeals.length} deals`);

        res.json({
            total: allDeals.length,
            deals: allDeals,
            complete: true
        });
    } catch (error) {
        console.error('[Deals All] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// OPTIMIZED DEALS ENDPOINTS (Fast Loading)
// ═══════════════════════════════════════════════════════════════

// Pipeline Stats - Fast aggregated stats using HubSpot Search API
app.get('/api/hubspot/deals/pipeline-stats', async (req, res) => {
    try {
        const stages = [
            'qualifiedtobuy', 'presentationscheduled', 'decisionmakerboughtin',
            'negotiation', 'closedwon', 'closedlost', 'appointmentscheduled'
        ];

        // Helper function for delay
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // Fetch counts for each stage with rate limiting (200ms delay between requests)
        const stageResults = [];
        for (const stage of stages) {
            try {
                const searchBody = {
                    filterGroups: [{ filters: [{ propertyName: 'dealstage', operator: 'EQ', value: stage }] }],
                    properties: ['amount'],
                    limit: 1
                };
                const data = await hubspotRequest('/crm/v3/objects/deals/search', {
                    method: 'POST',
                    body: searchBody
                });
                const count = (data && typeof data.total === 'number') ? data.total : 0;
                if (stage === 'closedwon' || stage === 'closedlost') {
                    console.log(`[Pipeline Stats] ${stage}: ${count} (raw: ${JSON.stringify(data).slice(0, 200)})`);
                }
                stageResults.push({ stage, total: count });
                // Add delay to avoid HubSpot secondly rate limit
                await delay(200);
            } catch (err) {
                console.error(`[Pipeline Stats] Error fetching stage ${stage}:`, err.message);
                stageResults.push({ stage, total: 0 });
                await delay(500); // Longer delay after error
            }
        }
        const stagePromises = Promise.resolve(stageResults);

        // Get total pipeline value (top deals for sum estimate) - add delay first
        await delay(300);
        let topDealsData = { results: [] };
        try {
            topDealsData = await hubspotRequest('/crm/v3/objects/deals/search', {
                method: 'POST',
                body: {
                    filterGroups: [],
                    properties: ['amount', 'dealstage'],
                    sorts: [{ propertyName: 'amount', direction: 'DESCENDING' }],
                    limit: 100
                }
            });
            console.log(`[Pipeline Stats] Top deals fetched: ${topDealsData.results?.length || 0} results`);
        } catch (err) {
            console.error('[Pipeline Stats] Error fetching top deals:', err.message);
        }

        // Calculate stats
        const stageStats = {};
        let totalDeals = 0;
        stageResults.forEach(({ stage, total }) => {
            stageStats[stage] = { count: total };
            totalDeals += total;
        });

        // Calculate pipeline value from top deals (estimate)
        const topDeals = topDealsData.results || [];
        let pipelineValue = 0;
        topDeals.forEach(deal => {
            const amount = parseFloat(deal.properties?.amount || 0);
            pipelineValue += amount;
        });

        // Get won value separately (top won deals) - add delay first
        await delay(300);
        let wonValue = 0;
        try {
            const wonDealsData = await hubspotRequest('/crm/v3/objects/deals/search', {
                method: 'POST',
                body: {
                    filterGroups: [{ filters: [{ propertyName: 'dealstage', operator: 'EQ', value: 'closedwon' }] }],
                    properties: ['amount'],
                    sorts: [{ propertyName: 'amount', direction: 'DESCENDING' }],
                    limit: 100
                }
            });
            (wonDealsData.results || []).forEach(deal => {
                wonValue += parseFloat(deal.properties?.amount || 0);
            });
            console.log(`[Pipeline Stats] Won value from ${wonDealsData.results?.length || 0} deals: ${wonValue}`);
        } catch (err) {
            console.error('[Pipeline Stats] Error fetching won deals:', err.message);
        }

        res.json({
            totalDeals,
            stageStats,
            pipelineValue,
            wonValue,
            topDeals: topDeals.slice(0, 10),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Pipeline Stats] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get deals by stage with pagination (fast)
app.get('/api/hubspot/deals/by-stage/:stage', async (req, res) => {
    try {
        const { stage } = req.params;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const after = req.query.after || null;

        const searchBody = {
            filterGroups: [{ filters: [{ propertyName: 'dealstage', operator: 'EQ', value: stage }] }],
            properties: ['dealname', 'amount', 'dealstage', 'closedate', 'pipeline', 'createdate'],
            sorts: [{ propertyName: 'amount', direction: 'DESCENDING' }],
            limit,
            ...(after && { after })
        };

        const data = await hubspotRequest('/crm/v3/objects/deals/search', {
            method: 'POST',
            body: searchBody
        });

        res.json({
            stage,
            total: data.total || 0,
            deals: data.results || [],
            paging: data.paging
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Auto Lead Discovery - Find new leads based on criteria
app.get('/api/lead-discovery/scan', async (req, res) => {
    try {
        const { industry, minRevenue, maxAge } = req.query;

        // Search for contacts without deals (potential leads)
        const filters = [
            { propertyName: 'hs_lead_status', operator: 'HAS_PROPERTY', value: 'true' }
        ];

        if (industry) {
            filters.push({ propertyName: 'industry', operator: 'CONTAINS_TOKEN', value: industry });
        }

        const searchBody = {
            filterGroups: [{ filters }],
            properties: ['firstname', 'lastname', 'email', 'company', 'phone', 'hs_lead_status', 'industry', 'createdate'],
            sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
            limit: 50
        };

        const data = await hubspotRequest('/crm/v3/objects/contacts/search', {
            method: 'POST',
            body: searchBody
        });

        res.json({
            leads: data.results || [],
            total: data.total || 0,
            scannedAt: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Auto Lead Discovery - Background daemon status
let leadDiscoveryStatus = { running: false, lastRun: null, leadsFound: 0 };

app.get('/api/lead-discovery/status', (req, res) => {
    res.json(leadDiscoveryStatus);
});

app.post('/api/lead-discovery/start', async (req, res) => {
    if (leadDiscoveryStatus.running) {
        return res.json({ message: 'Already running', status: leadDiscoveryStatus });
    }

    leadDiscoveryStatus.running = true;
    leadDiscoveryStatus.lastRun = new Date().toISOString();

    // Background process
    (async () => {
        try {
            // Scan for new leads
            const data = await hubspotRequest('/crm/v3/objects/contacts/search', {
                method: 'POST',
                body: {
                    filterGroups: [{ filters: [
                        { propertyName: 'hs_lead_status', operator: 'EQ', value: 'NEW' }
                    ]}],
                    properties: ['email', 'company'],
                    limit: 100
                }
            });
            leadDiscoveryStatus.leadsFound = data.total || 0;
        } catch (e) {
            console.error('[Lead Discovery] Error:', e.message);
        } finally {
            leadDiscoveryStatus.running = false;
        }
    })();

    res.json({ message: 'Lead discovery started', status: leadDiscoveryStatus });
});

// HubSpot Contacts - Get contacts with properties
app.get('/api/hubspot/contacts', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const businessOnly = req.query.business !== 'false'; // Default: nur Business-Kontakte

        if (businessOnly) {
            // Nur Business-Kontakte (Leads, MQLs, SQLs, Opportunities, Customers)
            const data = await hubspotRequest('/crm/v3/objects/contacts/search', {
                method: 'POST',
                body: {
                    limit,
                    filterGroups: [{
                        filters: [{
                            propertyName: 'lifecyclestage',
                            operator: 'IN',
                            values: ['lead', 'marketingqualifiedlead', 'salesqualifiedlead', 'opportunity', 'customer']
                        }]
                    }],
                    properties: ['firstname', 'lastname', 'email', 'phone', 'company', 'lifecyclestage', 'hs_lead_status'],
                    sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }]
                }
            });
            res.json({
                total: data.total || data.results?.length || 0,
                contacts: data.results || [],
                paging: data.paging
            });
        } else {
            // Alle Kontakte (inkl. private)
            const data = await hubspotRequest(`/crm/v3/objects/contacts?limit=${limit}&properties=firstname,lastname,email,phone,company,lifecyclestage,hs_lead_status`);
            res.json({
                total: data.total || data.results?.length || 0,
                contacts: data.results || [],
                paging: data.paging
            });
        }
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
// DEAL ASSOCIATIONS - Link Contacts to Deals
// ═══════════════════════════════════════════════════════════════

// Get contacts associated with a deal
app.get('/api/hubspot/deals/:dealId/associations/contacts', async (req, res) => {
    try {
        const { dealId } = req.params;
        const associations = await hubspotRequest(`/crm/v3/objects/deals/${dealId}/associations/contacts`);

        res.json({
            results: associations?.results || [],
            total: associations?.results?.length || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message, results: [] });
    }
});

// Link a contact to a deal (create association)
app.put('/api/hubspot/deals/:dealId/associations/contacts/:contactId', async (req, res) => {
    try {
        const { dealId, contactId } = req.params;

        // Use HubSpot v4 associations API
        const result = await hubspotRequest(`/crm/v4/objects/deals/${dealId}/associations/contacts/${contactId}`, {
            method: 'PUT',
            body: [{
                associationCategory: 'HUBSPOT_DEFINED',
                associationTypeId: 3  // deal_to_contact
            }]
        });

        console.log(`[Association] Linked contact ${contactId} to deal ${dealId}`);
        res.json({ success: true, result });
    } catch (error) {
        console.error('[Association] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// DUPLICATE PREVENTION - Check before creating contacts/deals
// ═══════════════════════════════════════════════════════════════

// Check for duplicate contact before creation
app.post('/api/hubspot/contacts/check-duplicate', async (req, res) => {
    try {
        const { email, phone, firstname, lastname, company } = req.body;
        const duplicates = [];

        // Check by email (most reliable)
        if (email) {
            const emailSearch = await hubspotRequest('/crm/v3/objects/contacts/search', {
                method: 'POST',
                body: {
                    filterGroups: [{
                        filters: [{ propertyName: 'email', operator: 'EQ', value: email }]
                    }],
                    properties: ['firstname', 'lastname', 'email', 'phone', 'company'],
                    limit: 5
                }
            });
            if (emailSearch?.results?.length) {
                duplicates.push(...emailSearch.results.map(c => ({
                    ...c,
                    matchType: 'email',
                    matchConfidence: 100
                })));
            }
        }

        // Check by phone
        if (phone && !duplicates.length) {
            const cleanPhone = phone.replace(/[^0-9+]/g, '');
            const phoneSearch = await hubspotRequest('/crm/v3/objects/contacts/search', {
                method: 'POST',
                body: {
                    filterGroups: [{
                        filters: [{ propertyName: 'phone', operator: 'CONTAINS_TOKEN', value: cleanPhone.slice(-8) }]
                    }],
                    properties: ['firstname', 'lastname', 'email', 'phone', 'company'],
                    limit: 5
                }
            });
            if (phoneSearch?.results?.length) {
                duplicates.push(...phoneSearch.results.map(c => ({
                    ...c,
                    matchType: 'phone',
                    matchConfidence: 90
                })));
            }
        }

        // Check by name + company
        if (firstname && lastname && company && !duplicates.length) {
            const nameSearch = await hubspotRequest('/crm/v3/objects/contacts/search', {
                method: 'POST',
                body: {
                    filterGroups: [{
                        filters: [
                            { propertyName: 'firstname', operator: 'EQ', value: firstname },
                            { propertyName: 'lastname', operator: 'EQ', value: lastname }
                        ]
                    }],
                    properties: ['firstname', 'lastname', 'email', 'phone', 'company'],
                    limit: 10
                }
            });
            if (nameSearch?.results?.length) {
                const companyMatches = nameSearch.results.filter(c =>
                    c.properties?.company?.toLowerCase().includes(company.toLowerCase()) ||
                    company.toLowerCase().includes(c.properties?.company?.toLowerCase() || '')
                );
                if (companyMatches.length) {
                    duplicates.push(...companyMatches.map(c => ({
                        ...c,
                        matchType: 'name_company',
                        matchConfidence: 75
                    })));
                }
            }
        }

        res.json({
            hasDuplicates: duplicates.length > 0,
            duplicates: duplicates.slice(0, 5),
            recommendation: duplicates.length > 0 ?
                (duplicates[0].matchConfidence >= 90 ? 'USE_EXISTING' : 'REVIEW') :
                'CREATE_NEW'
        });
    } catch (error) {
        res.status(500).json({ error: error.message, hasDuplicates: false, duplicates: [] });
    }
});

// Create contact with duplicate prevention
app.post('/api/hubspot/contacts/safe-create', async (req, res) => {
    try {
        const { email, phone, firstname, lastname, company, skipDuplicateCheck = false } = req.body;

        // First check for duplicates unless explicitly skipped
        if (!skipDuplicateCheck) {
            const dupeCheck = await new Promise(async (resolve) => {
                const duplicates = [];

                if (email) {
                    const emailSearch = await hubspotRequest('/crm/v3/objects/contacts/search', {
                        method: 'POST',
                        body: {
                            filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
                            properties: ['firstname', 'lastname', 'email', 'phone', 'company'],
                            limit: 1
                        }
                    });
                    if (emailSearch?.results?.length) {
                        resolve({ hasDuplicate: true, existing: emailSearch.results[0], matchType: 'email' });
                        return;
                    }
                }

                resolve({ hasDuplicate: false });
            });

            if (dupeCheck.hasDuplicate) {
                return res.json({
                    success: false,
                    reason: 'duplicate_found',
                    existingContact: dupeCheck.existing,
                    matchType: dupeCheck.matchType,
                    message: `Kontakt mit dieser ${dupeCheck.matchType === 'email' ? 'E-Mail' : 'Telefonnummer'} existiert bereits`
                });
            }
        }

        // Create the contact
        const properties = {};
        if (email) properties.email = email;
        if (phone) properties.phone = phone;
        if (firstname) properties.firstname = firstname;
        if (lastname) properties.lastname = lastname;
        if (company) properties.company = company;

        const result = await hubspotRequest('/crm/v3/objects/contacts', {
            method: 'POST',
            body: { properties }
        });

        console.log(`[Safe Create] New contact created: ${result.id} (${email || 'no email'})`);

        res.json({
            success: true,
            contact: result,
            id: result.id
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Search contacts by email (for linking to deals)
app.post('/api/hubspot/contacts/search', async (req, res) => {
    try {
        const { email, query } = req.body;

        let searchBody;
        if (email) {
            searchBody = {
                filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
                properties: ['firstname', 'lastname', 'email', 'phone', 'company'],
                limit: 5
            };
        } else if (query) {
            searchBody = {
                query,
                properties: ['firstname', 'lastname', 'email', 'phone', 'company'],
                limit: 10
            };
        } else {
            return res.status(400).json({ error: 'email or query required' });
        }

        const result = await hubspotRequest('/crm/v3/objects/contacts/search', {
            method: 'POST',
            body: searchBody
        });

        res.json({
            results: result?.results || [],
            total: result?.total || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message, results: [] });
    }
});

// ═══════════════════════════════════════════════════════════════
// HUBSPOT ENGAGEMENTS - Email History & Communications
// ═══════════════════════════════════════════════════════════════

// Get email engagements for a specific contact
app.get('/api/hubspot/contacts/:contactId/emails', async (req, res) => {
    try {
        const { contactId } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        // Get associated emails via CRM v3 associations
        const associations = await hubspotRequest(`/crm/v3/objects/contacts/${contactId}/associations/emails`);

        if (!associations?.results?.length) {
            return res.json({ emails: [], total: 0 });
        }

        // Fetch email details
        const emailIds = associations.results.map(a => a.id).slice(0, limit);
        const emails = [];

        for (const emailId of emailIds) {
            try {
                const email = await hubspotRequest(`/crm/v3/objects/emails/${emailId}?properties=hs_email_subject,hs_email_text,hs_email_html,hs_email_direction,hs_email_status,hs_timestamp,hs_email_from_email,hs_email_to_email`);
                emails.push({
                    id: email.id,
                    subject: email.properties?.hs_email_subject || 'No Subject',
                    body: email.properties?.hs_email_text || email.properties?.hs_email_html || '',
                    direction: email.properties?.hs_email_direction || 'UNKNOWN',
                    status: email.properties?.hs_email_status || 'UNKNOWN',
                    timestamp: email.properties?.hs_timestamp,
                    from: email.properties?.hs_email_from_email,
                    to: email.properties?.hs_email_to_email,
                    createdAt: email.createdAt
                });
            } catch (e) {
                console.log(`Failed to fetch email ${emailId}:`, e.message);
            }
        }

        // Sort by timestamp desc
        emails.sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));

        res.json({
            emails,
            total: associations.results.length,
            contactId
        });
    } catch (error) {
        console.error('Email fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all engagements (emails, calls, meetings, notes) for a contact
app.get('/api/hubspot/contacts/:contactId/engagements', async (req, res) => {
    try {
        const { contactId } = req.params;
        const limit = parseInt(req.query.limit) || 20;

        const engagementTypes = ['emails', 'calls', 'meetings', 'notes'];
        const allEngagements = [];

        for (const type of engagementTypes) {
            try {
                const associations = await hubspotRequest(`/crm/v3/objects/contacts/${contactId}/associations/${type}`);
                if (associations?.results?.length) {
                    for (const assoc of associations.results.slice(0, 10)) {
                        try {
                            let props = '';
                            if (type === 'emails') props = 'hs_email_subject,hs_email_direction,hs_timestamp';
                            else if (type === 'calls') props = 'hs_call_title,hs_call_duration,hs_timestamp';
                            else if (type === 'meetings') props = 'hs_meeting_title,hs_meeting_start_time,hs_meeting_end_time';
                            else if (type === 'notes') props = 'hs_note_body,hs_timestamp';

                            const item = await hubspotRequest(`/crm/v3/objects/${type}/${assoc.id}?properties=${props}`);
                            allEngagements.push({
                                id: item.id,
                                type: type.slice(0, -1), // Remove 's' - email, call, meeting, note
                                properties: item.properties,
                                createdAt: item.createdAt
                            });
                        } catch (e) { /* skip failed items */ }
                    }
                }
            } catch (e) { /* skip failed types */ }
        }

        // Sort by date
        allEngagements.sort((a, b) => {
            const dateA = new Date(a.properties?.hs_timestamp || a.createdAt);
            const dateB = new Date(b.properties?.hs_timestamp || b.createdAt);
            return dateB - dateA;
        });

        res.json({
            engagements: allEngagements.slice(0, limit),
            total: allEngagements.length,
            contactId
        });
    } catch (error) {
        console.error('Engagements fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get presentations (stored as meetings with specific type or notes)
app.get('/api/hubspot/presentations', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;

        // Search for meetings that are presentations
        const meetings = await hubspotRequest(`/crm/v3/objects/meetings?limit=${limit}&properties=hs_meeting_title,hs_meeting_start_time,hs_meeting_end_time,hs_meeting_outcome,hs_meeting_body`);

        const presentations = (meetings?.results || [])
            .filter(m => {
                const title = (m.properties?.hs_meeting_title || '').toLowerCase();
                return title.includes('präsentation') || title.includes('presentation') || title.includes('demo') || title.includes('pitch');
            })
            .map(m => ({
                id: m.id,
                title: m.properties?.hs_meeting_title,
                startTime: m.properties?.hs_meeting_start_time,
                endTime: m.properties?.hs_meeting_end_time,
                outcome: m.properties?.hs_meeting_outcome,
                notes: m.properties?.hs_meeting_body,
                createdAt: m.createdAt
            }));

        res.json({
            presentations,
            total: presentations.length
        });
    } catch (error) {
        console.error('Presentations fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// LEAD SYNC API - Auto Lead Generator Integration
// ═══════════════════════════════════════════════════════════════

// Owner cache for round-robin assignment
let ownerCache = { owners: [], lastFetch: 0, currentIndex: 0 };
const OWNER_CACHE_TTL = 1000 * 60 * 30; // 30 minutes

// Get all HubSpot owners
app.get('/api/hubspot/owners', async (req, res) => {
    try {
        const data = await hubspotRequest('/crm/v3/owners?limit=100');
        const activeOwners = (data.results || []).filter(o => !o.archived);

        // Update cache
        ownerCache.owners = activeOwners;
        ownerCache.lastFetch = Date.now();

        res.json({
            owners: activeOwners,
            total: activeOwners.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper: Get next owner for round-robin assignment
async function getNextOwnerForAssignment() {
    // Refresh cache if expired
    if (ownerCache.owners.length === 0 || Date.now() - ownerCache.lastFetch > OWNER_CACHE_TTL) {
        const data = await hubspotRequest('/crm/v3/owners?limit=100');
        ownerCache.owners = (data.results || []).filter(o => !o.archived);
        ownerCache.lastFetch = Date.now();
    }

    if (ownerCache.owners.length === 0) {
        return null;
    }

    const owner = ownerCache.owners[ownerCache.currentIndex];
    ownerCache.currentIndex = (ownerCache.currentIndex + 1) % ownerCache.owners.length;
    return owner;
}

// Bulk sync leads to HubSpot with automatic owner assignment
app.post('/api/leads/sync-to-hubspot', async (req, res) => {
    try {
        const { leads } = req.body;

        if (!leads || !Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({ error: 'No leads provided' });
        }

        const results = {
            success: [],
            failed: [],
            duplicates: []
        };

        for (const lead of leads) {
            try {
                // Check for duplicate by email
                if (lead.email) {
                    const dupeSearch = await hubspotRequest('/crm/v3/objects/contacts/search', {
                        method: 'POST',
                        body: {
                            filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: lead.email }] }],
                            properties: ['firstname', 'lastname', 'email'],
                            limit: 1
                        }
                    });

                    if (dupeSearch?.results?.length) {
                        results.duplicates.push({
                            lead,
                            existingId: dupeSearch.results[0].id,
                            message: 'Kontakt existiert bereits'
                        });
                        continue;
                    }
                }

                // Get owner for assignment
                const owner = await getNextOwnerForAssignment();

                // Create contact
                const contactProps = {
                    firstname: lead.firstname || lead.name?.split(' ')[0] || '',
                    lastname: lead.lastname || lead.name?.split(' ').slice(1).join(' ') || '',
                    email: lead.email || '',
                    phone: lead.phone || '',
                    company: lead.company || lead.companyName || '',
                    lifecyclestage: 'lead',
                    hs_lead_status: 'NEW',
                    lead_source: 'Auto Lead Generator',
                    lead_score: lead.score?.toString() || '0'
                };

                // Add owner if available
                if (owner) {
                    contactProps.hubspot_owner_id = owner.id.toString();
                }

                const contact = await hubspotRequest('/crm/v3/objects/contacts', {
                    method: 'POST',
                    body: { properties: contactProps }
                });

                // Create deal associated with the contact
                const dealProps = {
                    dealname: `${lead.company || lead.companyName || 'Neuer Lead'} - Erstkontakt`,
                    dealstage: 'appointmentscheduled',
                    pipeline: 'default',
                    amount: lead.estimatedValue || '0'
                };

                if (owner) {
                    dealProps.hubspot_owner_id = owner.id.toString();
                }

                const deal = await hubspotRequest('/crm/v3/objects/deals', {
                    method: 'POST',
                    body: {
                        properties: dealProps,
                        associations: [{
                            to: { id: contact.id },
                            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]
                        }]
                    }
                });

                results.success.push({
                    lead,
                    contactId: contact.id,
                    dealId: deal.id,
                    ownerId: owner?.id,
                    ownerName: owner ? `${owner.firstName} ${owner.lastName}` : 'Nicht zugewiesen'
                });

                // Rate limiting - 100ms between requests
                await new Promise(r => setTimeout(r, 100));

            } catch (error) {
                results.failed.push({
                    lead,
                    error: error.message
                });
            }
        }

        console.log(`[Lead Sync] Synced ${results.success.length}/${leads.length} leads to HubSpot`);

        res.json({
            success: true,
            summary: {
                total: leads.length,
                created: results.success.length,
                duplicates: results.duplicates.length,
                failed: results.failed.length
            },
            results
        });

    } catch (error) {
        console.error('[Lead Sync] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get lead sync status (for progress tracking)
let leadSyncStatus = { running: false, progress: 0, total: 0, lastRun: null };

app.get('/api/leads/sync-status', (req, res) => {
    res.json(leadSyncStatus);
});

// ═══════════════════════════════════════════════════════════════
// INTERACTION TRACKING - 360° Customer View
// ═══════════════════════════════════════════════════════════════

// Get all interactions for a specific contact
app.get('/api/interactions/contact/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const types = req.query.types ? req.query.types.split(',') : null;

        // 1. Get contact info from HubSpot
        const contact = await hubspotRequest(`/crm/v3/objects/contacts/${contactId}?properties=firstname,lastname,email,phone,company,lifecyclestage,hs_lead_status`);

        // 2. Get HubSpot engagements (emails, calls, meetings, notes)
        const [emailAssoc, callAssoc, meetingAssoc, noteAssoc] = await Promise.all([
            hubspotRequest(`/crm/v3/objects/contacts/${contactId}/associations/emails`).catch(() => ({ results: [] })),
            hubspotRequest(`/crm/v3/objects/contacts/${contactId}/associations/calls`).catch(() => ({ results: [] })),
            hubspotRequest(`/crm/v3/objects/contacts/${contactId}/associations/meetings`).catch(() => ({ results: [] })),
            hubspotRequest(`/crm/v3/objects/contacts/${contactId}/associations/notes`).catch(() => ({ results: [] }))
        ]);

        const interactions = [];

        // 3. Fetch email details
        if (emailAssoc?.results?.length) {
            const emailIds = emailAssoc.results.slice(0, 20).map(e => e.toObjectId || e.id);
            for (const emailId of emailIds) {
                try {
                    const email = await hubspotRequest(`/crm/v3/objects/emails/${emailId}?properties=hs_email_subject,hs_email_direction,hs_timestamp,hs_email_status`);
                    if (email?.properties) {
                        interactions.push({
                            id: emailId,
                            type: 'email',
                            icon: '📧',
                            color: 'cyan',
                            title: email.properties.hs_email_subject || 'Email',
                            direction: email.properties.hs_email_direction,
                            status: email.properties.hs_email_status,
                            timestamp: email.properties.hs_timestamp,
                            source: 'hubspot'
                        });
                    }
                } catch (e) { /* Skip failed email fetches */ }
            }
        }

        // 4. Fetch call details
        if (callAssoc?.results?.length) {
            const callIds = callAssoc.results.slice(0, 20).map(c => c.toObjectId || c.id);
            for (const callId of callIds) {
                try {
                    const call = await hubspotRequest(`/crm/v3/objects/calls/${callId}?properties=hs_call_title,hs_call_duration,hs_call_disposition,hs_timestamp`);
                    if (call?.properties) {
                        interactions.push({
                            id: callId,
                            type: 'call',
                            icon: '☎',
                            color: 'green',
                            title: call.properties.hs_call_title || 'Anruf',
                            duration: call.properties.hs_call_duration,
                            outcome: call.properties.hs_call_disposition,
                            timestamp: call.properties.hs_timestamp,
                            source: 'hubspot'
                        });
                    }
                } catch (e) { /* Skip failed call fetches */ }
            }
        }

        // 5. Fetch meeting details
        if (meetingAssoc?.results?.length) {
            const meetingIds = meetingAssoc.results.slice(0, 20).map(m => m.toObjectId || m.id);
            for (const meetingId of meetingIds) {
                try {
                    const meeting = await hubspotRequest(`/crm/v3/objects/meetings/${meetingId}?properties=hs_meeting_title,hs_meeting_outcome,hs_meeting_start_time,hs_timestamp`);
                    if (meeting?.properties) {
                        interactions.push({
                            id: meetingId,
                            type: 'meeting',
                            icon: '📅',
                            color: 'magenta',
                            title: meeting.properties.hs_meeting_title || 'Meeting',
                            outcome: meeting.properties.hs_meeting_outcome,
                            startTime: meeting.properties.hs_meeting_start_time,
                            timestamp: meeting.properties.hs_timestamp || meeting.properties.hs_meeting_start_time,
                            source: 'hubspot'
                        });
                    }
                } catch (e) { /* Skip failed meeting fetches */ }
            }
        }

        // 6. Fetch note details
        if (noteAssoc?.results?.length) {
            const noteIds = noteAssoc.results.slice(0, 20).map(n => n.toObjectId || n.id);
            for (const noteId of noteIds) {
                try {
                    const note = await hubspotRequest(`/crm/v3/objects/notes/${noteId}?properties=hs_note_body,hs_timestamp`);
                    if (note?.properties) {
                        interactions.push({
                            id: noteId,
                            type: 'note',
                            icon: '📝',
                            color: 'yellow',
                            title: (note.properties.hs_note_body || '').substring(0, 100) + '...',
                            body: note.properties.hs_note_body,
                            timestamp: note.properties.hs_timestamp,
                            source: 'hubspot'
                        });
                    }
                } catch (e) { /* Skip failed note fetches */ }
            }
        }

        // 7. Get activities from Activity Manager (WhatsApp, Deal changes, etc.)
        if (activityManager) {
            const activities = activityManager.getActivities({
                objectId: contactId,
                objectType: 'contact',
                limit: 50
            });

            activities.forEach(act => {
                interactions.push({
                    id: act.id,
                    type: act.type,
                    icon: act.icon || '•',
                    color: act.color || 'cyan',
                    title: act.title,
                    description: act.description,
                    timestamp: act.timestamp,
                    source: act.source || 'activity_manager'
                });
            });
        }

        // 8. Sort by timestamp (newest first)
        interactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // 9. Filter by types if specified
        let filtered = interactions;
        if (types && types.length) {
            filtered = interactions.filter(i => types.includes(i.type));
        }

        // 10. Calculate contact stats
        const stats = {
            totalInteractions: interactions.length,
            emails: interactions.filter(i => i.type === 'email').length,
            calls: interactions.filter(i => i.type === 'call').length,
            meetings: interactions.filter(i => i.type === 'meeting').length,
            notes: interactions.filter(i => i.type === 'note').length,
            whatsapp: interactions.filter(i => i.type === 'whatsapp_message').length,
            lastInteraction: interactions[0]?.timestamp || null
        };

        res.json({
            contact: contact?.properties || {},
            contactId,
            interactions: filtered.slice(0, limit),
            stats,
            total: filtered.length
        });

    } catch (error) {
        console.error('Interaction fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get contacts for Interaction Tracker with company info and activity sorting
app.get('/api/interactions/contacts', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const query = req.query.q || '';
        const lifecycle = req.query.lifecycle || ''; // customer, lead, etc.

        // Build filter for search
        const filters = [];
        if (lifecycle) {
            filters.push({ propertyName: 'lifecyclestage', operator: 'EQ', value: lifecycle });
        }

        // Search contacts sorted by last modification
        const contactsRes = await hubspotRequest('/crm/v3/objects/contacts/search', {
            method: 'POST',
            body: {
                limit,
                after: offset > 0 ? offset.toString() : undefined,
                sorts: [{ propertyName: 'lastmodifieddate', direction: 'DESCENDING' }],
                filterGroups: filters.length ? [{ filters }] : [],
                properties: ['firstname', 'lastname', 'email', 'phone', 'company', 'lifecyclestage', 'hs_lead_status', 'lastmodifieddate', 'createdate', 'num_associated_deals']
            }
        });

        const contacts = contactsRes?.results || [];

        // Enrich with company associations
        const enrichedContacts = await Promise.all(contacts.map(async (contact) => {
            let companyName = contact.properties?.company || '';
            let companyId = null;

            // Try to get associated company
            try {
                const companyAssoc = await hubspotRequest(`/crm/v3/objects/contacts/${contact.id}/associations/companies`);
                if (companyAssoc?.results?.length) {
                    companyId = companyAssoc.results[0].toObjectId || companyAssoc.results[0].id;
                    const company = await hubspotRequest(`/crm/v3/objects/companies/${companyId}?properties=name,domain`);
                    companyName = company?.properties?.name || companyName;
                }
            } catch (e) { /* No company association */ }

            // Build display name
            const firstName = contact.properties?.firstname || '';
            const lastName = contact.properties?.lastname || '';
            let displayName = `${firstName} ${lastName}`.trim();
            if (!displayName) {
                displayName = contact.properties?.email?.split('@')[0] || 'Unbekannt';
            }

            return {
                id: contact.id,
                displayName,
                firstName,
                lastName,
                email: contact.properties?.email || '',
                phone: contact.properties?.phone || '',
                company: companyName,
                companyId,
                lifecycleStage: contact.properties?.lifecyclestage || 'unknown',
                leadStatus: contact.properties?.hs_lead_status || '',
                lastModified: contact.properties?.lastmodifieddate,
                created: contact.properties?.createdate,
                dealCount: parseInt(contact.properties?.num_associated_deals) || 0,
                url: `https://app-eu1.hubspot.com/contacts/147479000/record/0-1/${contact.id}`
            };
        }));

        // Sort: Customers first, then by activity
        enrichedContacts.sort((a, b) => {
            // Customers before leads
            if (a.lifecycleStage === 'customer' && b.lifecycleStage !== 'customer') return -1;
            if (a.lifecycleStage !== 'customer' && b.lifecycleStage === 'customer') return 1;
            // Then by deal count
            if (a.dealCount !== b.dealCount) return b.dealCount - a.dealCount;
            // Then by last modified
            return new Date(b.lastModified || 0) - new Date(a.lastModified || 0);
        });

        res.json({
            total: contactsRes?.total || contacts.length,
            contacts: enrichedContacts
        });
    } catch (error) {
        console.error('[Interactions] Get contacts error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get companies for Interaction Tracker
app.get('/api/interactions/companies', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 30;

        const companiesRes = await hubspotRequest('/crm/v3/objects/companies/search', {
            method: 'POST',
            body: {
                limit,
                sorts: [{ propertyName: 'lastmodifieddate', direction: 'DESCENDING' }],
                properties: ['name', 'domain', 'phone', 'city', 'industry', 'numberofemployees', 'annualrevenue', 'num_associated_contacts', 'num_associated_deals', 'lastmodifieddate']
            }
        });

        const companies = (companiesRes?.results || []).map(company => ({
            id: company.id,
            name: company.properties?.name || 'Unbekannt',
            domain: company.properties?.domain || '',
            phone: company.properties?.phone || '',
            city: company.properties?.city || '',
            industry: company.properties?.industry || '',
            employees: company.properties?.numberofemployees || '',
            revenue: company.properties?.annualrevenue || '',
            contactCount: parseInt(company.properties?.num_associated_contacts) || 0,
            dealCount: parseInt(company.properties?.num_associated_deals) || 0,
            lastModified: company.properties?.lastmodifieddate,
            url: `https://app-eu1.hubspot.com/contacts/147479000/record/0-2/${company.id}`
        }));

        res.json({
            total: companiesRes?.total || companies.length,
            companies
        });
    } catch (error) {
        console.error('[Interactions] Get companies error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get aggregated interaction statistics
app.get('/api/interactions/stats', async (req, res) => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // Get total contacts for engagement score calculation
        const contactsRes = await hubspotRequest('/crm/v3/objects/contacts/search', {
            method: 'POST',
            body: { limit: 1, filterGroups: [] }
        }).catch(() => ({ total: 0 }));

        // Get activity stats from Activity Manager
        let activityStats = { total: 0, byType: {}, bySource: {} };
        if (activityManager) {
            activityStats = activityManager.getStats();
        }

        // Get HubSpot engagement counts (simplified)
        const [emailsRes, callsRes, meetingsRes] = await Promise.all([
            hubspotRequest('/crm/v3/objects/emails/search', {
                method: 'POST',
                body: { limit: 1, filterGroups: [{ filters: [{ propertyName: 'hs_timestamp', operator: 'GTE', value: thirtyDaysAgo }] }] }
            }).catch(() => ({ total: 0 })),
            hubspotRequest('/crm/v3/objects/calls/search', {
                method: 'POST',
                body: { limit: 1, filterGroups: [{ propertyName: 'hs_timestamp', operator: 'GTE', value: thirtyDaysAgo }] }
            }).catch(() => ({ total: 0 })),
            hubspotRequest('/crm/v3/objects/meetings/search', {
                method: 'POST',
                body: { limit: 1, filterGroups: [] }
            }).catch(() => ({ total: 0 }))
        ]);

        const totalContacts = contactsRes?.total || 1;
        const totalInteractions = (emailsRes?.total || 0) + (callsRes?.total || 0) + (meetingsRes?.total || 0) + activityStats.total;

        // Calculate engagement score (interactions per contact, weighted)
        const engagementScore = Math.min(100, Math.round((totalInteractions / totalContacts) * 10));

        // Estimate average response time (placeholder - would need actual tracking)
        const avgResponseTime = 2.4; // hours

        // Get pending tasks/follow-ups
        const tasksRes = await hubspotRequest('/crm/v3/objects/tasks/search', {
            method: 'POST',
            body: {
                limit: 1,
                filterGroups: [{ filters: [{ propertyName: 'hs_task_status', operator: 'EQ', value: 'NOT_STARTED' }] }]
            }
        }).catch(() => ({ total: 0 }));

        res.json({
            total: totalInteractions,
            avgResponseTime: avgResponseTime,
            engagementScore: engagementScore,
            pendingFollowUps: tasksRes?.total || 0,
            breakdown: {
                emails: emailsRes?.total || 0,
                calls: callsRes?.total || 0,
                meetings: meetingsRes?.total || 0,
                activities: activityStats.total
            },
            byType: activityStats.byType,
            bySource: activityStats.bySource,
            period: '30d'
        });

    } catch (error) {
        console.error('Interaction stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get analytics data for charts
app.get('/api/interactions/analytics', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;

        // Channel distribution
        const channels = {
            email: { count: 0, label: 'Email' },
            call: { count: 0, label: 'Anrufe' },
            meeting: { count: 0, label: 'Meetings' },
            whatsapp: { count: 0, label: 'WhatsApp' },
            note: { count: 0, label: 'Notizen' }
        };

        // Get counts from HubSpot
        const [emailsRes, callsRes, meetingsRes, notesRes] = await Promise.all([
            hubspotRequest('/crm/v3/objects/emails/search', { method: 'POST', body: { limit: 1, filterGroups: [] } }).catch(() => ({ total: 0 })),
            hubspotRequest('/crm/v3/objects/calls/search', { method: 'POST', body: { limit: 1, filterGroups: [] } }).catch(() => ({ total: 0 })),
            hubspotRequest('/crm/v3/objects/meetings/search', { method: 'POST', body: { limit: 1, filterGroups: [] } }).catch(() => ({ total: 0 })),
            hubspotRequest('/crm/v3/objects/notes/search', { method: 'POST', body: { limit: 1, filterGroups: [] } }).catch(() => ({ total: 0 }))
        ]);

        channels.email.count = emailsRes?.total || 0;
        channels.call.count = callsRes?.total || 0;
        channels.meeting.count = meetingsRes?.total || 0;
        channels.note.count = notesRes?.total || 0;

        // Get WhatsApp count from Activity Manager
        if (activityManager) {
            const stats = activityManager.getStats();
            channels.whatsapp.count = stats.byType?.whatsapp_message || 0;
        }

        // Response time trend (simulated data - would need real tracking)
        const responseTrend = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            responseTrend.push({
                date: date.toISOString().split('T')[0],
                label: date.toLocaleDateString('de-DE', { weekday: 'short' }),
                avgResponseTime: (Math.random() * 3 + 1).toFixed(1)
            });
        }

        // Get top engaged contacts
        const contactsRes = await hubspotRequest('/crm/v3/objects/contacts?limit=10&properties=firstname,lastname,email,notes_last_updated')
            .catch(() => ({ results: [] }));

        const topContacts = (contactsRes?.results || []).map(c => ({
            id: c.id,
            name: `${c.properties?.firstname || ''} ${c.properties?.lastname || ''}`.trim() || c.properties?.email,
            email: c.properties?.email,
            lastActivity: c.properties?.notes_last_updated
        }));

        res.json({
            channels,
            responseTrend,
            topContacts,
            period: `${days}d`
        });

    } catch (error) {
        console.error('Interaction analytics error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create follow-up task
app.post('/api/interactions/follow-up', async (req, res) => {
    try {
        const { contactId, subject, dueDate, notes } = req.body;

        if (!contactId || !subject) {
            return res.status(400).json({ error: 'contactId and subject required' });
        }

        // Create task in HubSpot
        const task = await hubspotRequest('/crm/v3/objects/tasks', {
            method: 'POST',
            body: {
                properties: {
                    hs_task_subject: subject,
                    hs_task_body: notes || '',
                    hs_task_status: 'NOT_STARTED',
                    hs_task_priority: 'MEDIUM',
                    hs_timestamp: Date.now(),
                    hs_task_due_date: dueDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                },
                associations: [{
                    to: { id: contactId },
                    types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 204 }]
                }]
            }
        });

        res.json({
            success: true,
            taskId: task.id,
            message: 'Follow-up erstellt'
        });

    } catch (error) {
        console.error('Follow-up creation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Export interactions
app.get('/api/interactions/export', async (req, res) => {
    try {
        const { contactId, format = 'json' } = req.query;

        if (!contactId) {
            return res.status(400).json({ error: 'contactId required' });
        }

        // Fetch interactions using the existing endpoint logic
        const response = await fetch(`http://127.0.0.1:${PORT}/api/interactions/contact/${contactId}?limit=200`);
        const data = await response.json();

        if (format === 'csv') {
            // Convert to CSV
            const headers = ['Typ', 'Titel', 'Datum', 'Quelle', 'Details'];
            const rows = data.interactions.map(i => [
                i.type,
                i.title?.replace(/"/g, '""') || '',
                new Date(i.timestamp).toLocaleString('de-DE'),
                i.source,
                i.description?.replace(/"/g, '""') || i.outcome || ''
            ]);

            const csv = [
                headers.join(';'),
                ...rows.map(r => r.map(v => `"${v}"`).join(';'))
            ].join('\n');

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="interactions-${contactId}.csv"`);
            res.send('\uFEFF' + csv); // BOM for Excel
        } else {
            res.json(data);
        }

    } catch (error) {
        console.error('Export error:', error);
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
// PIPELINE SUMMARY - For Next.js Dashboard (ACCURATE HUBSPOT DATA)
// ═══════════════════════════════════════════════════════════════

app.get('/api/v1/analytics/pipeline-summary', async (req, res) => {
    try {
        const data = await getHubSpotData();

        // REAL DATA: Calculate actual pipeline stats from HubSpot deals
        let samplePipelineValue = 0;
        let sampleWonValue = 0;
        let sampleWonCount = 0;
        const byStage = {};
        const sampleSize = (data.deals || []).length;

        (data.deals || []).forEach(deal => {
            const amount = parseFloat(deal.properties?.amount) || 0;
            const stage = deal.properties?.dealstage || 'unknown';

            samplePipelineValue += amount;

            // Track by stage (actual values from sample)
            if (!byStage[stage]) {
                byStage[stage] = { count: 0, value: 0 };
            }
            byStage[stage].count++;
            byStage[stage].value += amount;

            // Track won deals from sample
            if (stage === 'closedwon' || stage === 'won') {
                sampleWonValue += amount;
                sampleWonCount++;
            }
        });

        // Fetch ACTUAL total deals count and won deals count from HubSpot
        let actualTotalDeals = data.dealsTotal || 0;
        let actualWonCount = sampleWonCount;
        let actualWonValue = sampleWonValue;

        try {
            // Fetch total deals and won deals in parallel
            // Search for both 'closedwon' and 'won' stages to catch all variations
            const [allDealsRes, wonDealsRes] = await Promise.all([
                hubspotRequest('/crm/v3/objects/deals/search', {
                    method: 'POST',
                    body: {
                        filterGroups: [],
                        properties: ['dealname'],
                        limit: 1
                    }
                }),
                hubspotRequest('/crm/v3/objects/deals/search', {
                    method: 'POST',
                    body: {
                        filterGroups: [
                            { filters: [{ propertyName: 'dealstage', operator: 'EQ', value: 'closedwon' }] },
                            { filters: [{ propertyName: 'dealstage', operator: 'EQ', value: 'won' }] }
                        ],
                        properties: ['dealname', 'amount', 'dealstage'],
                        limit: 100
                    }
                })
            ]);

            // Validate responses - check for HubSpot error responses
            const isValidAllDeals = allDealsRes && typeof allDealsRes.total === 'number' && !allDealsRes.status;
            const isValidWonDeals = wonDealsRes && typeof wonDealsRes.total === 'number' && !wonDealsRes.status;

            // Debug logging
            if (!isValidWonDeals) {
                console.log('[Pipeline] Invalid won response:', JSON.stringify({
                    hasRes: !!wonDealsRes,
                    total: wonDealsRes?.total,
                    totalType: typeof wonDealsRes?.total,
                    status: wonDealsRes?.status,
                    message: wonDealsRes?.message
                }));
            }

            // Get actual total deals count (only use if valid)
            if (isValidAllDeals) {
                actualTotalDeals = allDealsRes.total;
            } else {
                actualTotalDeals = data.dealsTotal || sampleSize;
                console.log('[Pipeline] Using cached/sample total deals:', actualTotalDeals);
            }

            // Get won deals count (only use if valid and has results)
            // API is authoritative when it returns > 0 results
            if (isValidWonDeals && wonDealsRes.total > 0) {
                actualWonCount = wonDealsRes.total;
                let wonSampleSum = 0;
                const wonSampleSize = (wonDealsRes.results || []).length;

                // Sum won deal values from fetched sample
                (wonDealsRes.results || []).forEach(deal => {
                    wonSampleSum += parseFloat(deal.properties?.amount) || 0;
                });

                // Calculate average won deal value and extrapolate to all won deals
                const avgWonDealValue = wonSampleSize > 0 ? wonSampleSum / wonSampleSize : 0;
                actualWonValue = Math.round(avgWonDealValue * actualWonCount);

                // Update byStage with accurate won data
                byStage['closedwon'] = {
                    count: actualWonCount,
                    value: actualWonValue,
                    sample_value: Math.round(wonSampleSum),
                    sample_size: wonSampleSize,
                    avg_deal: Math.round(avgWonDealValue)
                };

                console.log(`[Pipeline] Won from API: ${actualWonCount} deals, avg: €${Math.round(avgWonDealValue)}, total: €${actualWonValue}`);
            } else {
                // Use sample won data but extrapolate based on ratio
                const wonRatio = sampleSize > 0 ? sampleWonCount / sampleSize : 0;
                actualWonCount = Math.round(actualTotalDeals * wonRatio);
                actualWonValue = sampleWonValue > 0 ? Math.round((actualWonCount / sampleWonCount) * sampleWonValue) : 0;
                console.log(`[Pipeline] Won from sample ratio (${(wonRatio * 100).toFixed(2)}%): ${actualWonCount} deals, €${actualWonValue}`);
            }

            console.log(`[Pipeline] Final: Total=${actualTotalDeals}, Won=${actualWonCount}`);
        } catch (e) {
            console.log('[Pipeline] Could not fetch deal counts:', e.message);
            // Fallback: extrapolate from sample ratio
            actualTotalDeals = data.dealsTotal || sampleSize;
            const wonRatio = sampleSize > 0 ? sampleWonCount / sampleSize : 0;
            actualWonCount = Math.round(actualTotalDeals * wonRatio);
            actualWonValue = sampleWonValue > 0 ? Math.round((actualWonCount / sampleWonCount) * sampleWonValue) : 0;
        }

        // Use ACTUAL HubSpot totals (now properly fetched)
        const totalDeals = actualTotalDeals;
        const totalContacts = data.contactsTotal || 0;

        // Calculate average deal value from sample (excluding won deals for pipeline calculation)
        const activeSampleValue = samplePipelineValue - sampleWonValue;
        const activeSampleCount = sampleSize - sampleWonCount;
        const avgActiveDealValue = activeSampleCount > 0 ? Math.round(activeSampleValue / activeSampleCount) : 0;

        // Active pipeline = total deals minus won deals (never negative)
        const activeDeals = Math.max(0, totalDeals - actualWonCount);

        // Calculate pipeline value (extrapolate from active sample average)
        const pipelineValue = activeDeals > 0 ? Math.round(avgActiveDealValue * activeDeals) : activeSampleValue;

        // Calculate win rate as percentage (capped at 100%)
        const winRate = totalDeals > 0 ? Math.min(100, (actualWonCount / totalDeals) * 100).toFixed(2) : 0;

        console.log(`[Pipeline] Total: ${totalDeals}, Won: ${actualWonCount}, Active: ${activeDeals}, AvgActive: €${avgActiveDealValue}, Pipeline: €${pipelineValue}`);

        res.json({
            total_deals: totalDeals,
            total_contacts: totalContacts,
            total_value: Math.round(pipelineValue + actualWonValue),
            pipeline_value: Math.round(pipelineValue),
            won_value: Math.round(actualWonValue),
            won_count: actualWonCount,
            win_rate: parseFloat(winRate),
            avg_deal_value: avgActiveDealValue,
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
// PARTNER MODULE API
// ═══════════════════════════════════════════════════════════════

const samplePartners = [
    { id: 'P001', name: 'TechVision GmbH', type: 'technology', status: 'active', revenue: 125000, commission: 12500, contracts: 3, since: '2023-06-15' },
    { id: 'P002', name: 'Digital Solutions AG', type: 'reseller', status: 'active', revenue: 89000, commission: 8900, contracts: 2, since: '2023-09-01' },
    { id: 'P003', name: 'CloudPartner Systems', type: 'strategic', status: 'active', revenue: 156000, commission: 15600, contracts: 5, since: '2022-12-10' },
    { id: 'P004', name: 'SmartHome Partners', type: 'affiliate', status: 'active', revenue: 45000, commission: 4500, contracts: 1, since: '2024-01-20' },
    { id: 'P005', name: 'Industry4.0 Network', type: 'technology', status: 'pending', revenue: 0, commission: 0, contracts: 0, since: '2024-11-15' },
    { id: 'P006', name: 'PropTech Alliance', type: 'strategic', status: 'active', revenue: 210000, commission: 21000, contracts: 4, since: '2023-03-01' },
    { id: 'P007', name: 'DACH Reseller Group', type: 'reseller', status: 'active', revenue: 178000, commission: 17800, contracts: 6, since: '2022-08-15' },
    { id: 'P008', name: 'Innovation Hub', type: 'affiliate', status: 'inactive', revenue: 34000, commission: 3400, contracts: 1, since: '2023-11-01' }
];

// Partner Stats
app.get('/api/v1/partners/stats', (req, res) => {
    const activePartners = samplePartners.filter(p => p.status === 'active').length;
    const totalRevenue = samplePartners.reduce((sum, p) => sum + p.revenue, 0);
    const pendingContracts = samplePartners.filter(p => p.status === 'pending').length;
    const commissionDue = samplePartners.filter(p => p.status === 'active').reduce((sum, p) => sum + p.commission, 0);
    res.json({ activePartners, totalRevenue, pendingContracts, commissionDue, totalPartners: samplePartners.length });
});

// Partner Contracts (must be before /:id route)
app.get('/api/v1/partners/contracts', (req, res) => {
    const contracts = samplePartners.flatMap(p => {
        const commissionRate = p.revenue > 0 ? Math.round((p.commission / p.revenue) * 100) : 10;
        return Array(p.contracts).fill(null).map((_, i) => ({
            id: `${p.id}-C${i + 1}`, partnerId: p.id, partnerName: p.name, type: p.type,
            status: p.status === 'active' ? 'signed' : 'pending',
            value: Math.round(p.revenue / (p.contracts || 1)),
            commissionRate,
            startDate: p.since
        }));
    });
    res.json({ contracts, total: contracts.length });
});

// Partner Commissions (must be before /:id route)
app.get('/api/v1/partners/commissions', (req, res) => {
    const commissions = samplePartners.filter(p => p.commission > 0).map(p => ({
        partnerId: p.id, partnerName: p.name, totalCommission: p.commission, status: 'pending', period: '2024-Q4'
    }));
    res.json({ commissions, totalDue: commissions.reduce((sum, c) => sum + c.totalCommission, 0) });
});

// List Partners
app.get('/api/v1/partners', (req, res) => {
    const { type, status, search } = req.query;
    let partners = [...samplePartners];
    if (type && type !== 'all') partners = partners.filter(p => p.type === type);
    if (status) partners = partners.filter(p => p.status === status);
    if (search) partners = partners.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    res.json({ partners, total: partners.length, filters: { type, status, search } });
});

// Get Single Partner (must be LAST - catches :id parameter)
app.get('/api/v1/partners/:id', (req, res) => {
    const partner = samplePartners.find(p => p.id === req.params.id);
    if (!partner) return res.status(404).json({ error: 'Partner not found' });
    res.json(partner);
});

// ═══════════════════════════════════════════════════════════════
// AUTO LEAD DISCOVERY - Automatic Lead Generation System
// ═══════════════════════════════════════════════════════════════

let leadDiscoveryState = {
    isRunning: false,
    lastRun: null,
    leadsDiscovered: 0,
    leadsQualified: 0,
    leadsCreated: 0,
    sources: ['linkedin', 'website', 'referral', 'events', 'cold_outreach']
};

// Auto Lead Discovery Status
app.get('/api/v1/lead-discovery/status', (req, res) => {
    res.json({
        is_running: leadDiscoveryState.isRunning,
        last_run: leadDiscoveryState.lastRun,
        stats: {
            discovered: leadDiscoveryState.leadsDiscovered,
            qualified: leadDiscoveryState.leadsQualified,
            created: leadDiscoveryState.leadsCreated
        },
        sources: leadDiscoveryState.sources,
        next_run: leadDiscoveryState.isRunning ? 'In 5 Minuten' : 'Gestoppt'
    });
});

// Start Auto Lead Discovery
app.post('/api/v1/lead-discovery/start', async (req, res) => {
    if (leadDiscoveryState.isRunning) {
        return res.json({ success: true, message: 'Lead Discovery läuft bereits' });
    }

    leadDiscoveryState.isRunning = true;
    leadDiscoveryState.lastRun = new Date().toISOString();

    // Run initial discovery
    await runLeadDiscovery();

    res.json({
        success: true,
        message: 'Auto Lead Discovery gestartet',
        stats: leadDiscoveryState
    });
});

// Stop Auto Lead Discovery
app.post('/api/v1/lead-discovery/stop', (req, res) => {
    leadDiscoveryState.isRunning = false;
    res.json({ success: true, message: 'Auto Lead Discovery gestoppt' });
});

// Manual Lead Discovery Run
app.post('/api/v1/lead-discovery/run', async (req, res) => {
    const results = await runLeadDiscovery();
    res.json(results);
});

// Lead Discovery Engine
async function runLeadDiscovery() {
    console.log('[Lead Discovery] Starting discovery run...');
    leadDiscoveryState.lastRun = new Date().toISOString();

    const discovered = [];
    const sources = ['LinkedIn', 'Website Form', 'Referral', 'Events', 'Cold Outreach'];
    const industries = ['PropTech', 'Smart Home', 'Building Automation', 'Real Estate', 'Industry 4.0'];
    const companies = ['TechCorp', 'SmartLiving', 'PropTech Solutions', 'BuildingTech', 'HomeAutomation',
                       'RealEstate Pro', 'SmartBuilding AG', 'IoT Systems', 'ConnectedHomes', 'FutureProp'];

    // Simulate discovering new leads from various sources
    const numLeads = Math.floor(Math.random() * 10) + 5; // 5-15 new leads

    for (let i = 0; i < numLeads; i++) {
        const source = sources[Math.floor(Math.random() * sources.length)];
        const industry = industries[Math.floor(Math.random() * industries.length)];
        const company = companies[Math.floor(Math.random() * companies.length)];
        const score = Math.floor(Math.random() * 60) + 40; // Score 40-100

        discovered.push({
            id: `LD-${Date.now()}-${i}`,
            name: `Lead ${Math.floor(Math.random() * 1000)}`,
            company: `${company} ${['GmbH', 'AG', 'Inc', 'Ltd'][Math.floor(Math.random() * 4)]}`,
            industry: industry,
            source: source,
            score: score,
            qualified: score >= 70,
            created_at: new Date().toISOString()
        });
    }

    // Update stats
    leadDiscoveryState.leadsDiscovered += discovered.length;
    leadDiscoveryState.leadsQualified += discovered.filter(l => l.qualified).length;

    // Try to create leads in HubSpot
    let createdCount = 0;
    for (const lead of discovered.filter(l => l.qualified)) {
        try {
            await hubspotRequest('/crm/v3/objects/contacts', {
                method: 'POST',
                body: {
                    properties: {
                        firstname: lead.name.split(' ')[0] || 'Auto',
                        lastname: lead.name.split(' ')[1] || 'Lead',
                        company: lead.company,
                        hs_lead_status: lead.score >= 80 ? 'open' : 'in_progress',
                        lifecyclestage: 'lead'
                    }
                }
            });
            createdCount++;
        } catch (e) {
            // Lead might already exist
            console.log(`[Lead Discovery] Could not create lead: ${e.message}`);
        }
    }

    leadDiscoveryState.leadsCreated += createdCount;

    console.log(`[Lead Discovery] Discovered: ${discovered.length}, Qualified: ${discovered.filter(l => l.qualified).length}, Created: ${createdCount}`);

    return {
        success: true,
        discovered: discovered.length,
        qualified: discovered.filter(l => l.qualified).length,
        created: createdCount,
        leads: discovered.slice(0, 10), // Return first 10
        timestamp: new Date().toISOString()
    };
}

// Auto-run Lead Discovery every 5 minutes if enabled
setInterval(async () => {
    if (leadDiscoveryState.isRunning) {
        await runLeadDiscovery();
    }
}, 5 * 60 * 1000);

// Get Recent Discovered Leads
app.get('/api/v1/lead-discovery/recent', async (req, res) => {
    try {
        // Get recently created contacts from HubSpot
        const recentContacts = await hubspotRequest('/crm/v3/objects/contacts/search', {
            method: 'POST',
            body: {
                filterGroups: [],
                sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
                properties: ['firstname', 'lastname', 'company', 'email', 'hs_lead_status', 'createdate'],
                limit: 20
            }
        });

        const leads = (recentContacts.results || []).map(c => ({
            id: c.id,
            name: `${c.properties?.firstname || ''} ${c.properties?.lastname || ''}`.trim() || 'Unbekannt',
            company: c.properties?.company || '',
            email: c.properties?.email || '',
            status: c.properties?.hs_lead_status || 'new',
            created: c.properties?.createdate
        }));

        res.json({
            total: recentContacts.total || leads.length,
            leads: leads,
            discovery_stats: {
                discovered: leadDiscoveryState.leadsDiscovered,
                qualified: leadDiscoveryState.leadsQualified,
                created: leadDiscoveryState.leadsCreated
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// LEAD DISCOVERY - FREE INTERNATIONAL DATABASES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Search leads from free international databases
 * Sources: OpenCorporates, Wikipedia, domain lookups
 */
app.get('/api/v1/lead-discovery/search', async (req, res) => {
    try {
        const { company, industry, location, country, limit = 20 } = req.query;

        if (!company && !industry && !location) {
            return res.json({ leads: [], message: 'Please provide search criteria' });
        }

        const allLeads = [];
        const errors = [];

        // 1. OpenCorporates API (Free worldwide company registry)
        if (company || location) {
            try {
                const ocQuery = encodeURIComponent(company || '');
                const jurisdiction = getOpenCorporatesJurisdiction(location || country);
                let ocUrl = `https://api.opencorporates.com/v0.4/companies/search?q=${ocQuery}&per_page=${Math.min(limit, 30)}`;
                if (jurisdiction) {
                    ocUrl += `&jurisdiction_code=${jurisdiction}`;
                }

                const ocResponse = await fetch(ocUrl, {
                    headers: { 'Accept': 'application/json' },
                    timeout: 10000
                });

                if (ocResponse.ok) {
                    const ocData = await ocResponse.json();
                    const companies = ocData.results?.companies || [];

                    companies.forEach(item => {
                        const c = item.company;
                        allLeads.push({
                            id: `oc-${c.company_number}`,
                            name: c.name,
                            company: c.name,
                            industry: c.industry_codes?.[0]?.description || detectIndustry(c.name),
                            location: `${c.registered_address?.locality || ''}, ${c.jurisdiction_code?.toUpperCase() || ''}`.trim(),
                            country: c.jurisdiction_code?.toUpperCase(),
                            status: c.current_status || 'active',
                            source: 'OpenCorporates',
                            sourceUrl: c.opencorporates_url,
                            registrationDate: c.incorporation_date,
                            address: formatAddress(c.registered_address),
                            score: calculateLeadScore(c)
                        });
                    });
                    console.log(`[LeadDiscovery] OpenCorporates: ${companies.length} found`);
                }
            } catch (err) {
                errors.push({ source: 'OpenCorporates', error: err.message });
            }
        }

        // 2. Wikidata API (Free worldwide company info)
        if (company && allLeads.length < limit) {
            try {
                const sparqlQuery = `
                    SELECT ?company ?companyLabel ?countryLabel ?industryLabel ?website ?founded WHERE {
                        ?company wdt:P31/wdt:P279* wd:Q4830453.
                        ?company rdfs:label ?label.
                        FILTER(CONTAINS(LCASE(?label), LCASE("${company.replace(/"/g, '')}")))
                        FILTER(LANG(?label) = "en" || LANG(?label) = "de")
                        OPTIONAL { ?company wdt:P17 ?country. }
                        OPTIONAL { ?company wdt:P452 ?industry. }
                        OPTIONAL { ?company wdt:P856 ?website. }
                        OPTIONAL { ?company wdt:P571 ?founded. }
                        SERVICE wikibase:label { bd:serviceParam wikibase:language "en,de". }
                    }
                    LIMIT 10
                `;

                const wdResponse = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}`, {
                    headers: { 'Accept': 'application/sparql-results+json' },
                    timeout: 15000
                });

                if (wdResponse.ok) {
                    const wdData = await wdResponse.json();
                    const results = wdData.results?.bindings || [];

                    results.forEach(item => {
                        const companyName = item.companyLabel?.value;
                        if (companyName && !allLeads.find(l => l.name.toLowerCase() === companyName.toLowerCase())) {
                            allLeads.push({
                                id: `wd-${item.company?.value?.split('/').pop()}`,
                                name: companyName,
                                company: companyName,
                                industry: item.industryLabel?.value || detectIndustry(companyName),
                                location: item.countryLabel?.value || '',
                                country: item.countryLabel?.value,
                                website: item.website?.value,
                                founded: item.founded?.value?.substring(0, 4),
                                source: 'Wikidata',
                                sourceUrl: item.company?.value,
                                score: 70
                            });
                        }
                    });
                    console.log(`[LeadDiscovery] Wikidata: ${results.length} found`);
                }
            } catch (err) {
                errors.push({ source: 'Wikidata', error: err.message });
            }
        }

        // 3. EU Open Data Portal (EU companies)
        if ((location?.toLowerCase().includes('eu') || !location) && allLeads.length < limit) {
            try {
                const euQuery = company || industry || '';
                const euResponse = await fetch(
                    `https://data.europa.eu/api/hub/search/search?q=${encodeURIComponent(euQuery)}&limit=10&filter=dataset`,
                    { timeout: 10000 }
                );

                if (euResponse.ok) {
                    const euData = await euResponse.json();
                    // Process EU data if available
                    console.log(`[LeadDiscovery] EU Portal: ${euData.result?.count || 0} datasets`);
                }
            } catch (err) {
                // EU portal is supplementary, don't log error
            }
        }

        // 4. German Handelsregister (for DE companies)
        if (location?.toLowerCase().includes('german') || location?.toLowerCase().includes('de') ||
            country?.toLowerCase() === 'de') {
            // Note: Common register API would go here
            // Using mock data for German companies until API key is configured
        }

        // Sort by score and deduplicate
        const uniqueLeads = [];
        const seenNames = new Set();

        allLeads
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .forEach(lead => {
                const key = lead.name.toLowerCase().trim();
                if (!seenNames.has(key)) {
                    seenNames.add(key);
                    uniqueLeads.push(lead);
                }
            });

        res.json({
            leads: uniqueLeads.slice(0, parseInt(limit)),
            total: uniqueLeads.length,
            sources: ['OpenCorporates', 'Wikidata', 'EU Open Data'],
            errors: errors.length > 0 ? errors : undefined,
            searchCriteria: { company, industry, location, country }
        });

    } catch (error) {
        console.error('[LeadDiscovery] Search error:', error);
        res.status(500).json({ error: error.message, leads: [] });
    }
});

// Helper: Map location to OpenCorporates jurisdiction code
function getOpenCorporatesJurisdiction(location) {
    if (!location) return null;
    const loc = location.toLowerCase();
    const jurisdictions = {
        'germany': 'de', 'deutschland': 'de', 'de': 'de', 'berlin': 'de', 'munich': 'de', 'münchen': 'de',
        'usa': 'us', 'us': 'us', 'united states': 'us', 'america': 'us', 'new york': 'us_ny', 'california': 'us_ca',
        'uk': 'gb', 'united kingdom': 'gb', 'england': 'gb', 'london': 'gb', 'britain': 'gb',
        'france': 'fr', 'paris': 'fr', 'fr': 'fr',
        'spain': 'es', 'madrid': 'es', 'es': 'es',
        'italy': 'it', 'milan': 'it', 'rome': 'it', 'it': 'it',
        'netherlands': 'nl', 'holland': 'nl', 'amsterdam': 'nl', 'nl': 'nl',
        'switzerland': 'ch', 'zurich': 'ch', 'ch': 'ch',
        'austria': 'at', 'vienna': 'at', 'wien': 'at', 'at': 'at',
        'canada': 'ca', 'toronto': 'ca', 'ca': 'ca',
        'australia': 'au', 'sydney': 'au', 'au': 'au',
        'japan': 'jp', 'tokyo': 'jp', 'jp': 'jp',
        'china': 'cn', 'beijing': 'cn', 'shanghai': 'cn', 'cn': 'cn',
        'india': 'in', 'mumbai': 'in', 'delhi': 'in', 'in': 'in',
        'brazil': 'br', 'br': 'br',
        'singapore': 'sg', 'sg': 'sg',
        'hong kong': 'hk', 'hk': 'hk'
    };
    for (const [key, code] of Object.entries(jurisdictions)) {
        if (loc.includes(key)) return code;
    }
    return null;
}

// Helper: Detect industry from company name
function detectIndustry(name) {
    if (!name) return 'Unknown';
    const n = name.toLowerCase();
    const industries = {
        'Technology': ['tech', 'software', 'digital', 'it ', 'data', 'ai', 'cloud', 'cyber', 'app', 'web'],
        'Finance': ['bank', 'finance', 'fintech', 'capital', 'invest', 'asset', 'insurance', 'credit'],
        'Healthcare': ['health', 'medical', 'pharma', 'biotech', 'clinic', 'hospital', 'care'],
        'Manufacturing': ['manufacturing', 'industrial', 'machinery', 'automotive', 'produktion'],
        'Retail': ['retail', 'commerce', 'shop', 'store', 'market', 'trade', 'handel'],
        'Real Estate': ['real estate', 'property', 'immobilien', 'housing', 'bau', 'construction'],
        'Energy': ['energy', 'power', 'solar', 'wind', 'oil', 'gas', 'energie'],
        'Consulting': ['consulting', 'advisory', 'beratung', 'strategy', 'management'],
        'Media': ['media', 'entertainment', 'publishing', 'broadcast', 'content'],
        'Logistics': ['logistics', 'transport', 'shipping', 'freight', 'supply chain']
    };
    for (const [industry, keywords] of Object.entries(industries)) {
        if (keywords.some(k => n.includes(k))) return industry;
    }
    return 'Business Services';
}

// Helper: Format address
function formatAddress(addr) {
    if (!addr) return '';
    return [addr.street_address, addr.locality, addr.postal_code, addr.country]
        .filter(Boolean)
        .join(', ');
}

// Helper: Calculate lead score
function calculateLeadScore(company) {
    let score = 50;
    if (company.current_status === 'active') score += 20;
    if (company.registered_address?.locality) score += 10;
    if (company.industry_codes?.length) score += 10;
    if (company.incorporation_date) score += 5;
    if (company.agent_name) score += 5;
    return Math.min(score, 100);
}

// Get Active Deals for Pipeline Display
app.get('/api/v1/deals/active', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;

        // Get active deals (not closed won or lost)
        const activeDeals = await hubspotRequest('/crm/v3/objects/deals/search', {
            method: 'POST',
            body: {
                filterGroups: [{
                    filters: [{
                        propertyName: 'dealstage',
                        operator: 'NOT_IN',
                        values: ['closedwon', 'closedlost']
                    }]
                }],
                sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
                properties: ['dealname', 'amount', 'dealstage', 'closedate', 'createdate', 'hubspot_owner_id'],
                limit: limit
            }
        });

        const deals = (activeDeals.results || []).map(d => ({
            id: d.id,
            name: d.properties?.dealname || 'Unbekannt',
            amount: parseFloat(d.properties?.amount) || 0,
            stage: d.properties?.dealstage || 'unknown',
            closedate: d.properties?.closedate,
            created: d.properties?.createdate
        }));

        res.json({
            total: activeDeals.total || deals.length,
            deals: deals
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
            bots_busy: 5,
            bots_total: 42,
            uptime_seconds: uptimeSeconds,
            metrics: {
                tasks_completed: matrixState.tasksCompleted + 15420,
                tasks_failed: matrixState.tasksFailed + 12,
                tasks_submitted: matrixState.tasksSubmitted + 847,
                avg_processing_time_ms: 245
            },
            broly_status: {
                mode: "LEGENDARY_SUPER_SAIYAN",
                power_level: "∞",
                is_fallback_active: true
            }
        }
    });
});

// Matrix Bots (alias for Next.js Sci-Fi Dashboard)
app.get('/api/v1/matrix/bots', (req, res) => {
    res.json({
        data: [
            { bot_id: "broly", name: "BROLY", role: "Legendary Fallback", power_level: Infinity, model: "legendary", is_active: true, is_available: true, current_tasks: 0, tasks_completed: 9999, is_fallback: true },
            { bot_id: "orion", name: "Orion", role: "Research & Analysis", power_level: 9500000, model: "gpt-4o", is_active: true, is_available: true, current_tasks: 2, tasks_completed: 1250, is_fallback: false },
            { bot_id: "atlas", name: "Atlas", role: "Data Management", power_level: 9200000, model: "gpt-4o", is_active: true, is_available: true, current_tasks: 1, tasks_completed: 890, is_fallback: false },
            { bot_id: "phoenix", name: "Phoenix", role: "Recovery & Optimization", power_level: 8800000, model: "gpt-4o", is_active: true, is_available: false, current_tasks: 3, tasks_completed: 720, is_fallback: false },
            { bot_id: "sentinel", name: "Sentinel", role: "Monitoring & Alerts", power_level: 8500000, model: "claude-3.5", is_active: true, is_available: true, current_tasks: 0, tasks_completed: 4500, is_fallback: false },
            { bot_id: "herald", name: "Herald", role: "Communication", power_level: 8200000, model: "claude-3.5", is_active: true, is_available: true, current_tasks: 1, tasks_completed: 2100, is_fallback: false },
            { bot_id: "prometheus", name: "Prometheus", role: "Forecasting", power_level: 8000000, model: "gpt-4o", is_active: true, is_available: true, current_tasks: 0, tasks_completed: 560, is_fallback: false },
            { bot_id: "athena", name: "Athena", role: "Strategy", power_level: 7800000, model: "claude-3.5", is_active: true, is_available: true, current_tasks: 0, tasks_completed: 340, is_fallback: false }
        ],
        total: 42,
        online: 38,
        busy: 4
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
// GENIUS AGENCY AI - Claude-Powered Bot Interactions
// ═══════════════════════════════════════════════════════════════

// Get all AI bots
app.get('/api/v1/genius/ai-bots', (req, res) => {
    if (!geniusBots) {
        return res.status(503).json({ error: 'AI Bot Service not available' });
    }
    res.json({
        bots: geniusBots.getAvailableBots(),
        godMode: {
            name: geniusBots.HAIKU_GOD_MODE.name,
            role: geniusBots.HAIKU_GOD_MODE.role,
            emoji: geniusBots.HAIKU_GOD_MODE.emoji
        }
    });
});

// Get specific bot info
app.get('/api/v1/genius/ai-bots/:botId', (req, res) => {
    if (!geniusBots) {
        return res.status(503).json({ error: 'AI Bot Service not available' });
    }
    const bot = geniusBots.getBot(req.params.botId);
    if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
    }
    res.json(bot);
});

// Chat with a specific bot
app.post('/api/v1/genius/chat/:botId', async (req, res) => {
    if (!geniusBots) {
        return res.status(503).json({ error: 'AI Bot Service not available' });
    }

    const { message, history } = req.body;
    const { botId } = req.params;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        const response = await geniusBots.chatWithBot(botId, message, history || []);
        res.json(response);
    } catch (error) {
        console.error('Bot chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Chat with God Mode (coordinates all bots)
app.post('/api/v1/genius/godmode', async (req, res) => {
    if (!geniusBots) {
        return res.status(503).json({ error: 'AI Bot Service not available' });
    }

    const { message, history } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        const response = await geniusBots.chatWithGodMode(message, history || []);
        res.json(response);
    } catch (error) {
        console.error('God Mode error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Execute a task (God Mode assigns best bot)
app.post('/api/v1/genius/execute', async (req, res) => {
    if (!geniusBots) {
        return res.status(503).json({ error: 'AI Bot Service not available' });
    }

    const { task, context } = req.body;

    if (!task) {
        return res.status(400).json({ error: 'Task is required' });
    }

    try {
        const result = await geniusBots.executeTask(task, context || {});
        res.json(result);
    } catch (error) {
        console.error('Task execution error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// USER MANAGEMENT - Authentication & Authorization
// ═══════════════════════════════════════════════════════════════

// Register new user
app.post('/api/v1/auth/register', async (req, res) => {
    if (!userService) {
        return res.status(503).json({ error: 'User service not available' });
    }

    const { email, password, firstName, lastName, company } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const user = await userService.createUser({
            email,
            password,
            firstName,
            lastName,
            company,
            role: 'user' // Default role for new users (matching DB constraint)
        });
        res.status(201).json({ message: 'User created successfully', user });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Login
app.post('/api/v1/auth/login', async (req, res) => {
    if (!userService) {
        return res.status(503).json({ error: 'User service not available' });
    }

    const { email, password, totpToken } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const result = await userService.loginUser(
            email,
            password,
            req.ip,
            req.headers['user-agent']
        );

        // Check if 2FA is enabled for this user
        if (twoFactorAuth) {
            const twoFAStatus = await twoFactorAuth.get2FAStatus(result.user.id);

            if (twoFAStatus.enabled) {
                // 2FA is enabled - need to verify TOTP token
                if (!totpToken) {
                    // Return requires2FA flag instead of token
                    return res.json({
                        requires2FA: true,
                        userId: result.user.id,
                        user: {
                            email: result.user.email,
                            firstName: result.user.firstName
                        }
                    });
                }

                // Verify the TOTP token
                const verifyResult = await twoFactorAuth.verify2FAForLogin(result.user.id, totpToken);

                if (!verifyResult.success) {
                    return res.status(401).json({ error: 'Ungültiger 2FA-Code' });
                }

                // 2FA verified - return full token
                console.log(`[2FA] Login verified for user ${result.user.id} via ${verifyResult.method}`);
            }
        }

        res.json(result);
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ error: error.message });
    }
});

// Logout
app.post('/api/v1/auth/logout', async (req, res) => {
    if (!userService) {
        return res.status(503).json({ error: 'User service not available' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.json({ message: 'Logged out' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = userService.verifyToken(token);

    if (decoded) {
        await userService.logoutUser(decoded.userId, token);
    }

    res.json({ message: 'Logged out successfully' });
});

// Verify token
app.get('/api/v1/auth/verify', async (req, res) => {
    if (!userService) {
        return res.status(503).json({ valid: false, error: 'User service not available' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.json({ valid: false });
    }

    const token = authHeader.split(' ')[1];
    const decoded = userService.verifyToken(token);

    if (!decoded) {
        return res.json({ valid: false });
    }

    try {
        const user = await userService.getUserById(decoded.userId);
        if (!user || !user.isActive) {
            return res.json({ valid: false });
        }
        res.json({ valid: true, user });
    } catch (error) {
        res.json({ valid: false });
    }
});

// Get current user
app.get('/api/v1/auth/me', async (req, res) => {
    if (!userService) {
        return res.status(503).json({ error: 'User service not available' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = userService.verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await userService.getUserById(decoded.userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
});

// Update profile
app.patch('/api/v1/auth/profile', async (req, res) => {
    if (!userService) {
        return res.status(503).json({ error: 'User service not available' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = userService.verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    try {
        const updated = await userService.updateUser(decoded.userId, req.body);
        res.json({ message: 'Profile updated', user: updated });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Change password
app.post('/api/v1/auth/change-password', async (req, res) => {
    if (!userService) {
        return res.status(503).json({ error: 'User service not available' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = userService.verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    const { currentPassword, newPassword } = req.body;

    try {
        await userService.changePassword(decoded.userId, currentPassword, newPassword);
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// TWO-FACTOR AUTHENTICATION (2FA) ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Get 2FA status for current user
app.get('/api/v1/auth/2fa/status', async (req, res) => {
    if (!twoFactorAuth || !userService) {
        return res.status(503).json({ error: '2FA service not available' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = userService.verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    try {
        const status = await twoFactorAuth.get2FAStatus(decoded.userId);
        const required = await twoFactorAuth.is2FASetupRequired(decoded.userId);
        res.json({
            enabled: status.enabled,
            enabledAt: status.enabledAt,
            setupRequired: required
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Setup 2FA - Generate secret and QR code
app.post('/api/v1/auth/2fa/setup', async (req, res) => {
    if (!twoFactorAuth || !userService) {
        return res.status(503).json({ error: '2FA service not available' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = userService.verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    try {
        // Check if 2FA is already enabled
        const status = await twoFactorAuth.get2FAStatus(decoded.userId);
        if (status.enabled) {
            return res.status(400).json({ error: '2FA is already enabled' });
        }

        // Generate new secret
        const setup = await twoFactorAuth.generateSecret(decoded.email);

        // Store setup temporarily (user must verify before it's enabled)
        // We store the secret in a temporary way - it's not active until verified
        res.json({
            secret: setup.secret,
            qrCode: setup.qrCodeDataUrl,
            backupCodes: setup.backupCodes,
            message: 'Scan QR code with your authenticator app, then verify with a code'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verify and enable 2FA
app.post('/api/v1/auth/2fa/verify-setup', async (req, res) => {
    if (!twoFactorAuth || !userService) {
        return res.status(503).json({ error: '2FA service not available' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = userService.verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    const { secret, code, backupCodes } = req.body;

    if (!secret || !code) {
        return res.status(400).json({ error: 'Secret and verification code are required' });
    }

    try {
        // Verify the code matches the secret
        const isValid = twoFactorAuth.verifyToken(code, secret);

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        // Enable 2FA for the user
        await twoFactorAuth.enable2FA(decoded.userId, secret, backupCodes || []);

        res.json({
            success: true,
            message: '2FA has been enabled successfully',
            backupCodesCount: backupCodes ? backupCodes.length : 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verify 2FA during login (called after password verification)
app.post('/api/v1/auth/2fa/verify', async (req, res) => {
    if (!twoFactorAuth) {
        return res.status(503).json({ error: '2FA service not available' });
    }

    const { userId, code, tempToken } = req.body;

    if (!userId || !code) {
        return res.status(400).json({ error: 'User ID and code are required' });
    }

    try {
        const result = await twoFactorAuth.verify2FAForLogin(userId, code);

        if (!result.success) {
            return res.status(401).json({ error: result.error || 'Invalid 2FA code' });
        }

        // Generate full JWT token after successful 2FA
        if (userService) {
            const user = await userService.getUserById(userId);
            const fullToken = require('jsonwebtoken').sign(
                { userId: user.id, email: user.email, role: user.role, twoFactorVerified: true },
                process.env.JWT_SECRET || 'enterprise-universe-secret-key-2026',
                { expiresIn: '7d' }
            );

            res.json({
                success: true,
                method: result.method,
                token: fullToken,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role
                },
                remainingBackupCodes: result.remainingBackupCodes
            });
        } else {
            res.json({ success: true, method: result.method });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Disable 2FA
app.post('/api/v1/auth/2fa/disable', async (req, res) => {
    if (!twoFactorAuth || !userService) {
        return res.status(503).json({ error: '2FA service not available' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = userService.verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    const { password, code } = req.body;

    if (!password || !code) {
        return res.status(400).json({ error: 'Password and 2FA code are required' });
    }

    try {
        // Verify password first
        const user = await userService.getUserById(decoded.userId);
        // Re-authenticate to ensure the user owns this account
        await userService.loginUser(user.email, password, req.ip, req.headers['user-agent']);

        // Verify 2FA code
        const result = await twoFactorAuth.verify2FAForLogin(decoded.userId, code);
        if (!result.success) {
            return res.status(401).json({ error: 'Invalid 2FA code' });
        }

        // Disable 2FA
        await twoFactorAuth.disable2FA(decoded.userId);

        res.json({ success: true, message: '2FA has been disabled' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Regenerate backup codes
app.post('/api/v1/auth/2fa/regenerate-backup-codes', async (req, res) => {
    if (!twoFactorAuth || !userService) {
        return res.status(503).json({ error: '2FA service not available' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = userService.verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: '2FA code is required' });
    }

    try {
        // Verify 2FA code first
        const verifyResult = await twoFactorAuth.verify2FAForLogin(decoded.userId, code);
        if (!verifyResult.success) {
            return res.status(401).json({ error: 'Invalid 2FA code' });
        }

        // Generate new backup codes
        const newCodes = await twoFactorAuth.regenerateBackupCodes(decoded.userId);

        res.json({
            success: true,
            backupCodes: newCodes,
            message: 'New backup codes generated. Save them securely!'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all users (admin only)
app.get('/api/v1/users', async (req, res) => {
    if (!userService) {
        return res.status(503).json({ error: 'User service not available' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = userService.verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await userService.getUserById(decoded.userId);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const { limit = 100, offset = 0 } = req.query;
    const result = await userService.getAllUsers(parseInt(limit), parseInt(offset));
    res.json(result);
});

// Update user role (admin only)
app.patch('/api/v1/users/:userId/role', async (req, res) => {
    if (!userService) {
        return res.status(503).json({ error: 'User service not available' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = userService.verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    const admin = await userService.getUserById(decoded.userId);
    if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const { role } = req.body;

    try {
        await userService.updateUserRole(req.params.userId, role, decoded.userId);
        res.json({ message: 'Role updated successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Deactivate user (admin only)
app.delete('/api/v1/users/:userId', async (req, res) => {
    if (!userService) {
        return res.status(503).json({ error: 'User service not available' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = userService.verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    const admin = await userService.getUserById(decoded.userId);
    if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    try {
        await userService.deactivateUser(req.params.userId, decoded.userId);
        res.json({ message: 'User deactivated successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// EMAIL TEMPLATES & SEQUENCES
// ═══════════════════════════════════════════════════════════════

// Get all email templates
app.get('/api/v1/email/templates', async (req, res) => {
    if (!emailService) {
        return res.status(503).json({ error: 'Email service not available' });
    }
    try {
        const templates = await emailService.getTemplates(req.query.activeOnly === 'true');
        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get merge tags
app.get('/api/v1/email/merge-tags', (req, res) => {
    if (!emailService) {
        return res.status(503).json({ error: 'Email service not available' });
    }
    res.json(emailService.getMergeTags());
});

// Get single template
app.get('/api/v1/email/templates/:id', async (req, res) => {
    if (!emailService) {
        return res.status(503).json({ error: 'Email service not available' });
    }
    try {
        const template = await emailService.getTemplateById(req.params.id);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        res.json(template);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create template
app.post('/api/v1/email/templates', async (req, res) => {
    if (!emailService) {
        return res.status(503).json({ error: 'Email service not available' });
    }
    try {
        const template = await emailService.createTemplate(req.body);
        res.status(201).json(template);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update template
app.patch('/api/v1/email/templates/:id', async (req, res) => {
    if (!emailService) {
        return res.status(503).json({ error: 'Email service not available' });
    }
    try {
        const template = await emailService.updateTemplate(req.params.id, req.body);
        res.json(template);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete template
app.delete('/api/v1/email/templates/:id', async (req, res) => {
    if (!emailService) {
        return res.status(503).json({ error: 'Email service not available' });
    }
    try {
        await emailService.deleteTemplate(req.params.id);
        res.json({ message: 'Template deleted' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Send email using template
app.post('/api/v1/email/send', async (req, res) => {
    if (!emailService) {
        return res.status(503).json({ error: 'Email service not available' });
    }
    const { templateId, recipient, data } = req.body;
    if (!templateId || !recipient) {
        return res.status(400).json({ error: 'templateId and recipient are required' });
    }
    try {
        const result = await emailService.sendTemplateEmail(templateId, recipient, data || {});
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send bulk emails
app.post('/api/v1/email/send-bulk', async (req, res) => {
    if (!emailService) {
        return res.status(503).json({ error: 'Email service not available' });
    }
    const { templateId, recipients, commonData } = req.body;
    if (!templateId || !recipients || !Array.isArray(recipients)) {
        return res.status(400).json({ error: 'templateId and recipients array are required' });
    }
    try {
        const result = await emailService.sendBulkEmails(templateId, recipients, commonData || {});
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get email statistics
app.get('/api/v1/email/stats', async (req, res) => {
    if (!emailService) {
        return res.status(503).json({ error: 'Email service not available' });
    }
    try {
        const stats = await emailService.getEmailStats(parseInt(req.query.days) || 30);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get recent emails
app.get('/api/v1/email/recent', async (req, res) => {
    if (!emailService) {
        return res.status(503).json({ error: 'Email service not available' });
    }
    try {
        const emails = await emailService.getRecentEmails(parseInt(req.query.limit) || 50);
        res.json(emails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// === Email Sequences ===

// Get all sequences
app.get('/api/v1/email/sequences', async (req, res) => {
    if (!emailService) {
        return res.status(503).json({ error: 'Email service not available' });
    }
    try {
        const sequences = await emailService.getSequences();
        res.json(sequences);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get sequence with steps
app.get('/api/v1/email/sequences/:id', async (req, res) => {
    if (!emailService) {
        return res.status(503).json({ error: 'Email service not available' });
    }
    try {
        const sequence = await emailService.getSequenceById(req.params.id);
        if (!sequence) {
            return res.status(404).json({ error: 'Sequence not found' });
        }
        res.json(sequence);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create sequence
app.post('/api/v1/email/sequences', async (req, res) => {
    if (!emailService) {
        return res.status(503).json({ error: 'Email service not available' });
    }
    try {
        const sequence = await emailService.createSequence(req.body);
        res.status(201).json(sequence);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Add step to sequence
app.post('/api/v1/email/sequences/:id/steps', async (req, res) => {
    if (!emailService) {
        return res.status(503).json({ error: 'Email service not available' });
    }
    try {
        const step = await emailService.addSequenceStep(req.params.id, req.body);
        res.status(201).json(step);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Enroll contact in sequence
app.post('/api/v1/email/sequences/:id/enroll', async (req, res) => {
    if (!emailService) {
        return res.status(503).json({ error: 'Email service not available' });
    }
    const { email, contactData } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    try {
        const enrollment = await emailService.enrollInSequence(req.params.id, email, contactData || {});
        res.status(201).json(enrollment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// DUPLICATE DEMON - Automatische Duplikat-Erkennung & Prävention
// ═══════════════════════════════════════════════════════════════

const duplicateDemonState = {
    isRunning: false,
    lastRun: null,
    duplicatesFound: 0,
    duplicatesMerged: 0,
    preventionEnabled: true
};

// Cache für schnelle Duplikat-Prüfung
const dealNameCache = new Map();
const contactEmailCache = new Map();

// Duplikat-Erkennung Funktion
function extractDealIdentifier(dealName) {
    // Extrahiere eindeutige ID aus Deal-Namen (z.B. #MK1QHJIKA43I)
    const idMatch = dealName.match(/#([A-Z0-9]+)$/i);
    if (idMatch) return idMatch[1];

    // Fallback: Firmenname extrahieren
    const companyMatch = dealName.match(/(?:\[.*?\]\s*)?(?:.*?-\s*)?(.+?)(?:\s*#|$)/);
    return companyMatch ? companyMatch[1].trim().toLowerCase() : dealName.toLowerCase();
}

function normalizeCompanyName(name) {
    return name
        .toLowerCase()
        .replace(/\s*(gmbh|ag|ltd|inc|corp|kg|ohg|ug|se|sa|bv|nv)\s*/gi, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

// Duplikat-Check für neue Deals
async function checkDealDuplicate(dealName, amount) {
    const identifier = extractDealIdentifier(dealName);
    const normalizedName = normalizeCompanyName(dealName);

    // Check Cache
    if (dealNameCache.has(identifier)) {
        return { isDuplicate: true, existingDealId: dealNameCache.get(identifier), matchType: 'exact_id' };
    }

    // Check HubSpot für ähnliche Deals
    try {
        const searchBody = {
            filterGroups: [{
                filters: [{
                    propertyName: 'dealname',
                    operator: 'CONTAINS_TOKEN',
                    value: identifier.length > 5 ? identifier : normalizedName.substring(0, 20)
                }]
            }],
            properties: ['dealname', 'amount', 'dealstage'],
            limit: 10
        };

        const results = await hubspotRequest('/crm/v3/objects/deals/search', {
            method: 'POST',
            body: searchBody
        });

        if (results.results && results.results.length > 0) {
            for (const existingDeal of results.results) {
                const existingId = extractDealIdentifier(existingDeal.properties.dealname || '');
                const existingNormalized = normalizeCompanyName(existingDeal.properties.dealname || '');

                // Exakte ID-Übereinstimmung
                if (existingId === identifier && identifier.length > 3) {
                    dealNameCache.set(identifier, existingDeal.id);
                    return { isDuplicate: true, existingDealId: existingDeal.id, matchType: 'exact_id', existingDeal };
                }

                // Firmenname ähnlich + ähnlicher Betrag
                if (existingNormalized === normalizedName) {
                    const existingAmount = parseFloat(existingDeal.properties.amount) || 0;
                    const newAmount = parseFloat(amount) || 0;
                    const amountDiff = Math.abs(existingAmount - newAmount) / Math.max(existingAmount, newAmount, 1);

                    if (amountDiff < 0.1) { // Weniger als 10% Unterschied
                        return { isDuplicate: true, existingDealId: existingDeal.id, matchType: 'similar_company_amount', existingDeal };
                    }
                }
            }
        }
    } catch (error) {
        console.error('[Duplicate Demon] Search error:', error.message);
    }

    return { isDuplicate: false };
}

// Duplikat-Check für Kontakte
async function checkContactDuplicate(email) {
    if (!email) return { isDuplicate: false };

    const normalizedEmail = email.toLowerCase().trim();

    // Check Cache
    if (contactEmailCache.has(normalizedEmail)) {
        return { isDuplicate: true, existingContactId: contactEmailCache.get(normalizedEmail) };
    }

    try {
        const searchBody = {
            filterGroups: [{
                filters: [{
                    propertyName: 'email',
                    operator: 'EQ',
                    value: normalizedEmail
                }]
            }],
            properties: ['email', 'firstname', 'lastname', 'company'],
            limit: 1
        };

        const results = await hubspotRequest('/crm/v3/objects/contacts/search', {
            method: 'POST',
            body: searchBody
        });

        if (results.results && results.results.length > 0) {
            const existingContact = results.results[0];
            contactEmailCache.set(normalizedEmail, existingContact.id);
            return { isDuplicate: true, existingContactId: existingContact.id, existingContact };
        }
    } catch (error) {
        console.error('[Duplicate Demon] Contact search error:', error.message);
    }

    return { isDuplicate: false };
}

// Duplikat-Scan für bestehende Deals
async function scanForDuplicates(limit = 100) {
    console.log('[Duplicate Demon] Scanning for duplicates...');

    const duplicates = [];
    const dealGroups = new Map();

    try {
        const dealsData = await hubspotRequest(`/crm/v3/objects/deals?limit=${limit}&properties=dealname,amount,dealstage,createdate`);
        const deals = dealsData.results || [];

        // Gruppiere nach normalisiertem Firmennamen
        for (const deal of deals) {
            const normalizedName = normalizeCompanyName(deal.properties?.dealname || '');
            if (!dealGroups.has(normalizedName)) {
                dealGroups.set(normalizedName, []);
            }
            dealGroups.get(normalizedName).push(deal);
        }

        // Finde Gruppen mit mehr als einem Deal
        for (const [name, group] of dealGroups) {
            if (group.length > 1) {
                duplicates.push({
                    normalizedName: name,
                    count: group.length,
                    deals: group.map(d => ({
                        id: d.id,
                        name: d.properties?.dealname,
                        amount: d.properties?.amount,
                        stage: d.properties?.dealstage,
                        created: d.properties?.createdate
                    }))
                });
            }
        }

        duplicateDemonState.duplicatesFound = duplicates.reduce((sum, g) => sum + g.count - 1, 0);

    } catch (error) {
        console.error('[Duplicate Demon] Scan error:', error.message);
    }

    return duplicates;
}

// Duplikate zusammenführen
async function mergeDuplicates(duplicateGroup, keepNewest = true) {
    const deals = duplicateGroup.deals;
    if (deals.length < 2) return { success: false, reason: 'Not enough deals to merge' };

    // Sortiere nach Erstellungsdatum
    deals.sort((a, b) => new Date(b.created) - new Date(a.created));

    const keepDeal = keepNewest ? deals[0] : deals[deals.length - 1];
    const deleteDealIds = deals.filter(d => d.id !== keepDeal.id).map(d => d.id);

    console.log(`[Duplicate Demon] Keeping deal ${keepDeal.id}, archiving ${deleteDealIds.length} duplicates`);

    const archived = [];
    for (const dealId of deleteDealIds) {
        try {
            await hubspotRequest(`/crm/v3/objects/deals/${dealId}`, {
                method: 'DELETE'
            });
            archived.push(dealId);
            duplicateDemonState.duplicatesMerged++;
        } catch (error) {
            console.error(`[Duplicate Demon] Failed to archive deal ${dealId}:`, error.message);
        }
    }

    return { success: true, kept: keepDeal.id, archived };
}

// API: Duplicate Demon Status
app.get('/api/v1/duplicate-demon/status', (req, res) => {
    res.json({
        ...duplicateDemonState,
        cache: {
            deals: dealNameCache.size,
            contacts: contactEmailCache.size
        }
    });
});

// API: Scan für Duplikate
app.post('/api/v1/duplicate-demon/scan', async (req, res) => {
    const { limit = 500 } = req.body;

    duplicateDemonState.isRunning = true;
    duplicateDemonState.lastRun = new Date().toISOString();

    const duplicates = await scanForDuplicates(limit);

    duplicateDemonState.isRunning = false;

    res.json({
        success: true,
        duplicateGroups: duplicates.length,
        totalDuplicates: duplicateDemonState.duplicatesFound,
        duplicates
    });
});

// API: Duplikate zusammenführen
app.post('/api/v1/duplicate-demon/merge', async (req, res) => {
    const { duplicateGroup, keepNewest = true, dryRun = true } = req.body;

    if (dryRun) {
        return res.json({
            success: true,
            dryRun: true,
            wouldKeep: duplicateGroup.deals[keepNewest ? 0 : duplicateGroup.deals.length - 1],
            wouldArchive: duplicateGroup.deals.slice(keepNewest ? 1 : 0, keepNewest ? undefined : -1)
        });
    }

    const result = await mergeDuplicates(duplicateGroup, keepNewest);
    res.json(result);
});

// API: Auto-Merge alle Duplikate
app.post('/api/v1/duplicate-demon/auto-merge', async (req, res) => {
    const { limit = 100, dryRun = true } = req.body;

    const duplicates = await scanForDuplicates(limit);
    const results = { merged: 0, errors: 0, details: [] };

    for (const group of duplicates) {
        if (dryRun) {
            results.details.push({
                group: group.normalizedName,
                wouldMerge: group.count - 1
            });
            results.merged += group.count - 1;
        } else {
            const mergeResult = await mergeDuplicates(group, true);
            if (mergeResult.success) {
                results.merged += mergeResult.archived.length;
                results.details.push({ group: group.normalizedName, ...mergeResult });
            } else {
                results.errors++;
            }
        }
    }

    res.json({ success: true, dryRun, ...results });
});

// API: Prävention ein/ausschalten
app.post('/api/v1/duplicate-demon/toggle-prevention', (req, res) => {
    duplicateDemonState.preventionEnabled = !duplicateDemonState.preventionEnabled;
    res.json({
        success: true,
        preventionEnabled: duplicateDemonState.preventionEnabled
    });
});

// API: Check einzelnen Deal auf Duplikat
app.post('/api/v1/duplicate-demon/check', async (req, res) => {
    const { dealName, amount } = req.body;
    const result = await checkDealDuplicate(dealName, amount);
    res.json(result);
});

// API: Cache leeren
app.post('/api/v1/duplicate-demon/clear-cache', (req, res) => {
    dealNameCache.clear();
    contactEmailCache.clear();
    res.json({ success: true, message: 'Cache cleared' });
});

// ═══════════════════════════════════════════════════════════════
// AUTO LEAD GENERATOR - Worldwide B2B Lead Generation
// ═══════════════════════════════════════════════════════════════

// Import lead generator module
const leadGeneratorModule = (() => {
    try {
        return require('./automation/worldwide-lead-generator.js');
    } catch (e) {
        console.log('[Lead Generator] Module not available:', e.message);
        return null;
    }
})();

// Lead Generator State
const leadGeneratorState = {
    running: false,
    paused: false,
    startedAt: null,
    stats: {
        generated: 0,
        uploaded: 0,
        failed: 0,
        byRegion: { DACH: 0, Europe: 0, NorthAmerica: 0, APAC: 0, Other: 0 },
        byIndustry: {}
    },
    config: {
        leadsPerBatch: 50,
        batchInterval: 60000, // 1 minute between batches
        uploadToHubSpot: true,
        targetPerDay: 1000,
        regions: { DACH: 35, Europe: 25, NorthAmerica: 25, APAC: 10, Other: 5 }
    },
    lastBatchAt: null,
    queue: [],
    generator: null,
    uploader: null,
    intervalId: null
};

// Initialize generator if module available
if (leadGeneratorModule) {
    leadGeneratorState.generator = new leadGeneratorModule.WorldwideLeadGenerator();
    leadGeneratorState.uploader = new leadGeneratorModule.HubSpotUploader(
        process.env.HUBSPOT_API_KEY || 'pat-eu1-1d74de75-d72b-4ed5-ba97-cfe74e48039b'
    );
}

// Generate a batch of leads
async function generateLeadBatch(count = 50, uploadToHubSpot = true) {
    if (!leadGeneratorState.generator) {
        return { success: false, error: 'Generator not initialized' };
    }

    const leads = [];
    for (let i = 0; i < count; i++) {
        const lead = leadGeneratorState.generator.generateLead();
        leads.push(lead);
        leadGeneratorState.stats.generated++;

        // Track by region
        if (lead._meta?.region && leadGeneratorState.stats.byRegion[lead._meta.region] !== undefined) {
            leadGeneratorState.stats.byRegion[lead._meta.region]++;
        }

        // Track by industry
        if (lead._meta?.industry) {
            if (!leadGeneratorState.stats.byIndustry[lead._meta.industry]) {
                leadGeneratorState.stats.byIndustry[lead._meta.industry] = 0;
            }
            leadGeneratorState.stats.byIndustry[lead._meta.industry]++;
        }
    }

    // Upload to HubSpot if enabled
    if (uploadToHubSpot && leadGeneratorState.uploader) {
        try {
            const result = await leadGeneratorState.uploader.uploadBatch(leads);
            leadGeneratorState.stats.uploaded += result.success || 0;
            leadGeneratorState.stats.failed += result.failed || 0;
            console.log(`[Lead Generator] Uploaded ${result.success} leads to HubSpot`);
        } catch (error) {
            console.error('[Lead Generator] Upload error:', error.message);
            leadGeneratorState.stats.failed += leads.length;
        }
    }

    leadGeneratorState.lastBatchAt = new Date().toISOString();
    return { success: true, count: leads.length, leads };
}

// Run continuous generation
async function runLeadGeneratorCycle() {
    if (!leadGeneratorState.running || leadGeneratorState.paused) return;

    const { leadsPerBatch, uploadToHubSpot } = leadGeneratorState.config;

    console.log(`[Lead Generator] Running cycle - generating ${leadsPerBatch} leads...`);
    await generateLeadBatch(leadsPerBatch, uploadToHubSpot);
}

// Start the generator
function startLeadGenerator() {
    if (leadGeneratorState.running) {
        return { success: false, message: 'Generator already running' };
    }

    leadGeneratorState.running = true;
    leadGeneratorState.paused = false;
    leadGeneratorState.startedAt = new Date().toISOString();

    // Run immediately
    runLeadGeneratorCycle();

    // Set up interval
    leadGeneratorState.intervalId = setInterval(runLeadGeneratorCycle, leadGeneratorState.config.batchInterval);

    console.log('[Lead Generator] Started');
    return { success: true, message: 'Lead generator started' };
}

// Stop the generator
function stopLeadGenerator() {
    if (leadGeneratorState.intervalId) {
        clearInterval(leadGeneratorState.intervalId);
        leadGeneratorState.intervalId = null;
    }

    leadGeneratorState.running = false;
    leadGeneratorState.paused = false;

    console.log('[Lead Generator] Stopped');
    return { success: true, message: 'Lead generator stopped' };
}

// API: Get lead generator status
app.get('/api/v1/lead-generator/status', (req, res) => {
    const runtime = leadGeneratorState.startedAt
        ? Math.round((Date.now() - new Date(leadGeneratorState.startedAt).getTime()) / 1000)
        : 0;

    res.json({
        running: leadGeneratorState.running,
        paused: leadGeneratorState.paused,
        startedAt: leadGeneratorState.startedAt,
        runtime,
        stats: leadGeneratorState.stats,
        config: leadGeneratorState.config,
        lastBatchAt: leadGeneratorState.lastBatchAt,
        moduleLoaded: !!leadGeneratorModule
    });
});

// API: Start lead generator
app.post('/api/v1/lead-generator/start', (req, res) => {
    const result = startLeadGenerator();
    res.json(result);
});

// API: Stop lead generator
app.post('/api/v1/lead-generator/stop', (req, res) => {
    const result = stopLeadGenerator();
    res.json(result);
});

// API: Pause/Resume lead generator
app.post('/api/v1/lead-generator/pause', (req, res) => {
    leadGeneratorState.paused = !leadGeneratorState.paused;
    res.json({
        success: true,
        paused: leadGeneratorState.paused,
        message: leadGeneratorState.paused ? 'Generator paused' : 'Generator resumed'
    });
});

// API: Generate leads manually (single batch)
app.post('/api/v1/lead-generator/generate', async (req, res) => {
    const { count = 50, uploadToHubSpot = true } = req.body;

    if (!leadGeneratorModule) {
        return res.status(500).json({ error: 'Lead generator module not loaded' });
    }

    try {
        const result = await generateLeadBatch(Math.min(count, 100), uploadToHubSpot);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Preview leads (generate without uploading)
app.post('/api/v1/lead-generator/preview', async (req, res) => {
    const { count = 10 } = req.body;

    if (!leadGeneratorState.generator) {
        return res.status(500).json({ error: 'Generator not initialized' });
    }

    const leads = [];
    for (let i = 0; i < Math.min(count, 50); i++) {
        leads.push(leadGeneratorState.generator.generateLead());
    }

    res.json({ success: true, count: leads.length, leads });
});

// API: Update configuration
app.post('/api/v1/lead-generator/config', (req, res) => {
    const { leadsPerBatch, batchInterval, uploadToHubSpot, targetPerDay, regions } = req.body;

    if (leadsPerBatch !== undefined) {
        leadGeneratorState.config.leadsPerBatch = Math.min(Math.max(1, leadsPerBatch), 100);
    }
    if (batchInterval !== undefined) {
        leadGeneratorState.config.batchInterval = Math.max(10000, batchInterval); // Min 10 seconds
    }
    if (uploadToHubSpot !== undefined) {
        leadGeneratorState.config.uploadToHubSpot = !!uploadToHubSpot;
    }
    if (targetPerDay !== undefined) {
        leadGeneratorState.config.targetPerDay = Math.max(1, targetPerDay);
    }
    if (regions && typeof regions === 'object') {
        leadGeneratorState.config.regions = { ...leadGeneratorState.config.regions, ...regions };
    }

    // Restart interval if running with new batch interval
    if (leadGeneratorState.running && leadGeneratorState.intervalId && batchInterval !== undefined) {
        clearInterval(leadGeneratorState.intervalId);
        leadGeneratorState.intervalId = setInterval(runLeadGeneratorCycle, leadGeneratorState.config.batchInterval);
    }

    res.json({ success: true, config: leadGeneratorState.config });
});

// API: Reset stats
app.post('/api/v1/lead-generator/reset-stats', (req, res) => {
    leadGeneratorState.stats = {
        generated: 0,
        uploaded: 0,
        failed: 0,
        byRegion: { DACH: 0, Europe: 0, NorthAmerica: 0, APAC: 0, Other: 0 },
        byIndustry: {}
    };
    res.json({ success: true, message: 'Stats reset' });
});

// API: Get available regions and industries
app.get('/api/v1/lead-generator/options', (req, res) => {
    if (!leadGeneratorModule) {
        return res.json({ regions: [], industries: [] });
    }

    const { WORLDWIDE_DATA } = leadGeneratorModule;
    res.json({
        regions: Object.keys(WORLDWIDE_DATA.regions),
        regionWeights: WORLDWIDE_DATA.regions,
        industries: {
            primary: WORLDWIDE_DATA.industries.primary,
            secondary: WORLDWIDE_DATA.industries.secondary,
            tertiary: WORLDWIDE_DATA.industries.tertiary
        },
        countries: Object.keys(WORLDWIDE_DATA.countries).reduce((acc, region) => {
            acc[region] = WORLDWIDE_DATA.countries[region].map(c => ({ code: c.code, name: c.name }));
            return acc;
        }, {})
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

// Bot Orchestrator - 24/7 AI Bot System
let botOrchestrator = null;
try {
    botOrchestrator = require('./automation/background-worker/bot-orchestrator');
    console.log('✓ Bot Orchestrator loaded - 44 bots ready');
} catch (e) {
    console.warn('⚠ Bot Orchestrator not available:', e.message);
}

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
        // Core Control
        { from: 'haiku', to: 'all', type: 'control', label: 'Divine Control' },

        // Sales & CRM Workflows
        { from: 'lead_qualifier', to: 'outreach', type: 'workflow', label: 'Lead Pipeline' },
        { from: 'outreach', to: 'negotiator', type: 'workflow', label: 'Sales Flow' },
        { from: 'oracle', to: 'lead_qualifier', type: 'scoring', label: 'Deal Scoring' },
        { from: 'hermes', to: 'retention', type: 'workflow', label: 'Follow-Up Chain' },
        { from: 'athena', to: 'gutenberg', type: 'proposal', label: 'Proposal Generator' },
        { from: 'apollo', to: 'atlas', type: 'analysis', label: 'Win Analysis' },

        // Finance & Invoicing
        { from: 'pipeline_bot', to: 'archimedes', type: 'invoice', label: 'Invoice Flow' },
        { from: 'archimedes', to: 'hermes', type: 'reminder', label: 'Payment Reminder' },
        { from: 'atlas', to: 'oracle', type: 'forecast', label: 'Revenue Forecast' },

        // Smart Home / PropTech
        { from: 'negotiator', to: 'loxone', type: 'handover', label: 'Project Handover' },
        { from: 'home_advisor', to: 'knx', type: 'design', label: 'System Design' },
        { from: 'smart_building', to: 'hippocrates', type: 'maintenance', label: 'Maintenance Alert' },
        { from: 'loxone', to: 'knx', type: 'integration', label: 'Smart Home Integration' },

        // Marketing & Content
        { from: 'cleopatra', to: 'outreach', type: 'campaign', label: 'Campaign Engine' },
        { from: 'picasso', to: 'spielberg', type: 'creative', label: 'Social Automation' },
        { from: 'darwin', to: 'gutenberg', type: 'seo', label: 'SEO Pipeline' },
        { from: 'spielberg', to: 'gutenberg', type: 'content', label: 'Content Creation' },

        // Analytics & Intelligence
        { from: 'marco_polo', to: 'atlas', type: 'research', label: 'Market Research' },
        { from: 'poirot', to: 'napoleon', type: 'competitive', label: 'Competitor Watch' },
        { from: 'galileo', to: 'oracle', type: 'trends', label: 'Trend Detection' },
        { from: 'einstein', to: 'tesla', type: 'analysis', label: 'Innovation Lab' },

        // Customer Success
        { from: 'negotiator', to: 'confucius', type: 'onboarding', label: 'Onboarding Flow' },
        { from: 'freud', to: 'retention', type: 'health', label: 'Health Score' },
        { from: 'atlas', to: 'cleopatra', type: 'upsell', label: 'Upsell Detection' },

        // Duplicate Prevention
        { from: 'duplicate_demon', to: 'all', type: 'prevention', label: 'Duplicate Guard' }
    ];
}

// Genius Agency Bots API
app.get('/api/genius-agency/bots', (req, res) => {
    res.json({
        total: allBots.length,
        categories: botsConfig.bot_categories || {},
        bots: allBots.map(b => ({
            ...b,
            status: 'online',
            tasksCompleted: Math.floor(Math.random() * 100)
        }))
    });
});

// ═══════════════════════════════════════════════════════════════
// BOT ORCHESTRATOR API - 24/7 AI Bot System
// ═══════════════════════════════════════════════════════════════

// Start Bot Orchestrator
app.post('/api/bot-orchestrator/start', async (req, res) => {
    if (!botOrchestrator) {
        return res.status(503).json({ error: 'Bot Orchestrator not available' });
    }
    try {
        await botOrchestrator.startOrchestrator();
        // Broadcast bot status update via WebSocket
        if (global.wsBroadcast) {
            global.wsBroadcast('bot-update', { running: true, activeBots: 44, event: 'started' });
        }
        res.json({ success: true, message: '44 Bots gestartet - 24/7 Modus aktiv' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stop Bot Orchestrator
app.post('/api/bot-orchestrator/stop', (req, res) => {
    if (!botOrchestrator) {
        return res.status(503).json({ error: 'Bot Orchestrator not available' });
    }
    botOrchestrator.stopOrchestrator();
    // Broadcast bot status update via WebSocket
    if (global.wsBroadcast) {
        global.wsBroadcast('bot-update', { running: false, activeBots: 0, event: 'stopped' });
    }
    res.json({ success: true, message: 'Alle Bots gestoppt' });
});

// Get Orchestrator Status
app.get('/api/bot-orchestrator/status', (req, res) => {
    if (!botOrchestrator) {
        return res.status(503).json({ error: 'Bot Orchestrator not available' });
    }
    res.json(botOrchestrator.getOrchestratorStatus());
});

// Get Recent Bot Logs
app.get('/api/bot-orchestrator/logs', async (req, res) => {
    if (!botOrchestrator) {
        return res.status(503).json({ error: 'Bot Orchestrator not available' });
    }
    try {
        const limit = parseInt(req.query.limit) || 50;
        const logs = await botOrchestrator.getRecentLogs(limit);
        res.json({ logs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Bot Stats
app.get('/api/bot-orchestrator/stats', async (req, res) => {
    if (!botOrchestrator) {
        return res.status(503).json({ error: 'Bot Orchestrator not available' });
    }
    try {
        const stats = await botOrchestrator.getBotStats();
        res.json({ stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Execute Single Bot Task
app.post('/api/bot-orchestrator/execute/:botId', async (req, res) => {
    if (!botOrchestrator) {
        return res.status(503).json({ error: 'Bot Orchestrator not available' });
    }
    try {
        const result = await botOrchestrator.executeBotTask(req.params.botId);
        if (result) {
            // Broadcast task execution via WebSocket
            if (global.wsBroadcast) {
                global.wsBroadcast('task-update', {
                    botId: req.params.botId,
                    event: 'executed',
                    result: result.success ? 'success' : 'failed',
                    timestamp: Date.now()
                });
            }
            res.json({ success: true, result });
        } else {
            res.status(404).json({ error: 'Bot not found or task failed' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get All Bot Tasks Configuration
app.get('/api/bot-orchestrator/tasks', (req, res) => {
    if (!botOrchestrator) {
        return res.status(503).json({ error: 'Bot Orchestrator not available' });
    }
    const tasks = Object.entries(botOrchestrator.BOT_TASKS).map(([id, bot]) => ({
        id,
        name: bot.name,
        task: bot.task,
        description: bot.description,
        schedule: bot.schedule
    }));
    res.json({ total: tasks.length, tasks });
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
let enrichmentEmailCache = new Map();
let enrichmentEmailCacheTime = 0;
const EMAIL_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Load all contact emails into cache - fetch more contacts
async function loadContactEmails() {
    const now = Date.now();
    if (enrichmentEmailCache.size > 0 && now - enrichmentEmailCacheTime < EMAIL_CACHE_TTL) {
        return enrichmentEmailCache;
    }

    console.log('[Email Enrichment] Loading contact emails from HubSpot...');

    try {
        enrichmentEmailCache = new Map();

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
                    if (!enrichmentEmailCache.has('domain:' + domain)) {
                        enrichmentEmailCache.set('domain:' + domain, { email, name, company, id: contact.id });
                    }

                    // Store by company name (full)
                    if (company && !enrichmentEmailCache.has('company:' + company)) {
                        enrichmentEmailCache.set('company:' + company, { email, name, company, id: contact.id });
                    }

                    // Store by company name keywords
                    if (company) {
                        const keywords = company.split(/[\s\-_\.]+/).filter(k => k.length > 3);
                        for (const kw of keywords) {
                            const key = 'keyword:' + kw.toLowerCase();
                            if (!enrichmentEmailCache.has(key)) {
                                enrichmentEmailCache.set(key, { email, name, company, id: contact.id });
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

        enrichmentEmailCacheTime = now;
        console.log(`[Email Enrichment] Cached ${enrichmentEmailCache.size} email mappings from ${totalFetched} contacts`);

    } catch (error) {
        console.error('[Email Enrichment] Error:', error.message);
    }

    return enrichmentEmailCache;
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
        .replace(/^S-Class:\s*/i, '') // Remove S-Class: prefix
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

// ═══════════════════════════════════════════════════════════════
// PROJECT FOLDERS - Projektmappen Verwaltung
// ═══════════════════════════════════════════════════════════════

const PROJECTS_DIR = path.join(__dirname, 'projects');

// Ensure projects directory exists
if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

// Get all projects with their documents
app.get('/api/v1/projects', async (req, res) => {
    try {
        const { dealId, search } = req.query;

        // Get all project folders
        const folders = fs.existsSync(PROJECTS_DIR)
            ? fs.readdirSync(PROJECTS_DIR).filter(f => fs.statSync(path.join(PROJECTS_DIR, f)).isDirectory())
            : [];

        let projects = folders.map(folder => {
            const projectPath = path.join(PROJECTS_DIR, folder);
            const metaPath = path.join(projectPath, 'meta.json');
            let meta = {};

            if (fs.existsSync(metaPath)) {
                try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) {}
            }

            // Get documents in folder
            const files = fs.readdirSync(projectPath).filter(f => f !== 'meta.json');
            const documents = files.map(file => {
                const filePath = path.join(projectPath, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    size: stats.size,
                    modified: stats.mtime,
                    type: path.extname(file).slice(1) || 'file'
                };
            });

            return {
                id: folder,
                name: meta.name || folder,
                dealId: meta.dealId || null,
                customer: meta.customer || null,
                description: meta.description || '',
                created: meta.created || null,
                documents: documents,
                documentCount: documents.length
            };
        });

        // Filter by dealId if provided
        if (dealId) {
            projects = projects.filter(p => p.dealId === dealId);
        }

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            projects = projects.filter(p =>
                p.name.toLowerCase().includes(searchLower) ||
                (p.customer && p.customer.toLowerCase().includes(searchLower))
            );
        }

        res.json({
            total: projects.length,
            projects: projects
        });
    } catch (error) {
        console.error('[Projects] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single project with documents
app.get('/api/v1/projects/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const projectPath = path.join(PROJECTS_DIR, projectId);

        if (!fs.existsSync(projectPath)) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const metaPath = path.join(projectPath, 'meta.json');
        let meta = {};
        if (fs.existsSync(metaPath)) {
            try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) {}
        }

        const files = fs.readdirSync(projectPath).filter(f => f !== 'meta.json');
        const documents = files.map(file => {
            const filePath = path.join(projectPath, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                size: stats.size,
                modified: stats.mtime,
                type: path.extname(file).slice(1) || 'file'
            };
        });

        res.json({
            id: projectId,
            name: meta.name || projectId,
            dealId: meta.dealId || null,
            customer: meta.customer || null,
            description: meta.description || '',
            created: meta.created || null,
            documents: documents
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new project folder
app.post('/api/v1/projects', async (req, res) => {
    try {
        const { name, dealId, customer, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Project name is required' });
        }

        // Create safe folder name
        const folderId = name.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50) + '_' + Date.now();
        const projectPath = path.join(PROJECTS_DIR, folderId);

        fs.mkdirSync(projectPath, { recursive: true });

        // Save metadata
        const meta = {
            name,
            dealId: dealId || null,
            customer: customer || null,
            description: description || '',
            created: new Date().toISOString()
        };
        fs.writeFileSync(path.join(projectPath, 'meta.json'), JSON.stringify(meta, null, 2));

        res.json({
            success: true,
            projectId: folderId,
            message: 'Project created successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload document to project
app.post('/api/v1/projects/:projectId/documents', async (req, res) => {
    try {
        const { projectId } = req.params;
        const projectPath = path.join(PROJECTS_DIR, projectId);

        if (!fs.existsSync(projectPath)) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Handle file upload (expects base64 or form data)
        const { filename, content, contentBase64 } = req.body;

        if (!filename) {
            return res.status(400).json({ error: 'Filename is required' });
        }

        const safeName = filename.replace(/[^a-zA-Z0-9-_.]/g, '_');
        const filePath = path.join(projectPath, safeName);

        if (contentBase64) {
            fs.writeFileSync(filePath, Buffer.from(contentBase64, 'base64'));
        } else if (content) {
            fs.writeFileSync(filePath, content);
        } else {
            return res.status(400).json({ error: 'Content is required' });
        }

        res.json({
            success: true,
            filename: safeName,
            message: 'Document uploaded successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Download document from project
app.get('/api/v1/projects/:projectId/documents/:filename', async (req, res) => {
    try {
        const { projectId, filename } = req.params;
        const filePath = path.join(PROJECTS_DIR, projectId, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Document not found' });
        }

        res.download(filePath);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete document from project
app.delete('/api/v1/projects/:projectId/documents/:filename', async (req, res) => {
    try {
        const { projectId, filename } = req.params;
        const filePath = path.join(PROJECTS_DIR, projectId, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Document not found' });
        }

        fs.unlinkSync(filePath);
        res.json({ success: true, message: 'Document deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get invoices from HubSpot deals with email enrichment, scoring, and sorting
app.get('/api/v1/invoices', async (req, res) => {
    try {
        const data = await getHubSpotData();
        const { status, limit = 50, offset = 0, enrich = 'true', sort = 'score', order = 'desc' } = req.query;

        // Load email cache if enrichment is enabled
        if (enrich === 'true') {
            await loadContactEmails();
        }

        // Convert deals to invoices with score calculation
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
            let sent_date = null;
            if (stage === 'closedwon') invoiceStatus = 'paid';
            else if (stage === 'contractsent') {
                invoiceStatus = 'sent';
                sent_date = props.hs_lastmodifieddate || props.createdate;
            }
            else if (stage === 'decisionmakerboughtin' || stage === 'presentationscheduled') invoiceStatus = 'pending';

            // Check if overdue (closedate in past and not won)
            const closeDate = props.closedate ? new Date(props.closedate) : null;
            if (closeDate && closeDate < new Date() && invoiceStatus !== 'paid') {
                invoiceStatus = 'overdue';
            }

            // Calculate invoice score (0-100)
            // Higher score = better priority for sending/following up
            const hasEmail = customerEmail && customerEmail.length > 0;
            let score = 0;

            // Email availability: +40 points
            if (hasEmail) score += 40;

            // Status priority: sent=10, pending=30, draft=20, overdue=25, paid=0
            const statusScores = { sent: 10, pending: 30, draft: 20, overdue: 25, paid: 0 };
            score += statusScores[invoiceStatus] || 0;

            // Amount score: normalize to 0-30 points (higher amount = higher score)
            const amountScore = Math.min(30, Math.floor(amount / 50000)); // 50k = 1 point, max 30
            score += amountScore;

            return {
                id: deal.id,
                invoice_number: `INV-${deal.id}`,
                customer_name: customerName || props.dealname || 'Unbekannt',
                customer_email: customerEmail || '',
                has_email: hasEmail,
                amount: amount,
                currency: 'EUR',
                status: invoiceStatus,
                sent_date: sent_date,
                created_date: props.createdate,
                due_date: props.closedate,
                hubspot_deal_id: deal.id,
                score: score,
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

        // Sort invoices
        const sortOrder = order === 'asc' ? 1 : -1;
        invoices.sort((a, b) => {
            switch (sort) {
                case 'score':
                    return (b.score - a.score) * sortOrder;
                case 'amount':
                    return (b.amount - a.amount) * sortOrder;
                case 'status':
                    const statusPriority = { overdue: 0, pending: 1, sent: 2, draft: 3, paid: 4 };
                    return ((statusPriority[a.status] || 5) - (statusPriority[b.status] || 5)) * sortOrder;
                case 'email':
                    return ((b.has_email ? 1 : 0) - (a.has_email ? 1 : 0)) * sortOrder;
                case 'sent':
                    // Sent first, then by sent_date
                    if (a.status === 'sent' && b.status !== 'sent') return -1 * sortOrder;
                    if (b.status === 'sent' && a.status !== 'sent') return 1 * sortOrder;
                    if (a.sent_date && b.sent_date) {
                        return (new Date(b.sent_date) - new Date(a.sent_date)) * sortOrder;
                    }
                    return 0;
                case 'date':
                    return (new Date(b.created_date) - new Date(a.created_date)) * sortOrder;
                default:
                    return (b.score - a.score) * sortOrder;
            }
        });

        // Calculate totals
        const totals = {
            total: invoices.reduce((sum, inv) => sum + inv.amount, 0),
            paid: invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0),
            pending: invoices.filter(inv => ['pending', 'sent'].includes(inv.status)).reduce((sum, inv) => sum + inv.amount, 0),
            overdue: invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0),
            with_email: invoices.filter(inv => inv.has_email).length,
            without_email: invoices.filter(inv => !inv.has_email).length
        };

        // Pagination
        const startIdx = parseInt(offset) || 0;
        const endIdx = startIdx + (parseInt(limit) || 50);

        res.json({
            invoices: invoices.slice(startIdx, endIdx),
            total_count: invoices.length,
            totals,
            sort: { field: sort, order: order },
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

// Send Invoice via Email (using SMTP)
app.post('/api/v1/invoices/:id/send', async (req, res) => {
    try {
        const { id } = req.params;
        const { email, include_stripe, include_paypal } = req.body;

        // Get invoice data
        const invoice = invoiceStore.get(id);
        const amount = invoice?.amount || 1000;
        const customerName = invoice?.customer_name || 'Kunde';
        const invoiceNumber = id;

        // Generate payment links
        let stripeUrl = '', paypalUrl = '';

        if (include_stripe && STRIPE_SECRET_KEY && STRIPE_SECRET_KEY !== 'YOUR_STRIPE_SECRET_KEY') {
            const stripeLink = await stripeRequest('/payment_links', {
                method: 'POST',
                body: {
                    'line_items[0][price_data][currency]': 'eur',
                    'line_items[0][price_data][product_data][name]': `Rechnung ${id}`,
                    'line_items[0][price_data][unit_amount]': Math.round(amount * 100),
                    'line_items[0][quantity]': '1'
                }
            });
            stripeUrl = stripeLink.url || '';
        }

        // Build Email HTML with Enterprise Universe Branding
        const dueDate = invoice?.due_date ? new Date(invoice.due_date).toLocaleDateString('de-DE') : new Date(Date.now() + 14*24*60*60*1000).toLocaleDateString('de-DE');

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
                    <!-- HEADER -->
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
                            <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">Guten Tag <strong>${customerName}</strong>,</p>
                            <p style="margin: 0 0 25px 0; font-size: 15px; color: #6b7280; line-height: 1.6;">vielen Dank f&#252;r Ihr Vertrauen in Enterprise Universe. Anbei finden Sie Ihre Rechnung.</p>
                            <!-- INVOICE BOX -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin: 25px 0;">
                                <tr><td style="padding: 25px;">
                                    <table role="presentation" width="100%">
                                        <tr><td style="padding: 8px 0; color: #64748b;">Rechnungsnummer</td><td style="text-align: right; font-weight: 600; color: #1f2937;">${invoiceNumber}</td></tr>
                                        <tr><td colspan="2" style="border-bottom: 1px solid #e2e8f0; padding: 5px 0;"></td></tr>
                                        <tr><td style="padding: 8px 0; color: #64748b;">F&#228;llig bis</td><td style="text-align: right; font-weight: 600; color: #1f2937;">${dueDate}</td></tr>
                                        <tr><td colspan="2" style="padding: 15px 0;"></td></tr>
                                        <tr><td style="font-weight: 600; color: #1f2937;">Gesamtbetrag</td><td style="text-align: right; font-size: 28px; font-weight: 800; color: #8b5cf6;">&#8364;${amount.toLocaleString('de-DE')}</td></tr>
                                    </table>
                                </td></tr>
                            </table>
                            <!-- PAYMENT BUTTONS -->
                            <p style="margin: 25px 0 15px 0; font-weight: 600; color: #1f2937;">Jetzt sicher bezahlen:</p>
                            <table role="presentation" width="100%"><tr>
                                ${stripeUrl ? `<td style="padding-right: 10px;"><a href="${stripeUrl}" style="display: block; background: linear-gradient(135deg, #8b5cf6, #06b6d4); color: #fff; padding: 16px; text-align: center; text-decoration: none; border-radius: 10px; font-weight: 600;">&#128179; Kreditkarte</a></td>` : ''}
                                ${paypalUrl ? `<td><a href="${paypalUrl}" style="display: block; background: #0070ba; color: #fff; padding: 16px; text-align: center; text-decoration: none; border-radius: 10px; font-weight: 600;">PayPal</a></td>` : ''}
                            </tr></table>
                            <!-- BANK INFO -->
                            <table role="presentation" width="100%" style="background: #f8fafc; border-radius: 10px; margin-top: 20px;">
                                <tr><td style="padding: 20px;">
                                    <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #64748b;">Alternativ per &#220;berweisung:</p>
                                    <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.8;"><strong>IBAN:</strong> DE42 1001 0178 9758 7887 93<br><strong>BIC:</strong> REVODEB2<br><strong>Verwendungszweck:</strong> ${invoiceNumber}</p>
                                </td></tr>
                            </table>
                        </td>
                    </tr>
                    <!-- SIGNATURE -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px; border-top: 1px solid #e5e7eb;">
                            <table role="presentation" style="padding-top: 25px;"><tr>
                                <td style="width: 50px; height: 50px; background: linear-gradient(135deg, #8b5cf6, #06b6d4); border-radius: 50%; text-align: center; line-height: 50px;"><span style="color: #fff; font-weight: 600;">&#214;C</span></td>
                                <td style="padding-left: 15px;"><p style="margin: 0; font-weight: 600; color: #1f2937;">&#214;mer H&#252;seyin Coskun</p><p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">Founder & CEO</p></td>
                            </tr></table>
                        </td>
                    </tr>
                    <!-- FOOTER -->
                    <tr>
                        <td style="background: #1a1a28; padding: 25px; text-align: center;">
                            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #ffffff;">&#31070; Enterprise Universe</p>
                            <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">Enterprise Universe GmbH (i.G.) &#8226; Leienbergstr. 1, 53783 Eitorf</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

        // Send via SMTP
        const emailResult = await sendEmail({
            to: email,
            subject: `Rechnung ${invoiceNumber} - Enterprise Universe GmbH`,
            html: emailHtml
        });

        // Update invoice status
        if (invoice) {
            invoice.status = 'sent';
            invoice.sent_date = new Date().toISOString();
            invoice.sent_to = email;
        }

        res.json({
            success: emailResult.success,
            message: emailResult.success ? `Rechnung an ${email} gesendet` : `Fehler: ${emailResult.error}`,
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

// Stripe Webhook Handler (Enhanced)
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const payload = req.body;
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        // Verify signature if secret is configured
        if (STRIPE_WEBHOOK_SECRET && sig) {
            const crypto = require('crypto');
            const elements = sig.split(',');
            const timestamp = elements.find(e => e.startsWith('t='))?.split('=')[1];
            const signature = elements.find(e => e.startsWith('v1='))?.split('=')[1];

            const signedPayload = `${timestamp}.${payload}`;
            const expectedSig = crypto.createHmac('sha256', STRIPE_WEBHOOK_SECRET)
                .update(signedPayload)
                .digest('hex');

            if (signature !== expectedSig) {
                console.error('[Stripe Webhook] Invalid signature');
                return res.status(400).json({ error: 'Invalid signature' });
            }
        }

        event = JSON.parse(payload);
        console.log(`[Stripe Webhook] Event received: ${event.type}`);

        switch (event.type) {
            case 'checkout.session.completed':
            case 'payment_intent.succeeded':
                const paymentData = event.data.object;
                const amount = (paymentData.amount || paymentData.amount_total || 0) / 100;
                const currency = (paymentData.currency || 'eur').toUpperCase();
                const invoiceId = paymentData.metadata?.invoice_id || paymentData.metadata?.deal_id;
                const customerEmail = paymentData.customer_details?.email || paymentData.receipt_email;

                console.log(`[Stripe Webhook] ✅ Payment succeeded: €${amount} ${currency}`);
                console.log(`[Stripe Webhook] Invoice/Deal: ${invoiceId}, Customer: ${customerEmail}`);

                // Update invoice store
                if (invoiceId) {
                    const invoice = invoiceStore.get(invoiceId);
                    if (invoice) {
                        invoice.status = 'paid';
                        invoice.paid_date = new Date().toISOString();
                        invoice.payment_method = 'stripe';
                        invoice.transaction_id = paymentData.id;
                        invoice.amount_paid = amount;
                    }
                }

                // Send confirmation email to admin
                try {
                    await sendEmail({
                        to: 'coskun.oemer@gmail.com',
                        subject: `💰 Zahlung eingegangen: €${amount.toLocaleString('de-DE')} ${currency}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                                    <h1 style="color: white; margin: 0;">💰 Zahlung eingegangen!</h1>
                                </div>
                                <div style="padding: 30px; background: #f8f9fa; border: 1px solid #e9ecef;">
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><strong>Betrag:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right; font-size: 24px; color: #22c55e;"><strong>€${amount.toLocaleString('de-DE')}</strong></td></tr>
                                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><strong>Währung:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${currency}</td></tr>
                                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><strong>Kunde:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${customerEmail || 'N/A'}</td></tr>
                                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><strong>Rechnung/Deal:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${invoiceId || 'N/A'}</td></tr>
                                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><strong>Zahlungsmethode:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">Stripe</td></tr>
                                        <tr><td style="padding: 10px 0;"><strong>Zeitpunkt:</strong></td><td style="padding: 10px 0; text-align: right;">${new Date().toLocaleString('de-DE')}</td></tr>
                                    </table>
                                    <div style="margin-top: 20px; padding: 15px; background: #d1fae5; border-radius: 8px;">
                                        <p style="margin: 0; color: #166534;">✅ Die Zahlung wurde erfolgreich verarbeitet und Ihrem Stripe-Konto gutgeschrieben.</p>
                                    </div>
                                </div>
                                <div style="padding: 20px; text-align: center; color: #6c757d; font-size: 12px;">
                                    Enterprise Universe GmbH | Automatische Benachrichtigung
                                </div>
                            </div>
                        `
                    });
                    console.log('[Stripe Webhook] ✅ Admin notification sent');
                } catch (emailError) {
                    console.error('[Stripe Webhook] Email error:', emailError.message);
                }

                // Update HubSpot deal if deal_id is present
                if (invoiceId && paymentData.metadata?.deal_id) {
                    try {
                        await hubspotRequest(`/crm/v3/objects/deals/${paymentData.metadata.deal_id}`, {
                            method: 'PATCH',
                            body: {
                                properties: {
                                    dealstage: 'closedwon',
                                    hs_deal_stage_probability: '100',
                                    notes_last_updated: `Zahlung erhalten: €${amount} via Stripe am ${new Date().toLocaleString('de-DE')}`
                                }
                            }
                        });
                        console.log('[Stripe Webhook] ✅ HubSpot deal updated');
                    } catch (hubspotError) {
                        console.error('[Stripe Webhook] HubSpot update error:', hubspotError.message);
                    }
                }
                break;

            case 'payment_intent.payment_failed':
                console.log('[Stripe Webhook] ❌ Payment failed:', event.data.object.id);
                break;

            default:
                console.log(`[Stripe Webhook] Unhandled event: ${event.type}`);
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

        // Process each event independently to prevent one failure from blocking others
        const results = [];
        for (const event of events) {
            try {
                // Check for deal property change (dealstage)
                if (event.subscriptionType === 'deal.propertyChange' &&
                    event.propertyName === 'dealstage' &&
                    event.propertyValue === 'closedwon') {

                    const dealId = event.objectId;
                    console.log(`[Auto-Invoice] Deal ${dealId} won! Triggering auto-invoice...`);

                    // Send invoice automatically (don't await - process async)
                    sendAutoInvoice(dealId).catch(err => {
                        console.error(`[Auto-Invoice] Failed for deal ${dealId}:`, err.message);
                    });
                    results.push({ dealId, status: 'processing' });
                }
            } catch (eventError) {
                console.error(`[HubSpot Webhook] Event processing error:`, eventError.message);
                results.push({ error: eventError.message });
            }
        }

        res.json({ received: true, processed: results.length });
    } catch (error) {
        console.error('[HubSpot Webhook] Error:', error.message);
        // Always return 200 to prevent HubSpot from retrying
        res.json({ received: true, error: error.message });
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
            console.log(`[Auto-Invoice] ⚠️ No verified email for deal ${dealId}: "${dealName.substring(0, 50)}..." - Queuing for Email Sync Daemon`);
            // Queue for email sync daemon to retry later
            if (typeof queueForEmailSync === 'function') {
                queueForEmailSync(dealId, dealName, amount);
            }
            return { success: false, reason: 'no_verified_email_queued_for_sync', dealName: dealName };
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
                                            <strong>IBAN:</strong> DE42 1001 0178 9758 7887 93<br>
                                            <strong>BIC:</strong> REVODEB2<br>
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
// EMAIL SYNC DAEMON - Syncs missing emails and auto-sends invoices
// ═══════════════════════════════════════════════════════════════

// Queue for invoices waiting for email sync
const emailSyncQueue = new Map(); // dealId -> { dealName, amount, attempts, lastAttempt, status }
let emailSyncDaemonEnabled = true;
const EMAIL_SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes
let lastEmailSyncRun = 0;
let emailSyncStats = { synced: 0, sent: 0, failed: 0, lastRun: null };

// Add invoice to email sync queue
function queueForEmailSync(dealId, dealName, amount) {
    if (!emailSyncQueue.has(dealId)) {
        emailSyncQueue.set(dealId, {
            dealId,
            dealName,
            amount,
            attempts: 0,
            maxAttempts: 10, // Max 10 attempts over ~2.5 hours
            lastAttempt: null,
            queuedAt: new Date().toISOString(),
            status: 'pending'
        });
        console.log(`[Email-Sync] Queued deal ${dealId} for email sync: "${dealName.substring(0, 40)}..."`);
    }
}

// Email Sync Daemon - runs periodically
async function runEmailSyncDaemon() {
    if (!emailSyncDaemonEnabled) return;

    lastEmailSyncRun = Date.now();
    emailSyncStats.lastRun = new Date().toISOString();

    const queueSize = emailSyncQueue.size;
    if (queueSize === 0) {
        console.log(`[Email-Sync Daemon] No items in queue`);
        return;
    }

    console.log(`[Email-Sync Daemon] Processing ${queueSize} queued items...`);

    for (const [dealId, item] of emailSyncQueue.entries()) {
        // Skip if max attempts reached
        if (item.attempts >= item.maxAttempts) {
            item.status = 'max_attempts';
            emailSyncStats.failed++;
            emailSyncQueue.delete(dealId);
            console.log(`[Email-Sync] Removing deal ${dealId} - max attempts reached`);
            continue;
        }

        // Skip if already sent
        if (sentInvoices.has(dealId)) {
            emailSyncQueue.delete(dealId);
            continue;
        }

        item.attempts++;
        item.lastAttempt = new Date().toISOString();

        try {
            // Try to find email via HubSpot search
            console.log(`[Email-Sync] Attempt ${item.attempts}/${item.maxAttempts} for: "${item.dealName.substring(0, 40)}..."`);

            // Method 1: Search HubSpot contacts by company name parts
            const searchTerms = item.dealName
                .replace(/[-_\/\\|,;:()[\]{}'"<>]/g, ' ')
                .split(/\s+/)
                .filter(term => term.length > 2)
                .slice(0, 3);

            let foundEmail = null;
            let foundName = null;

            for (const term of searchTerms) {
                if (foundEmail) break;

                try {
                    const searchRes = await hubspotRequest('/crm/v3/objects/contacts/search', {
                        method: 'POST',
                        body: {
                            filterGroups: [{
                                filters: [{
                                    propertyName: 'company',
                                    operator: 'CONTAINS_TOKEN',
                                    value: term
                                }]
                            }],
                            properties: ['email', 'firstname', 'lastname', 'company'],
                            limit: 5
                        }
                    });

                    if (searchRes?.results?.length > 0) {
                        for (const contact of searchRes.results) {
                            if (contact.properties?.email) {
                                foundEmail = contact.properties.email;
                                foundName = [contact.properties.firstname, contact.properties.lastname].filter(Boolean).join(' ') ||
                                           contact.properties.company || item.dealName;
                                console.log(`[Email-Sync] ✓ Found email via company search: ${foundEmail}`);
                                break;
                            }
                        }
                    }
                } catch (searchErr) {
                    // Ignore search errors, try next term
                }
            }

            // Method 2: Check deal associations again (contact may have been added)
            if (!foundEmail) {
                try {
                    const associations = await hubspotRequest(`/crm/v3/objects/deals/${dealId}/associations/contacts`);
                    if (associations?.results?.length > 0) {
                        const contactId = associations.results[0].id;
                        const contact = await hubspotRequest(`/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname,company`);
                        if (contact?.properties?.email) {
                            foundEmail = contact.properties.email;
                            foundName = [contact.properties.firstname, contact.properties.lastname].filter(Boolean).join(' ') ||
                                       contact.properties.company || item.dealName;
                            console.log(`[Email-Sync] ✓ Found email via deal association: ${foundEmail}`);
                        }
                    }
                } catch (assocErr) {
                    // Ignore association errors
                }
            }

            // Method 3: Use existing findEmailForDeal function
            if (!foundEmail) {
                const enrichedContact = await findEmailForDeal(item.dealName, true);
                if (enrichedContact?.email && enrichedContact?.matched) {
                    foundEmail = enrichedContact.email;
                    foundName = enrichedContact.name || item.dealName;
                    console.log(`[Email-Sync] ✓ Found email via name matching: ${foundEmail}`);
                }
            }

            // If email found, send invoice
            if (foundEmail) {
                item.status = 'email_found';
                emailSyncStats.synced++;

                console.log(`[Email-Sync] Sending invoice to ${foundEmail} for deal ${dealId}...`);

                // Create and send invoice
                const invoiceNumber = `INV-${dealId}-${Date.now().toString(36).toUpperCase()}`;
                const invoice = {
                    id: dealId,
                    invoice_number: invoiceNumber,
                    customer_name: foundName,
                    customer_email: foundEmail,
                    amount: item.amount,
                    currency: 'EUR',
                    status: 'sent',
                    sent_date: new Date().toISOString(),
                    created_date: item.queuedAt,
                    auto_generated: true,
                    sync_source: 'email_sync_daemon'
                };

                // Store invoice
                invoiceStore.set(dealId, invoice);
                sentInvoices.add(dealId);

                // Send email (reuse existing email send logic)
                try {
                    // Use the invoice send endpoint logic
                    const sendResult = await sendInvoiceEmail(dealId, foundEmail, foundName, item.amount, invoiceNumber);
                    if (sendResult.success) {
                        emailSyncStats.sent++;
                        item.status = 'sent';
                        console.log(`[Email-Sync] ✓ Invoice ${invoiceNumber} sent to ${foundEmail}`);
                    } else {
                        item.status = 'send_failed';
                        console.log(`[Email-Sync] ✗ Failed to send invoice: ${sendResult.error}`);
                    }
                } catch (sendErr) {
                    item.status = 'send_failed';
                    console.error(`[Email-Sync] Send error:`, sendErr.message);
                }

                // Remove from queue
                emailSyncQueue.delete(dealId);
            } else {
                item.status = 'no_email_found';
                console.log(`[Email-Sync] No email found yet for deal ${dealId} (attempt ${item.attempts}/${item.maxAttempts})`);
            }

        } catch (error) {
            item.status = 'error';
            console.error(`[Email-Sync] Error processing deal ${dealId}:`, error.message);
        }

        // Small delay between processing to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[Email-Sync Daemon] Completed. Stats: synced=${emailSyncStats.synced}, sent=${emailSyncStats.sent}, failed=${emailSyncStats.failed}`);
}

// Helper function to send invoice email
async function sendInvoiceEmail(dealId, email, customerName, amount, invoiceNumber) {
    try {
        // Create payment links
        const stripeLink = `https://app.enterprise-universe.one/pay/${dealId}?method=stripe`;
        const paypalLink = `https://app.enterprise-universe.one/pay/${dealId}?method=paypal`;

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #10b981;">Rechnung ${invoiceNumber}</h2>
                <p>Sehr geehrte/r ${customerName},</p>
                <p>anbei erhalten Sie Ihre Rechnung.</p>
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 18px;"><strong>Betrag: €${amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</strong></p>
                </div>
                <p>Bitte bezahlen Sie über einen der folgenden Links:</p>
                <div style="margin: 20px 0;">
                    <a href="${stripeLink}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">💳 Mit Karte bezahlen</a>
                    <a href="${paypalLink}" style="display: inline-block; background: #0070ba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">PayPal</a>
                </div>
                <p style="color: #6b7280; font-size: 14px;">Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
                <p>Mit freundlichen Grüßen,<br>Ihr Enterprise Universe Team</p>
            </div>
        `;

        // Send via existing email service (HubSpot or SMTP)
        if (typeof sendEmail === 'function') {
            await sendEmail({
                to: email,
                subject: `Rechnung ${invoiceNumber} - €${amount.toLocaleString('de-DE')}`,
                html: emailHtml
            });
            return { success: true };
        } else {
            // Log for manual processing
            console.log(`[Email-Sync] Email queued for ${email}: ${invoiceNumber}`);
            return { success: true, note: 'queued_for_manual' };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Start Email Sync Daemon
setInterval(runEmailSyncDaemon, EMAIL_SYNC_INTERVAL);
console.log(`[Email-Sync Daemon] Started. Interval: ${EMAIL_SYNC_INTERVAL / 60000} minutes`);

// Initial run after 2 minutes
setTimeout(runEmailSyncDaemon, 2 * 60 * 1000);

// API: Get Email Sync Status
app.get('/api/v1/email-sync/status', (req, res) => {
    res.json({
        enabled: emailSyncDaemonEnabled,
        queue_size: emailSyncQueue.size,
        queue: Array.from(emailSyncQueue.values()),
        stats: emailSyncStats,
        last_run: emailSyncStats.lastRun,
        next_run: new Date(lastEmailSyncRun + EMAIL_SYNC_INTERVAL).toISOString(),
        interval_minutes: EMAIL_SYNC_INTERVAL / 60000
    });
});

// API: Toggle Email Sync Daemon
app.post('/api/v1/email-sync/toggle', (req, res) => {
    emailSyncDaemonEnabled = !emailSyncDaemonEnabled;
    console.log(`[Email-Sync Daemon] ${emailSyncDaemonEnabled ? 'Enabled' : 'Disabled'}`);
    res.json({ enabled: emailSyncDaemonEnabled });
});

// API: Manually add deal to sync queue
app.post('/api/v1/email-sync/queue/:dealId', async (req, res) => {
    const { dealId } = req.params;

    try {
        // Get deal info
        const deal = await hubspotRequest(`/crm/v3/objects/deals/${dealId}?properties=dealname,amount`);
        if (!deal) {
            return res.status(404).json({ error: 'Deal not found' });
        }

        queueForEmailSync(dealId, deal.properties?.dealname || `Deal ${dealId}`, parseFloat(deal.properties?.amount) || 0);
        res.json({ success: true, queued: dealId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Run email sync immediately
app.post('/api/v1/email-sync/run', async (req, res) => {
    console.log(`[Email-Sync] Manual run triggered`);
    runEmailSyncDaemon();
    res.json({ success: true, message: 'Email sync daemon started' });
});

// API: Queue all invoices without emails
app.post('/api/v1/email-sync/queue-missing', async (req, res) => {
    try {
        const invoicesData = await getHubSpotData();
        const deals = invoicesData?.deals || [];
        let queued = 0;

        for (const deal of deals) {
            const dealId = deal.id;
            const props = deal.properties || {};

            // Skip if already sent or already in queue
            if (sentInvoices.has(dealId) || emailSyncQueue.has(dealId)) continue;

            // Check if deal has email
            const contact = await findEmailForDeal(props.dealname || '', false);
            if (!contact?.email) {
                queueForEmailSync(dealId, props.dealname || `Deal ${dealId}`, parseFloat(props.amount) || 0);
                queued++;
            }
        }

        res.json({ success: true, queued, total_queue: emailSyncQueue.size });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
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
// WORKFLOW ENGINE API ROUTES
// ═══════════════════════════════════════════════════════════════

// Get all workflows
app.get('/api/v1/workflows', async (req, res) => {
    if (!workflowService) return res.status(500).json({ error: 'Workflow service not available' });
    try {
        const workflows = await workflowService.getAllWorkflows();
        res.json({ workflows, total: workflows.length });
    } catch (error) {
        console.error('[Workflow] Get all error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get workflow trigger types
app.get('/api/v1/workflows/triggers', (req, res) => {
    if (!workflowService) return res.status(500).json({ error: 'Workflow service not available' });
    res.json({ triggers: workflowService.TRIGGER_TYPES });
});

// Get workflow action types
app.get('/api/v1/workflows/actions', (req, res) => {
    if (!workflowService) return res.status(500).json({ error: 'Workflow service not available' });
    res.json({ actions: workflowService.ACTION_TYPES });
});

// Get single workflow
app.get('/api/v1/workflows/:id', async (req, res) => {
    if (!workflowService) return res.status(500).json({ error: 'Workflow service not available' });
    try {
        const workflow = await workflowService.getWorkflowById(req.params.id);
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        res.json(workflow);
    } catch (error) {
        console.error('[Workflow] Get by ID error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new workflow
app.post('/api/v1/workflows', async (req, res) => {
    if (!workflowService) return res.status(500).json({ error: 'Workflow service not available' });
    try {
        const { name, description, trigger_type, triggerType, trigger_config, triggerConfig, is_active } = req.body;
        const workflow = await workflowService.createWorkflow({
            name,
            description,
            triggerType: triggerType || trigger_type,
            triggerConfig: triggerConfig || trigger_config || {},
            createdBy: req.body.user_id || req.body.created_by || null
        });
        res.status(201).json(workflow);
    } catch (error) {
        console.error('[Workflow] Create error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Update workflow
app.patch('/api/v1/workflows/:id', async (req, res) => {
    if (!workflowService) return res.status(500).json({ error: 'Workflow service not available' });
    try {
        const workflow = await workflowService.updateWorkflow(req.params.id, req.body);
        res.json(workflow);
    } catch (error) {
        console.error('[Workflow] Update error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Delete workflow
app.delete('/api/v1/workflows/:id', async (req, res) => {
    if (!workflowService) return res.status(500).json({ error: 'Workflow service not available' });
    try {
        await workflowService.deleteWorkflow(req.params.id);
        res.json({ success: true, message: 'Workflow deleted' });
    } catch (error) {
        console.error('[Workflow] Delete error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get workflow actions
app.get('/api/v1/workflows/:id/actions', async (req, res) => {
    if (!workflowService) return res.status(500).json({ error: 'Workflow service not available' });
    try {
        const actions = await workflowService.getWorkflowActions(req.params.id);
        res.json({ actions, total: actions.length });
    } catch (error) {
        console.error('[Workflow] Get actions error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add action to workflow
app.post('/api/v1/workflows/:id/actions', async (req, res) => {
    if (!workflowService) return res.status(500).json({ error: 'Workflow service not available' });
    try {
        const { action_type, actionType, action_config, actionConfig, step_order, order } = req.body;
        const action = await workflowService.addWorkflowAction(req.params.id, {
            actionType: actionType || action_type,
            actionConfig: actionConfig || action_config || {},
            order: order || step_order
        });
        res.status(201).json(action);
    } catch (error) {
        console.error('[Workflow] Add action error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Update workflow action
app.patch('/api/v1/workflows/:id/actions/:actionId', async (req, res) => {
    if (!workflowService) return res.status(500).json({ error: 'Workflow service not available' });
    try {
        const action = await workflowService.updateWorkflowAction(req.params.actionId, req.body);
        res.json(action);
    } catch (error) {
        console.error('[Workflow] Update action error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Delete workflow action
app.delete('/api/v1/workflows/:id/actions/:actionId', async (req, res) => {
    if (!workflowService) return res.status(500).json({ error: 'Workflow service not available' });
    try {
        await workflowService.deleteWorkflowAction(req.params.actionId);
        res.json({ success: true, message: 'Action deleted' });
    } catch (error) {
        console.error('[Workflow] Delete action error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Execute workflow manually
app.post('/api/v1/workflows/:id/execute', async (req, res) => {
    if (!workflowService) return res.status(500).json({ error: 'Workflow service not available' });
    try {
        const { context } = req.body;
        const result = await workflowService.executeWorkflow(req.params.id, context || {});
        res.json(result);
    } catch (error) {
        console.error('[Workflow] Execute error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Trigger workflow by event
app.post('/api/v1/workflows/trigger', async (req, res) => {
    if (!workflowService) return res.status(500).json({ error: 'Workflow service not available' });
    try {
        const { event_type, context } = req.body;
        const results = await workflowService.triggerWorkflowsByEvent(event_type, context || {});
        res.json({ triggered: results.length, results });
    } catch (error) {
        console.error('[Workflow] Trigger error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get workflow executions (history)
app.get('/api/v1/workflows/:id/executions', async (req, res) => {
    if (!workflowService) return res.status(500).json({ error: 'Workflow service not available' });
    try {
        const limit = parseInt(req.query.limit) || 50;
        const executions = await workflowService.getWorkflowExecutions(req.params.id, limit);
        res.json({ executions, total: executions.length });
    } catch (error) {
        console.error('[Workflow] Get executions error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get workflow stats
app.get('/api/v1/workflows/stats/overview', async (req, res) => {
    if (!workflowService) return res.status(500).json({ error: 'Workflow service not available' });
    try {
        const stats = await workflowService.getWorkflowStats();
        res.json(stats);
    } catch (error) {
        console.error('[Workflow] Stats error:', error);
        res.status(500).json({ error: error.message });
    }
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

// Get Payments / Payment Intents with pagination
app.get('/api/stripe/payments', async (req, res) => {
    if (!stripeLib) return res.status(500).json({ error: 'Stripe not configured' });

    try {
        const limit = parseInt(req.query.limit) || 25;
        const starting_after = req.query.starting_after || null;
        const ending_before = req.query.ending_before || null;

        const params = { limit };
        if (starting_after) params.starting_after = starting_after;
        if (ending_before) params.ending_before = ending_before;

        const payments = await stripeLib.paymentIntents.list(params);

        // Get total count estimate (Stripe doesn't provide exact count, use has_more)
        res.json({
            payments: payments.data,
            has_more: payments.has_more,
            total: payments.data.length, // Approximate
            first_id: payments.data.length > 0 ? payments.data[0].id : null,
            last_id: payments.data.length > 0 ? payments.data[payments.data.length - 1].id : null
        });
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
// GLOBAL ERROR HANDLERS (PM2 Crash Prevention)
// ═══════════════════════════════════════════════════════════════

// Handle uncaught exceptions - log but don't crash
process.on('uncaughtException', (err) => {
    console.error('[CRITICAL] Uncaught Exception:', {
        timestamp: new Date().toISOString(),
        error: err.message,
        stack: err.stack
    });
    // Don't exit - let PM2 decide based on error frequency
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRITICAL] Unhandled Rejection:', {
        timestamp: new Date().toISOString(),
        reason: reason?.message || reason,
        stack: reason?.stack
    });
    // Don't exit - let PM2 decide
});

// Memory monitoring - log warning if memory usage is high
const MEMORY_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MEMORY_WARNING_MB = 400;

setInterval(() => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);

    if (heapUsedMB > MEMORY_WARNING_MB) {
        console.warn(`[Memory Warning] Heap: ${heapUsedMB}/${heapTotalMB}MB, RSS: ${rssMB}MB`);
        // Trigger garbage collection if available
        if (global.gc) {
            console.log('[Memory] Running garbage collection...');
            global.gc();
        }
    }
}, MEMORY_CHECK_INTERVAL);

// ═══════════════════════════════════════════════════════════════
// WEBSOCKET SERVER SETUP
// ═══════════════════════════════════════════════════════════════

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Track connected clients with metadata
const wsClients = new Map();

// Broadcast to all connected clients
function broadcast(eventType, data) {
    const message = JSON.stringify({ type: eventType, data, timestamp: Date.now() });
    wsClients.forEach((meta, client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
            try {
                client.send(message);
            } catch (err) {
                console.error('[WS] Broadcast error:', err.message);
            }
        }
    });
}

// Broadcast to specific channels/subscriptions
function broadcastToChannel(channel, eventType, data) {
    const message = JSON.stringify({ type: eventType, channel, data, timestamp: Date.now() });
    wsClients.forEach((meta, client) => {
        if (client.readyState === 1 && meta.channels?.includes(channel)) {
            try {
                client.send(message);
            } catch (err) {
                console.error('[WS] Channel broadcast error:', err.message);
            }
        }
    });
}

// Make broadcast and clients available globally for other modules
global.wsBroadcast = broadcast;
global.wsBroadcastToChannel = broadcastToChannel;
global.wsClients = wsClients;

// WebSocket connection handler
wss.on('connection', (ws, req) => {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Store client with metadata
    wsClients.set(ws, {
        id: clientId,
        ip: clientIp,
        connectedAt: Date.now(),
        channels: ['global'] // Default channel
    });

    console.log(`[WS] Client connected: ${clientId} (${wsClients.size} total)`);

    // Send welcome message with initial state
    ws.send(JSON.stringify({
        type: 'connected',
        data: {
            clientId,
            serverTime: Date.now(),
            version: '2.0.0'
        }
    }));

    // Handle incoming messages
    ws.on('message', (message) => {
        try {
            const msg = JSON.parse(message.toString());
            const meta = wsClients.get(ws);

            switch (msg.type) {
                case 'subscribe':
                    // Subscribe to channels
                    if (msg.channels && Array.isArray(msg.channels)) {
                        meta.channels = [...new Set([...meta.channels, ...msg.channels])];
                        ws.send(JSON.stringify({ type: 'subscribed', channels: meta.channels }));
                    }
                    break;

                case 'unsubscribe':
                    // Unsubscribe from channels
                    if (msg.channels && Array.isArray(msg.channels)) {
                        meta.channels = meta.channels.filter(c => !msg.channels.includes(c));
                        ws.send(JSON.stringify({ type: 'unsubscribed', channels: meta.channels }));
                    }
                    break;

                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                    break;

                case 'request':
                    // Handle data requests (for initial state after reconnect)
                    handleDataRequest(ws, msg.resource);
                    break;

                default:
                    console.log(`[WS] Unknown message type: ${msg.type}`);
            }
        } catch (err) {
            console.error('[WS] Message parse error:', err.message);
        }
    });

    // Handle client disconnect
    ws.on('close', () => {
        const meta = wsClients.get(ws);
        console.log(`[WS] Client disconnected: ${meta?.id} (${wsClients.size - 1} remaining)`);
        wsClients.delete(ws);
    });

    // Handle errors
    ws.on('error', (err) => {
        console.error('[WS] Client error:', err.message);
        wsClients.delete(ws);
    });
});

// Handle data requests for specific resources
async function handleDataRequest(ws, resource) {
    try {
        let data = null;

        switch (resource) {
            case 'bot-status':
                // Get current bot orchestrator status
                data = { running: false, activeBots: 0, tasks: [] };
                break;

            case 'dashboard-stats':
                // Get dashboard stats
                data = { contacts: 0, deals: 0, pipeline: 0, revenue: 0 };
                break;

            case 'lead-generator':
                // Get lead generator status
                data = { active: false, leadsFound: 0, regions: [] };
                break;

            default:
                data = { error: 'Unknown resource' };
        }

        ws.send(JSON.stringify({
            type: 'data',
            resource,
            data,
            timestamp: Date.now()
        }));
    } catch (err) {
        ws.send(JSON.stringify({
            type: 'error',
            resource,
            error: err.message
        }));
    }
}

// Periodic heartbeat to keep connections alive
setInterval(() => {
    const stats = {
        clients: wsClients.size,
        uptime: process.uptime(),
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    };
    broadcast('heartbeat', stats);
}, 30000);

// ═══════════════════════════════════════════════════════════════
// INVESTOR SIGNUP API
// ═══════════════════════════════════════════════════════════════

const { setupInvestorSignupRoutes } = require('./api/investor-signup');
setupInvestorSignupRoutes(app);

// ═══════════════════════════════════════════════════════════════
// CUSTOMER FILES & REQUIREMENTS API
// ═══════════════════════════════════════════════════════════════

const { setupCustomerFilesRoutes, generateAccessToken } = require('./api/customer-files');
setupCustomerFilesRoutes(app);

// Customer Planning API (AI-powered analysis and project planning)
const { setupCustomerPlanningRoutes } = require('./api/customer-planning');
setupCustomerPlanningRoutes(app);

// Subcontractor Management API
const { setupSubcontractorRoutes } = require('./api/subcontractor-management');
setupSubcontractorRoutes(app);

// Contact Notification Scheduler API
const { setupContactNotificationRoutes } = require('./api/contact-notifications');
setupContactNotificationRoutes(app);

// Send customer requirements form to deal contact
app.post('/api/deals/:dealId/send-requirements-form', async (req, res) => {
    try {
        const { dealId } = req.params;
        const { contactEmail, contactName } = req.body;

        if (!contactEmail) {
            return res.status(400).json({ error: 'Contact email required' });
        }

        const token = generateAccessToken(dealId, dealId);
        const formUrl = `https://app.enterprise-universe.one/projekt-anforderungen.html?id=${dealId}&token=${token}`;

        // Send email with form link
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'send.one.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER || 'invoice@enterprise-universe.com',
                pass: process.env.SMTP_PASS
            }
        });

        await transporter.sendMail({
            from: '"Enterprise Universe" <invoice@enterprise-universe.com>',
            to: contactEmail,
            subject: 'Ihre Projektanforderungen - Enterprise Universe',
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px;">
                    <div style="background: linear-gradient(135deg, #1e3a8a, #7c3aed); color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">Enterprise Universe</h1>
                        <p style="margin: 10px 0 0; opacity: 0.9;">Projektanforderungen erfassen</p>
                    </div>
                    <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px;">
                        <p style="margin: 0 0 20px;">Hallo ${contactName || 'Kunde'},</p>
                        <p style="margin: 0 0 20px;">vielen Dank fur Ihr Vertrauen in Enterprise Universe. Um Ihr Projekt optimal zu planen, bitten wir Sie, Ihre Anforderungen uber unser Online-Formular zu erfassen.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${formUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600;">Anforderungen erfassen</a>
                        </div>
                        <p style="color: #64748b; font-size: 14px;">Sie konnen dort:</p>
                        <ul style="color: #64748b; font-size: 14px;">
                            <li>Ihre gewunschten Module auswahlen</li>
                            <li>Plane und Skizzen hochladen</li>
                            <li>Besondere Wunsche beschreiben</li>
                        </ul>
                        <p style="margin-top: 30px;">Mit freundlichen Grussen,<br><strong>Ihr Enterprise Universe Team</strong></p>
                    </div>
                </div>
            `
        });

        res.json({ success: true, message: 'Form sent to ' + contactEmail });

    } catch (error) {
        console.error('[SEND-REQUIREMENTS] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Bulk send to all won deals
app.post('/api/deals/send-requirements-forms-bulk', async (req, res) => {
    try {
        const { dealIds, sendEmails = false } = req.body;

        if (!dealIds || !Array.isArray(dealIds)) {
            return res.status(400).json({ error: 'dealIds array required' });
        }

        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'send.one.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER || 'invoice@enterprise-universe.com',
                pass: process.env.SMTP_PASS
            }
        });

        const results = [];
        for (const dealId of dealIds) {
            try {
                // Get deal details from HubSpot
                const dealUrl = `/crm/v3/objects/deals/${dealId}?associations=contacts`;
                const deal = await hubspotRequest(dealUrl);

                // Get associated contacts
                const contactIds = deal.associations?.contacts?.results?.map(c => c.id) || [];
                if (contactIds.length > 0) {
                    const contactUrl = `/crm/v3/objects/contacts/${contactIds[0]}?properties=email,firstname,lastname`;
                    const contact = await hubspotRequest(contactUrl);

                    if (contact.properties?.email) {
                        const token = generateAccessToken(dealId, dealId);
                        const contactEmail = contact.properties.email;
                        const contactName = [contact.properties.firstname, contact.properties.lastname].filter(Boolean).join(' ');
                        const formUrl = `https://app.enterprise-universe.one/projekt-anforderungen.html?id=${dealId}&token=${token}`;

                        // Send email if requested
                        if (sendEmails) {
                            await transporter.sendMail({
                                from: '"Enterprise Universe" <invoice@enterprise-universe.com>',
                                to: contactEmail,
                                subject: 'Ihre Projektanforderungen - Enterprise Universe',
                                html: `
                                    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px;">
                                        <div style="background: linear-gradient(135deg, #1e3a8a, #7c3aed); color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                                            <h1 style="margin: 0; font-size: 24px;">Enterprise Universe</h1>
                                            <p style="margin: 10px 0 0; opacity: 0.9;">Projektanforderungen erfassen</p>
                                        </div>
                                        <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px;">
                                            <p style="margin: 0 0 20px;">Hallo ${contactName || 'Kunde'},</p>
                                            <p style="margin: 0 0 20px;">vielen Dank für Ihr Vertrauen in Enterprise Universe. Um Ihr Projekt optimal zu planen, bitten wir Sie, Ihre Anforderungen über unser Online-Formular zu erfassen.</p>
                                            <div style="text-align: center; margin: 30px 0;">
                                                <a href="${formUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600;">Anforderungen erfassen</a>
                                            </div>
                                            <p style="color: #64748b; font-size: 14px;">Sie können dort:</p>
                                            <ul style="color: #64748b; font-size: 14px;">
                                                <li>Ihre gewünschten Module auswählen</li>
                                                <li>Pläne und Skizzen hochladen</li>
                                                <li>Besondere Wünsche beschreiben</li>
                                            </ul>
                                            <p style="margin-top: 30px;">Mit freundlichen Grüßen,<br><strong>Ihr Enterprise Universe Team</strong></p>
                                        </div>
                                    </div>
                                `
                            });
                            console.log(`[BULK-REQUIREMENTS] Email sent to ${contactEmail} for deal ${dealId}`);
                        }

                        results.push({
                            dealId,
                            email: contactEmail,
                            name: contactName,
                            formUrl,
                            status: sendEmails ? 'sent' : 'ready'
                        });
                    }
                }
            } catch (e) {
                results.push({ dealId, status: 'error', error: e.message });
            }
        }

        res.json({
            success: true,
            emailsSent: sendEmails,
            results
        });

    } catch (error) {
        console.error('[BULK-REQUIREMENTS] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send requirement forms to ALL deals in specific stages
app.post('/api/deals/send-forms-all', async (req, res) => {
    try {
        const { stages = ['closedwon', 'won', 'vertragsabschluss'], sendEmails = false, limit = 100 } = req.body;

        console.log(`[SEND-FORMS-ALL] Fetching deals in stages: ${stages.join(', ')}`);

        // Fetch deals from HubSpot in specified stages
        const searchUrl = '/crm/v3/objects/deals/search';
        const searchBody = {
            filterGroups: [{
                filters: stages.map(stage => ({
                    propertyName: 'dealstage',
                    operator: 'EQ',
                    value: stage
                }))
            }],
            properties: ['dealname', 'amount', 'dealstage', 'closedate'],
            limit: Math.min(limit, 100),
            associations: ['contacts']
        };

        // Try search, fallback to basic list if search fails
        let deals = [];
        try {
            const searchResult = await hubspotRequest(searchUrl, 'POST', searchBody);
            deals = searchResult.results || [];
        } catch (searchError) {
            console.log('[SEND-FORMS-ALL] Search failed, using basic list');
            // Fallback: get all deals and filter
            const listResult = await hubspotRequest('/crm/v3/objects/deals?limit=100&associations=contacts');
            deals = (listResult.results || []).filter(d =>
                stages.includes(d.properties?.dealstage?.toLowerCase())
            );
        }

        console.log(`[SEND-FORMS-ALL] Found ${deals.length} deals`);

        if (deals.length === 0) {
            return res.json({
                success: true,
                message: 'Keine Deals in den angegebenen Phasen gefunden',
                sent: 0,
                results: []
            });
        }

        // Setup email transporter if sending
        let transporter = null;
        if (sendEmails) {
            const nodemailer = require('nodemailer');
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'send.one.com',
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER || 'invoice@enterprise-universe.com',
                    pass: process.env.SMTP_PASS
                }
            });
        }

        const results = [];
        let sentCount = 0;
        let errorCount = 0;

        for (const deal of deals) {
            const dealId = deal.id;
            const dealName = deal.properties?.dealname || 'Unbekanntes Projekt';

            try {
                // Get associated contacts
                const contactIds = deal.associations?.contacts?.results?.map(c => c.id) || [];

                if (contactIds.length === 0) {
                    results.push({
                        dealId,
                        dealName,
                        status: 'skipped',
                        reason: 'Kein Kontakt verknuepft'
                    });
                    continue;
                }

                // Get contact details
                const contactUrl = `/crm/v3/objects/contacts/${contactIds[0]}?properties=email,firstname,lastname`;
                const contact = await hubspotRequest(contactUrl);

                if (!contact.properties?.email) {
                    results.push({
                        dealId,
                        dealName,
                        status: 'skipped',
                        reason: 'Keine E-Mail-Adresse'
                    });
                    continue;
                }

                const contactEmail = contact.properties.email;
                const contactName = [contact.properties.firstname, contact.properties.lastname].filter(Boolean).join(' ') || 'Kunde';
                const token = generateAccessToken(dealId, dealId);
                const formUrl = `https://app.enterprise-universe.one/projekt-anforderungen.html?id=${dealId}&token=${token}`;

                // Send email if requested
                if (sendEmails && transporter) {
                    await transporter.sendMail({
                        from: '"Enterprise Universe" <invoice@enterprise-universe.com>',
                        to: contactEmail,
                        subject: `Projektanforderungen: ${dealName} - Enterprise Universe`,
                        html: `
                            <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px;">
                                <div style="background: linear-gradient(135deg, #1e3a8a, #7c3aed); color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                                    <h1 style="margin: 0; font-size: 24px;">Enterprise Universe</h1>
                                    <p style="margin: 10px 0 0; opacity: 0.9;">Projektanforderungen erfassen</p>
                                </div>
                                <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px;">
                                    <p style="margin: 0 0 20px;">Hallo ${contactName},</p>
                                    <p style="margin: 0 0 15px;">vielen Dank fuer Ihr Vertrauen in <strong>Enterprise Universe</strong>.</p>
                                    <p style="margin: 0 0 20px;">Um Ihr Projekt <strong>"${dealName}"</strong> optimal zu planen, bitten wir Sie, Ihre Anforderungen ueber unser Online-Formular zu erfassen.</p>
                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="${formUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600;">Anforderungen erfassen</a>
                                    </div>
                                    <p style="color: #64748b; font-size: 14px;">Im Formular koennen Sie:</p>
                                    <ul style="color: #64748b; font-size: 14px;">
                                        <li>Ihre gewuenschten Smart Home Module auswaehlen</li>
                                        <li>Grundrisse und Plaene hochladen</li>
                                        <li>Besondere Wuensche beschreiben</li>
                                    </ul>
                                    <p style="margin-top: 30px; color: #475569;">Mit freundlichen Gruessen,<br><strong>Ihr Enterprise Universe Team</strong></p>
                                </div>
                            </div>
                        `
                    });
                    sentCount++;
                }

                results.push({
                    dealId,
                    dealName,
                    email: contactEmail,
                    name: contactName,
                    formUrl,
                    status: sendEmails ? 'sent' : 'ready'
                });

            } catch (dealError) {
                errorCount++;
                results.push({
                    dealId,
                    dealName,
                    status: 'error',
                    error: dealError.message
                });
            }

            // Small delay to avoid rate limiting
            if (sendEmails) {
                await new Promise(r => setTimeout(r, 500));
            }
        }

        console.log(`[SEND-FORMS-ALL] Complete: ${sentCount} sent, ${errorCount} errors`);

        res.json({
            success: true,
            totalDeals: deals.length,
            emailsSent: sentCount,
            errors: errorCount,
            skipped: results.filter(r => r.status === 'skipped').length,
            results
        });

    } catch (error) {
        console.error('[SEND-FORMS-ALL] Error:', error);
        res.status(500).json({ error: error.message });
    }
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

// Error handler - Enhanced with detailed logging
app.use((err, req, res, next) => {
    const errorInfo = {
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    };
    console.error('[Server Error]', JSON.stringify(errorInfo, null, 2));
    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ═══════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════

server.listen(PORT, () => {
    console.log(`
═══════════════════════════════════════════════════════════════
  神 HAIKU GOD MODE SERVER RUNNING
═══════════════════════════════════════════════════════════════

  Server:          http://localhost:${PORT}
  WebSocket:       ws://localhost:${PORT}

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
     Investor Signup: POST /api/investor-signup

  WebSocket Events:
     → connected, heartbeat, bot-update, deal-update
     → lead-update, task-update, notification

  Bots Online: ${allBots.length}
  WS Clients: 0
  Power Level: ∞

═══════════════════════════════════════════════════════════════
    `);
});

// Update graceful shutdown to include WebSocket
process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received, closing WebSocket connections...');
    wss.clients.forEach(client => client.close());
    server.close(() => {
        console.log('[Server] HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('[Server] SIGINT received, closing WebSocket connections...');
    wss.clients.forEach(client => client.close());
    server.close(() => {
        console.log('[Server] HTTP server closed');
        process.exit(0);
    });
});

module.exports = { app, server, wss, broadcast, broadcastToChannel };
