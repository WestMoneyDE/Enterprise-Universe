/**
 * Customer Planning API
 * AI-powered customer requirements analysis and project planning
 *
 * Uses the KUNDENKARTEN PLANNER bot to:
 * - Analyze customer requirements
 * - Generate detailed project plans
 * - Create cost estimates
 * - Recommend system configurations
 *
 * Enterprise Universe - West Money Bau GmbH
 * @version 1.0.0
 */

const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const fs = require('fs');

// Import shared customer data functions
const { loadCustomerData, saveCustomerData } = require('./customer-files');

// Import notification scheduler
const { scheduleFromCommunicationPlan } = require('./contact-notifications');

// Bot configuration path
const BOTS_CONFIG_PATH = path.join(__dirname, '..', 'genius-bots-extended.json');

// Initialize Anthropic client (lazy)
let anthropic = null;
function getAnthropicClient() {
    if (!anthropic) {
        anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });
    }
    return anthropic;
}

// Load bot configuration
function getKundenkartenPlannerBot() {
    try {
        const config = JSON.parse(fs.readFileSync(BOTS_CONFIG_PATH, 'utf8'));
        const bot = config.new_bots?.find(b => b.id === 'kundenkarten_planner');
        return bot || {
            id: 'kundenkarten_planner',
            name: 'KUNDENKARTEN PLANNER',
            model: 'claude-3-haiku-20240307',
            temperature: 0.4,
            systemPrompt: 'Du bist ein Experte fuer Smart Home und Industrie 4.0 Projektplanung.'
        };
    } catch (e) {
        console.error('[CUSTOMER-PLANNING] Failed to load bot config:', e.message);
        return {
            id: 'kundenkarten_planner',
            model: 'claude-3-haiku-20240307',
            temperature: 0.4
        };
    }
}

/**
 * Build context from customer data for AI analysis
 */
function buildCustomerContext(customerData, customerId) {
    const files = customerData.files || { sketches: [], documents: [], photos: [] };
    const wishes = customerData.wishes || [];
    const systemConfig = customerData.systemConfig || {};
    const formData = customerData.formData || {};

    return `
KUNDE: ${customerId}

=== KUNDENWUENSCHE ===
${wishes.length > 0 ? wishes.map((w, i) => `${i + 1}. ${w.category}: ${w.description} (Prioritaet: ${w.priority})`).join('\n') : 'Keine Wuensche erfasst'}

=== SYSTEMKONFIGURATION ===
Sektor: ${systemConfig.sector || formData.sector || 'Nicht angegeben'}
Gebaeudetyp: ${systemConfig.buildingType || formData.buildingType || 'Nicht angegeben'}
Groesse: ${systemConfig.size || formData.size || 'Nicht angegeben'}
Module: ${(systemConfig.modules || formData.modules || []).join(', ') || 'Keine Module ausgewaehlt'}
Budget: ${systemConfig.budget || formData.budget || 'Nicht angegeben'}

=== DOKUMENTE ===
Skizzen: ${files.sketches?.length || 0} Dateien
Dokumente: ${files.documents?.length || 0} Dateien
Fotos: ${files.photos?.length || 0} Dateien

=== ZUSAETZLICHE INFOS ===
${formData.additionalInfo || formData.notes || 'Keine zusaetzlichen Informationen'}
`;
}

/**
 * Analyze customer requirements with AI
 */
async function analyzeCustomerRequirements(req, res) {
    try {
        const { customerId } = req.params;
        const allData = loadCustomerData();
        const customerData = allData[customerId];

        if (!customerData) {
            return res.status(404).json({
                success: false,
                error: 'Kundendaten nicht gefunden'
            });
        }

        const bot = getKundenkartenPlannerBot();
        const client = getAnthropicClient();
        const context = buildCustomerContext(customerData, customerId);

        console.log(`[CUSTOMER-PLANNING] Analyzing requirements for customer: ${customerId}`);

        const response = await client.messages.create({
            model: bot.model,
            max_tokens: 2048,
            temperature: bot.temperature,
            system: bot.systemPrompt,
            messages: [{
                role: 'user',
                content: `Analysiere die folgenden Kundenanforderungen und erstelle eine Zusammenfassung:

${context}

AUFGABE:
1. Fasse die Hauptanforderungen zusammen
2. Bewerte die technische Machbarkeit (hoch/mittel/niedrig)
3. Identifiziere potenzielle Herausforderungen
4. Gib 3-5 konkrete Empfehlungen

Antworte im JSON-Format:
{
  "summary": "Zusammenfassung der Anforderungen",
  "feasibility": "high|medium|low",
  "challenges": ["Herausforderung 1", "Herausforderung 2"],
  "recommendations": ["Empfehlung 1", "Empfehlung 2", ...]
}`
            }]
        });

        // Parse AI response
        let analysis;
        try {
            const content = response.content[0].text;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {
                summary: content,
                feasibility: 'medium',
                challenges: [],
                recommendations: []
            };
        } catch (parseError) {
            analysis = {
                summary: response.content[0].text,
                feasibility: 'medium',
                challenges: [],
                recommendations: []
            };
        }

        // Save analysis to customer data
        allData[customerId].aiAnalysis = {
            generatedAt: new Date().toISOString(),
            botId: bot.id,
            ...analysis
        };
        allData[customerId].status = 'analyzed';
        allData[customerId].updatedAt = new Date().toISOString();
        saveCustomerData(allData);

        console.log(`[CUSTOMER-PLANNING] Analysis completed for: ${customerId}`);

        res.json({
            success: true,
            analysis: allData[customerId].aiAnalysis
        });

    } catch (error) {
        console.error('[CUSTOMER-PLANNING] Analysis error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Generate detailed project plan with AI
 */
async function generateProjectPlan(req, res) {
    try {
        const { customerId } = req.params;
        const allData = loadCustomerData();
        const customerData = allData[customerId];

        if (!customerData) {
            return res.status(404).json({
                success: false,
                error: 'Kundendaten nicht gefunden'
            });
        }

        const bot = getKundenkartenPlannerBot();
        const client = getAnthropicClient();
        const context = buildCustomerContext(customerData, customerId);
        const analysis = customerData.aiAnalysis || {};

        console.log(`[CUSTOMER-PLANNING] Generating project plan for: ${customerId}`);

        const response = await client.messages.create({
            model: bot.model,
            max_tokens: 3000,
            temperature: bot.temperature,
            system: bot.systemPrompt,
            messages: [{
                role: 'user',
                content: `Erstelle einen detaillierten Projektplan basierend auf diesen Kundenanforderungen:

${context}

VORHERIGE ANALYSE:
${analysis.summary || 'Keine vorherige Analyse verfuegbar'}

AUFGABE:
Erstelle einen vollstaendigen Projektplan mit Meilensteinen.

Antworte im JSON-Format:
{
  "name": "Projektname",
  "description": "Kurzbeschreibung",
  "milestones": [
    {
      "phase": "Planungsphase",
      "tasks": ["Aufgabe 1", "Aufgabe 2"],
      "deliverables": ["Ergebnis 1"]
    },
    {
      "phase": "Installationsphase",
      "tasks": ["Aufgabe 1", "Aufgabe 2"],
      "deliverables": ["Ergebnis 1"]
    }
  ],
  "totalPhases": 4,
  "keyDeliverables": ["Hauptergebnis 1", "Hauptergebnis 2"],
  "prerequisites": ["Voraussetzung 1", "Voraussetzung 2"]
}`
            }]
        });

        // Parse AI response
        let projectPlan;
        try {
            const content = response.content[0].text;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            projectPlan = jsonMatch ? JSON.parse(jsonMatch[0]) : {
                name: 'Smart Home Projekt',
                description: content,
                milestones: [],
                keyDeliverables: []
            };
        } catch (parseError) {
            projectPlan = {
                name: 'Smart Home Projekt',
                description: response.content[0].text,
                milestones: [],
                keyDeliverables: []
            };
        }

        // Save project plan
        allData[customerId].projectPlan = {
            generatedAt: new Date().toISOString(),
            botId: bot.id,
            ...projectPlan
        };
        allData[customerId].status = 'planned';
        allData[customerId].updatedAt = new Date().toISOString();
        saveCustomerData(allData);

        console.log(`[CUSTOMER-PLANNING] Project plan generated for: ${customerId}`);

        res.json({
            success: true,
            projectPlan: allData[customerId].projectPlan
        });

    } catch (error) {
        console.error('[CUSTOMER-PLANNING] Plan generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Generate cost estimate with AI
 */
async function generateCostEstimate(req, res) {
    try {
        const { customerId } = req.params;
        const allData = loadCustomerData();
        const customerData = allData[customerId];

        if (!customerData) {
            return res.status(404).json({
                success: false,
                error: 'Kundendaten nicht gefunden'
            });
        }

        const bot = getKundenkartenPlannerBot();
        const client = getAnthropicClient();
        const context = buildCustomerContext(customerData, customerId);

        console.log(`[CUSTOMER-PLANNING] Generating cost estimate for: ${customerId}`);

        const response = await client.messages.create({
            model: bot.model,
            max_tokens: 2500,
            temperature: bot.temperature,
            system: `${bot.systemPrompt}

Du hast Zugriff auf folgende Preiskataloge:
- Loxone Miniserver: 800-1500 EUR
- Loxone Extensions: 150-400 EUR pro Stueck
- KNX Aktoren: 100-300 EUR pro Stueck
- Sensoren: 50-200 EUR pro Stueck
- Verkabelung: 15-30 EUR pro Meter
- Installation: 60-90 EUR pro Stunde
- Programmierung: 80-120 EUR pro Stunde`,
            messages: [{
                role: 'user',
                content: `Erstelle einen detaillierten Kostenvoranschlag basierend auf diesen Anforderungen:

${context}

AUFGABE:
Erstelle einen realistischen Kostenvoranschlag mit Einzelpositionen.

Antworte im JSON-Format:
{
  "components": [
    { "name": "Komponente", "quantity": 1, "unitCost": 100, "total": 100 }
  ],
  "laborCost": 5000,
  "programmingCost": 2000,
  "subtotal": 10000,
  "contingency": 1000,
  "totalEstimate": 11000,
  "currency": "EUR",
  "notes": "Zusaetzliche Hinweise"
}`
            }]
        });

        // Parse AI response
        let costEstimate;
        try {
            const content = response.content[0].text;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            costEstimate = jsonMatch ? JSON.parse(jsonMatch[0]) : {
                totalEstimate: 0,
                currency: 'EUR',
                notes: content
            };
        } catch (parseError) {
            costEstimate = {
                components: [],
                totalEstimate: 0,
                currency: 'EUR',
                notes: response.content[0].text
            };
        }

        // Save cost estimate
        allData[customerId].costEstimate = {
            generatedAt: new Date().toISOString(),
            botId: bot.id,
            ...costEstimate
        };
        allData[customerId].updatedAt = new Date().toISOString();
        saveCustomerData(allData);

        console.log(`[CUSTOMER-PLANNING] Cost estimate generated for: ${customerId}`);

        res.json({
            success: true,
            costEstimate: allData[customerId].costEstimate
        });

    } catch (error) {
        console.error('[CUSTOMER-PLANNING] Cost estimate error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Suggest optimal system configuration with AI
 */
async function suggestSystemConfiguration(req, res) {
    try {
        const { customerId } = req.params;
        const allData = loadCustomerData();
        const customerData = allData[customerId];

        if (!customerData) {
            return res.status(404).json({
                success: false,
                error: 'Kundendaten nicht gefunden'
            });
        }

        const bot = getKundenkartenPlannerBot();
        const client = getAnthropicClient();
        const context = buildCustomerContext(customerData, customerId);

        console.log(`[CUSTOMER-PLANNING] Suggesting configuration for: ${customerId}`);

        const response = await client.messages.create({
            model: bot.model,
            max_tokens: 2500,
            temperature: bot.temperature,
            system: `${bot.systemPrompt}

Du kennst folgende Systeme:
- LOXONE: Miniserver, Extensions, Touch, Air, Tree
- KNX: Aktoren, Sensoren, Gateways
- Industrie 4.0: SCADA, MES, PLC, IoT-Gateways
- Integration: Modbus, BACnet, MQTT, OPC UA`,
            messages: [{
                role: 'user',
                content: `Empfehle die optimale Systemkonfiguration basierend auf diesen Anforderungen:

${context}

AUFGABE:
Empfehle die beste Systemkonfiguration fuer diesen Kunden.

Antworte im JSON-Format:
{
  "recommendedSystem": "LOXONE|KNX|HYBRID|INDUSTRIE",
  "modules": ["Licht", "Klima", "Sicherheit"],
  "components": [
    { "name": "Komponente", "type": "controller|sensor|actuator", "reason": "Begruendung" }
  ],
  "integrations": ["LOXONE", "KNX"],
  "protocols": ["Modbus", "KNX"],
  "scalability": "Erweiterungsmoeglichkeiten",
  "reasoning": "Begruendung der Empfehlung"
}`
            }]
        });

        // Parse AI response
        let suggestedConfig;
        try {
            const content = response.content[0].text;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            suggestedConfig = jsonMatch ? JSON.parse(jsonMatch[0]) : {
                recommendedSystem: 'HYBRID',
                modules: [],
                components: [],
                reasoning: content
            };
        } catch (parseError) {
            suggestedConfig = {
                recommendedSystem: 'HYBRID',
                modules: [],
                components: [],
                reasoning: response.content[0].text
            };
        }

        // Save suggested configuration
        allData[customerId].suggestedConfig = {
            generatedAt: new Date().toISOString(),
            botId: bot.id,
            ...suggestedConfig
        };
        allData[customerId].updatedAt = new Date().toISOString();
        saveCustomerData(allData);

        console.log(`[CUSTOMER-PLANNING] Configuration suggested for: ${customerId}`);

        res.json({
            success: true,
            suggestedConfig: allData[customerId].suggestedConfig
        });

    } catch (error) {
        console.error('[CUSTOMER-PLANNING] Config suggestion error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Run full AI pipeline: analyze -> plan -> estimate -> configure
 */
async function runFullPipeline(req, res) {
    try {
        const { customerId } = req.params;
        const allData = loadCustomerData();
        const customerData = allData[customerId];

        if (!customerData) {
            return res.status(404).json({
                success: false,
                error: 'Kundendaten nicht gefunden'
            });
        }

        console.log(`[CUSTOMER-PLANNING] Running full pipeline for: ${customerId}`);

        // Update status
        allData[customerId].status = 'processing';
        allData[customerId].pipelineStartedAt = new Date().toISOString();
        saveCustomerData(allData);

        const bot = getKundenkartenPlannerBot();
        const client = getAnthropicClient();
        const context = buildCustomerContext(customerData, customerId);

        // Single comprehensive AI call for efficiency
        const response = await client.messages.create({
            model: bot.model,
            max_tokens: 4000,
            temperature: bot.temperature,
            system: bot.systemPrompt,
            messages: [{
                role: 'user',
                content: `Analysiere diese Kundenanforderungen und erstelle einen vollstaendigen Plan:

${context}

AUFGABE:
Erstelle eine vollstaendige Analyse mit:
1. Anforderungsanalyse
2. Projektplan
3. Kostenvoranschlag
4. Systemempfehlung

Antworte im JSON-Format:
{
  "analysis": {
    "summary": "Zusammenfassung",
    "feasibility": "high|medium|low",
    "challenges": [],
    "recommendations": []
  },
  "projectPlan": {
    "name": "Projektname",
    "milestones": [
      { "phase": "Phase 1", "tasks": [], "deliverables": [] }
    ],
    "keyDeliverables": []
  },
  "costEstimate": {
    "components": [
      { "name": "Komponente", "quantity": 1, "unitCost": 100, "total": 100 }
    ],
    "laborCost": 0,
    "totalEstimate": 0,
    "currency": "EUR"
  },
  "suggestedConfig": {
    "recommendedSystem": "LOXONE",
    "modules": [],
    "components": [],
    "integrations": []
  }
}`
            }]
        });

        // Parse comprehensive response
        let fullPlan;
        try {
            const content = response.content[0].text;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            fullPlan = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } catch (parseError) {
            console.error('[CUSTOMER-PLANNING] Parse error:', parseError);
            fullPlan = {};
        }

        // Save all results
        const timestamp = new Date().toISOString();
        allData[customerId].aiAnalysis = {
            generatedAt: timestamp,
            botId: bot.id,
            ...(fullPlan.analysis || {})
        };
        allData[customerId].projectPlan = {
            generatedAt: timestamp,
            botId: bot.id,
            ...(fullPlan.projectPlan || {})
        };
        allData[customerId].costEstimate = {
            generatedAt: timestamp,
            botId: bot.id,
            ...(fullPlan.costEstimate || {})
        };
        allData[customerId].suggestedConfig = {
            generatedAt: timestamp,
            botId: bot.id,
            ...(fullPlan.suggestedConfig || {})
        };
        allData[customerId].status = 'planned';
        allData[customerId].pipelineCompletedAt = timestamp;
        allData[customerId].updatedAt = timestamp;
        saveCustomerData(allData);

        console.log(`[CUSTOMER-PLANNING] Full pipeline completed for: ${customerId}`);

        res.json({
            success: true,
            customerId,
            status: 'planned',
            analysis: allData[customerId].aiAnalysis,
            projectPlan: allData[customerId].projectPlan,
            costEstimate: allData[customerId].costEstimate,
            suggestedConfig: allData[customerId].suggestedConfig
        });

    } catch (error) {
        console.error('[CUSTOMER-PLANNING] Full pipeline error:', error);

        // Update status to failed
        const allData = loadCustomerData();
        if (allData[req.params.customerId]) {
            allData[req.params.customerId].status = 'failed';
            allData[req.params.customerId].error = error.message;
            saveCustomerData(allData);
        }

        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Get all AI-generated data for a customer
 */
async function getCustomerPlanData(req, res) {
    try {
        const { customerId } = req.params;
        const allData = loadCustomerData();
        const customerData = allData[customerId];

        if (!customerData) {
            return res.json({
                success: true,
                exists: false,
                aiAnalysis: null,
                projectPlan: null,
                costEstimate: null,
                suggestedConfig: null,
                status: null
            });
        }

        res.json({
            success: true,
            exists: true,
            customerId,
            status: customerData.status || 'pending',
            aiAnalysis: customerData.aiAnalysis || null,
            projectPlan: customerData.projectPlan || null,
            costEstimate: customerData.costEstimate || null,
            suggestedConfig: customerData.suggestedConfig || null,
            subcontractorPlan: customerData.subcontractorPlan || null,
            communicationSchedule: customerData.communicationSchedule || null,
            pipelineStartedAt: customerData.pipelineStartedAt,
            pipelineCompletedAt: customerData.pipelineCompletedAt
        });

    } catch (error) {
        console.error('[CUSTOMER-PLANNING] Get plan data error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * List all customers with pending requirements (for background processing)
 */
async function listPendingCustomers(req, res) {
    try {
        const allData = loadCustomerData();
        const pending = [];

        for (const [customerId, data] of Object.entries(allData)) {
            if (!data.status || data.status === 'pending') {
                pending.push({
                    customerId,
                    createdAt: data.createdAt,
                    hasWishes: (data.wishes?.length || 0) > 0,
                    hasFiles: Object.values(data.files || {}).some(arr => arr.length > 0),
                    hasFormData: !!data.formData
                });
            }
        }

        res.json({
            success: true,
            count: pending.length,
            customers: pending
        });

    } catch (error) {
        console.error('[CUSTOMER-PLANNING] List pending error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Generate subcontractor coordination plan with AI
 */
async function generateSubcontractorPlan(req, res) {
    try {
        const { customerId } = req.params;
        const allData = loadCustomerData();
        const customerData = allData[customerId];

        if (!customerData) {
            return res.status(404).json({
                success: false,
                error: 'Kundendaten nicht gefunden'
            });
        }

        // Load available subcontractors
        let subcontractors = [];
        try {
            const { loadSubcontractors } = require('./subcontractor-management');
            const subData = loadSubcontractors();
            subcontractors = subData.subcontractors || [];
        } catch (e) {
            console.log('[CUSTOMER-PLANNING] Subcontractor data not available');
        }

        const bot = getKundenkartenPlannerBot();
        const client = getAnthropicClient();
        const context = buildCustomerContext(customerData, customerId);

        console.log(`[CUSTOMER-PLANNING] Generating subcontractor plan for: ${customerId}`);

        const subcontractorList = subcontractors.map(s =>
            `- ${s.name} (${s.type}): ${s.specializations.join(', ')} - Bewertung: ${s.rating}/5 - ${s.hourlyRate} EUR/h`
        ).join('\n');

        const response = await client.messages.create({
            model: bot.model,
            max_tokens: 3000,
            temperature: bot.temperature,
            system: `${bot.systemPrompt}

Du planst die Koordination von Subunternehmern fuer Projekte. Beruecksichtige:
- Welche Gewerke benoetigt werden
- Optimale Reihenfolge der Arbeiten
- Abhaengigkeiten zwischen Gewerken
- Zeitliche Planung und Koordination`,
            messages: [{
                role: 'user',
                content: `Erstelle einen Subunternehmer-Koordinationsplan fuer dieses Projekt:

${context}

VERFUEGBARE SUBUNTERNEHMER:
${subcontractorList || 'Keine Subunternehmer-Datenbank verfuegbar'}

AUFGABE:
Erstelle einen detaillierten Plan welche Subunternehmer wann benoetigt werden.

Antworte im JSON-Format:
{
  "requiredTrades": [
    {
      "trade": "Gewerk-Name",
      "tasks": ["Aufgabe 1", "Aufgabe 2"],
      "recommendedSubcontractor": "Name oder null",
      "phase": "Planung|Installation|Inbetriebnahme",
      "sequence": 1,
      "dependsOn": [],
      "estimatedDays": 5
    }
  ],
  "coordinationNotes": ["Hinweis 1", "Hinweis 2"],
  "criticalPath": ["Gewerk 1 -> Gewerk 2 -> Gewerk 3"],
  "parallelWorkPossible": [["Gewerk A", "Gewerk B"]]
}`
            }]
        });

        // Parse AI response
        let subcontractorPlan;
        try {
            const content = response.content[0].text;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            subcontractorPlan = jsonMatch ? JSON.parse(jsonMatch[0]) : {
                requiredTrades: [],
                coordinationNotes: [content]
            };
        } catch (parseError) {
            subcontractorPlan = {
                requiredTrades: [],
                coordinationNotes: [response.content[0].text]
            };
        }

        // Save subcontractor plan
        allData[customerId].subcontractorPlan = {
            generatedAt: new Date().toISOString(),
            botId: bot.id,
            ...subcontractorPlan
        };
        allData[customerId].updatedAt = new Date().toISOString();
        saveCustomerData(allData);

        console.log(`[CUSTOMER-PLANNING] Subcontractor plan generated for: ${customerId}`);

        res.json({
            success: true,
            subcontractorPlan: allData[customerId].subcontractorPlan
        });

    } catch (error) {
        console.error('[CUSTOMER-PLANNING] Subcontractor plan error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Generate communication/contact schedule with AI
 */
async function generateCommunicationSchedule(req, res) {
    try {
        const { customerId } = req.params;
        const allData = loadCustomerData();
        const customerData = allData[customerId];

        if (!customerData) {
            return res.status(404).json({
                success: false,
                error: 'Kundendaten nicht gefunden'
            });
        }

        const bot = getKundenkartenPlannerBot();
        const client = getAnthropicClient();
        const context = buildCustomerContext(customerData, customerId);

        console.log(`[CUSTOMER-PLANNING] Generating communication schedule for: ${customerId}`);

        const response = await client.messages.create({
            model: bot.model,
            max_tokens: 2500,
            temperature: bot.temperature,
            system: `${bot.systemPrompt}

Du planst die Kommunikation und Kontaktpunkte fuer Projekte. Beruecksichtige:
- Regelmaessige Kundeninformationen
- Abstimmungen mit Subunternehmern
- Meilenstein-Reviews
- Abnahmen und Uebergaben
- Follow-up nach Projektabschluss`,
            messages: [{
                role: 'user',
                content: `Erstelle einen Kommunikationsplan fuer dieses Projekt:

${context}

PROJEKTPLAN: ${customerData.projectPlan?.name || 'Nicht verfuegbar'}
MEILENSTEINE: ${(customerData.projectPlan?.milestones || []).map(m => m.phase).join(', ') || 'Nicht verfuegbar'}

AUFGABE:
Erstelle einen detaillierten Kommunikations- und Kontaktplan.

Antworte im JSON-Format:
{
  "customerContacts": [
    {
      "type": "Kickoff|Update|Review|Abnahme|Follow-up",
      "purpose": "Zweck des Kontakts",
      "timing": "Zu Beginn|Woechentlich|Bei Meilenstein|Nach Abschluss",
      "method": "Telefonat|E-Mail|Vor-Ort-Termin|Video-Call",
      "attendees": ["Projektleiter", "Kunde"],
      "agenda": ["Punkt 1", "Punkt 2"]
    }
  ],
  "subcontractorContacts": [
    {
      "trade": "Gewerk",
      "type": "Beauftragung|Abstimmung|Abnahme",
      "timing": "Zeitpunkt",
      "method": "Kontaktmethode"
    }
  ],
  "internalMeetings": [
    {
      "type": "Planungsmeeting|Statusmeeting",
      "frequency": "Woechentlich|Bei Bedarf",
      "attendees": ["Team"]
    }
  ],
  "escalationPath": ["Stufe 1: Projektleiter", "Stufe 2: Geschaeftsfuehrung"],
  "documentationSchedule": ["Woechentlicher Statusbericht", "Fotodokumentation"]
}`
            }]
        });

        // Parse AI response
        let communicationSchedule;
        try {
            const content = response.content[0].text;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            communicationSchedule = jsonMatch ? JSON.parse(jsonMatch[0]) : {
                customerContacts: [],
                subcontractorContacts: [],
                notes: content
            };
        } catch (parseError) {
            communicationSchedule = {
                customerContacts: [],
                subcontractorContacts: [],
                notes: response.content[0].text
            };
        }

        // Save communication schedule
        allData[customerId].communicationSchedule = {
            generatedAt: new Date().toISOString(),
            botId: bot.id,
            ...communicationSchedule
        };
        allData[customerId].updatedAt = new Date().toISOString();
        saveCustomerData(allData);

        console.log(`[CUSTOMER-PLANNING] Communication schedule generated for: ${customerId}`);

        res.json({
            success: true,
            communicationSchedule: allData[customerId].communicationSchedule
        });

    } catch (error) {
        console.error('[CUSTOMER-PLANNING] Communication schedule error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Run extended full pipeline including subcontractors and communication
 */
async function runExtendedPipeline(req, res) {
    try {
        const { customerId } = req.params;
        const allData = loadCustomerData();
        const customerData = allData[customerId];

        if (!customerData) {
            return res.status(404).json({
                success: false,
                error: 'Kundendaten nicht gefunden'
            });
        }

        console.log(`[CUSTOMER-PLANNING] Running EXTENDED pipeline for: ${customerId}`);

        // Update status
        allData[customerId].status = 'processing';
        allData[customerId].pipelineStartedAt = new Date().toISOString();
        saveCustomerData(allData);

        // Load subcontractors for context
        let subcontractors = [];
        try {
            const { loadSubcontractors } = require('./subcontractor-management');
            const subData = loadSubcontractors();
            subcontractors = subData.subcontractors || [];
        } catch (e) {
            console.log('[CUSTOMER-PLANNING] Subcontractor data not available');
        }

        const bot = getKundenkartenPlannerBot();
        const client = getAnthropicClient();
        const context = buildCustomerContext(customerData, customerId);

        const subcontractorList = subcontractors.slice(0, 8).map(s =>
            `${s.name} (${s.type}): ${s.specializations.slice(0, 3).join(', ')}`
        ).join('; ');

        // Comprehensive AI call including subcontractors and communication
        const response = await client.messages.create({
            model: bot.model,
            max_tokens: 4000,
            temperature: bot.temperature,
            system: bot.systemPrompt,
            messages: [{
                role: 'user',
                content: `Erstelle einen VOLLSTAENDIGEN Projektplan mit Subunternehmer-Koordination und Kommunikationsplan:

${context}

VERFUEGBARE SUBUNTERNEHMER:
${subcontractorList || 'Standard-Gewerke verfuegbar'}

AUFGABE:
Erstelle eine vollstaendige Projektplanung mit:
1. Anforderungsanalyse
2. Projektplan mit Meilensteinen
3. Kostenvoranschlag
4. Systemempfehlung
5. Subunternehmer-Koordination
6. Kommunikationsplan

Antworte im JSON-Format:
{
  "analysis": {
    "summary": "Zusammenfassung",
    "feasibility": "high|medium|low",
    "challenges": [],
    "recommendations": []
  },
  "projectPlan": {
    "name": "Projektname",
    "milestones": [
      { "phase": "Phase", "tasks": [], "deliverables": [] }
    ],
    "keyDeliverables": []
  },
  "costEstimate": {
    "components": [
      { "name": "Komponente", "quantity": 1, "unitCost": 100, "total": 100 }
    ],
    "laborCost": 0,
    "totalEstimate": 0,
    "currency": "EUR"
  },
  "suggestedConfig": {
    "recommendedSystem": "LOXONE",
    "modules": [],
    "integrations": []
  },
  "subcontractorPlan": {
    "requiredTrades": [
      {
        "trade": "Gewerk",
        "tasks": [],
        "recommendedSubcontractor": "Name",
        "phase": "Installation",
        "sequence": 1,
        "estimatedDays": 5,
        "contactTiming": "2 Wochen vor Start"
      }
    ],
    "criticalPath": [],
    "coordinationNotes": []
  },
  "communicationSchedule": {
    "customerContacts": [
      {
        "type": "Kickoff",
        "purpose": "Projektstart",
        "timing": "Tag 1",
        "method": "Vor-Ort-Termin",
        "agenda": []
      }
    ],
    "subcontractorContacts": [
      {
        "trade": "Gewerk",
        "type": "Beauftragung",
        "timing": "2 Wochen vor Start",
        "method": "Telefonat + E-Mail"
      }
    ],
    "statusUpdates": "Woechentlich per E-Mail",
    "escalationPath": []
  }
}`
            }]
        });

        // Parse comprehensive response
        let fullPlan;
        try {
            const content = response.content[0].text;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            fullPlan = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } catch (parseError) {
            console.error('[CUSTOMER-PLANNING] Parse error:', parseError);
            fullPlan = {};
        }

        // Save all results
        const timestamp = new Date().toISOString();
        allData[customerId].aiAnalysis = {
            generatedAt: timestamp,
            botId: bot.id,
            ...(fullPlan.analysis || {})
        };
        allData[customerId].projectPlan = {
            generatedAt: timestamp,
            botId: bot.id,
            ...(fullPlan.projectPlan || {})
        };
        allData[customerId].costEstimate = {
            generatedAt: timestamp,
            botId: bot.id,
            ...(fullPlan.costEstimate || {})
        };
        allData[customerId].suggestedConfig = {
            generatedAt: timestamp,
            botId: bot.id,
            ...(fullPlan.suggestedConfig || {})
        };
        allData[customerId].subcontractorPlan = {
            generatedAt: timestamp,
            botId: bot.id,
            ...(fullPlan.subcontractorPlan || {})
        };
        allData[customerId].communicationSchedule = {
            generatedAt: timestamp,
            botId: bot.id,
            ...(fullPlan.communicationSchedule || {})
        };
        allData[customerId].status = 'fully_planned';
        allData[customerId].pipelineCompletedAt = timestamp;
        allData[customerId].updatedAt = timestamp;
        saveCustomerData(allData);

        // Schedule email notifications for all contact points
        let notificationsScheduled = 0;
        try {
            const communicationSchedule = allData[customerId].communicationSchedule || {};
            const customerData = {
                email: allData[customerId].customerEmail || allData[customerId].email,
                name: allData[customerId].customerName || allData[customerId].name || 'Kunde'
            };
            const projectData = {
                name: allData[customerId].projectPlan?.name || `Projekt ${customerId}`,
                customerName: customerData.name,
                customerEmail: customerData.email,
                startDate: allData[customerId].projectPlan?.startDate
            };

            const notificationResult = scheduleFromCommunicationPlan(
                customerId,
                customerData,
                communicationSchedule,
                projectData
            );
            notificationsScheduled = notificationResult.scheduled || 0;
            console.log(`[CUSTOMER-PLANNING] Scheduled ${notificationsScheduled} contact notifications`);
        } catch (notifError) {
            console.error('[CUSTOMER-PLANNING] Notification scheduling error:', notifError.message);
            // Don't fail the pipeline if notifications fail
        }

        console.log(`[CUSTOMER-PLANNING] Extended pipeline completed for: ${customerId}`);

        res.json({
            success: true,
            customerId,
            status: 'fully_planned',
            analysis: allData[customerId].aiAnalysis,
            projectPlan: allData[customerId].projectPlan,
            costEstimate: allData[customerId].costEstimate,
            suggestedConfig: allData[customerId].suggestedConfig,
            subcontractorPlan: allData[customerId].subcontractorPlan,
            communicationSchedule: allData[customerId].communicationSchedule,
            notificationsScheduled
        });

    } catch (error) {
        console.error('[CUSTOMER-PLANNING] Extended pipeline error:', error);

        const allData = loadCustomerData();
        if (allData[req.params.customerId]) {
            allData[req.params.customerId].status = 'failed';
            allData[req.params.customerId].error = error.message;
            saveCustomerData(allData);
        }

        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Setup routes for customer planning API
 */
function setupCustomerPlanningRoutes(app) {
    const express = require('express');

    // Analyze requirements
    app.post('/api/customer/:customerId/analyze', express.json(), analyzeCustomerRequirements);

    // Generate project plan
    app.post('/api/customer/:customerId/generate-plan', express.json(), generateProjectPlan);

    // Generate cost estimate
    app.post('/api/customer/:customerId/estimate-costs', express.json(), generateCostEstimate);

    // Suggest system configuration
    app.post('/api/customer/:customerId/suggest-config', express.json(), suggestSystemConfiguration);

    // Generate subcontractor coordination plan
    app.post('/api/customer/:customerId/subcontractor-plan', express.json(), generateSubcontractorPlan);

    // Generate communication schedule
    app.post('/api/customer/:customerId/communication-schedule', express.json(), generateCommunicationSchedule);

    // Run full pipeline (basic)
    app.post('/api/customer/:customerId/full-pipeline', express.json(), runFullPipeline);

    // Run extended pipeline (includes subcontractors & communication)
    app.post('/api/customer/:customerId/extended-pipeline', express.json(), runExtendedPipeline);

    // Get all plan data
    app.get('/api/customer/:customerId/plan-data', getCustomerPlanData);

    // List pending customers (for background worker)
    app.get('/api/customers/pending', listPendingCustomers);

    console.log('[CUSTOMER-PLANNING] API routes registered (including extended planning)');
}

module.exports = {
    setupCustomerPlanningRoutes,
    analyzeCustomerRequirements,
    generateProjectPlan,
    generateCostEstimate,
    suggestSystemConfiguration,
    generateSubcontractorPlan,
    generateCommunicationSchedule,
    runFullPipeline,
    runExtendedPipeline,
    getKundenkartenPlannerBot
};
