/**
 * Deal Pipeline Automation Daemon
 * Automatische Deal-Stage-Progression basierend auf:
 * - Zeit (Tage in Stage)
 * - Aktivitäten (Email, Call, Meeting)
 * - Wert (Amount)
 * - Kontakt-Zuweisung
 * - AI-Scoring (Einstein Bot)
 */

const db = require('./utils/database');
const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic for Einstein Bot
let anthropic = null;
function getAnthropicClient() {
    if (!anthropic && process.env.ANTHROPIC_API_KEY) {
        anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return anthropic;
}

// Helper: Extract JSON from AI response (handles trailing text)
function extractJSON(text) {
    // Try to find JSON object in response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON object found in response');
}

// Einstein Bot System Prompt for Deal Scoring
const EINSTEIN_SYSTEM_PROMPT = `Du bist Einstein Bot, der brillante Analytiker der GENIUS AGENCY.

DEINE AUFGABE: Analysiere Deals und berechne einen Score von 0-100.

SCORING-KRITERIEN:
- Deal-Wert (höher = besser): max 25 Punkte
- Aktivitäts-Level (mehr Aktivitäten = besser): max 25 Punkte
- Zeit in Pipeline (zu lang = Abzug): max 25 Punkte
- Kontakt-Qualität (hat Kontakt, hat Owner): max 25 Punkte

ANTWORTE NUR mit einem JSON-Objekt:
{
  "score": <0-100>,
  "tier": "<HOT|WARM|COLD>",
  "recommendation": "<kurze Empfehlung auf Deutsch>",
  "nextAction": "<konkrete nächste Aktion>"
}`;

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE REGELN KONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const PIPELINE_RULES = {
    // Zeit-basierte Regeln: Nach X Tagen in Stage automatisch verschieben
    timeBasedRules: [
        {
            name: 'Lead → Qualified nach 3 Tagen',
            fromStage: 'LEAD',
            toStage: 'QUALIFIED',
            daysInStage: 3,
            condition: 'has_contact'  // Nur wenn Kontakt zugewiesen
        },
        {
            name: 'Qualified → Proposal nach 7 Tagen',
            fromStage: 'QUALIFIED',
            toStage: 'PROPOSAL',
            daysInStage: 7,
            condition: 'has_activity'  // Nur wenn Aktivität vorhanden
        },
        {
            name: 'Proposal → Negotiation nach 5 Tagen',
            fromStage: 'PROPOSAL',
            toStage: 'NEGOTIATION',
            daysInStage: 5,
            condition: null
        }
    ],

    // Aktivitäts-basierte Regeln: Bei bestimmten Aktivitäten Stage ändern
    activityBasedRules: [
        {
            name: 'Nach Meeting → PROPOSAL',
            activityType: 'MEETING',
            fromStage: 'QUALIFIED',
            toStage: 'PROPOSAL'
        },
        {
            name: 'Nach positivem Call → NEGOTIATION',
            activityType: 'CALL',
            fromStage: 'PROPOSAL',
            toStage: 'NEGOTIATION',
            outcomeContains: ['positiv', 'interesse', 'zusage', 'ja']
        }
    ],

    // Wert-basierte Regeln: Bei bestimmtem Deal-Wert Stage ändern
    valueBasedRules: [
        {
            name: 'High-Value Deal → QUALIFIED',
            minValue: 10000,
            fromStage: 'LEAD',
            toStage: 'QUALIFIED'
        },
        {
            name: 'Enterprise Deal → PROPOSAL',
            minValue: 50000,
            fromStages: ['LEAD', 'QUALIFIED'],
            toStage: 'PROPOSAL'
        }
    ],

    // Kontakt-basierte Regeln: Bei Kontakt-Zuweisung Stage ändern
    contactBasedRules: [
        {
            name: 'Kontakt zugewiesen → QUALIFIED',
            fromStage: 'LEAD',
            toStage: 'QUALIFIED',
            requireContact: true
        }
    ]
};

// ═══════════════════════════════════════════════════════════════════════════
// DEAL PIPELINE PROCESSOR
// ═══════════════════════════════════════════════════════════════════════════

class DealPipelineProcessor {
    constructor() {
        this.stats = {
            processed: 0,
            moved: 0,
            errors: 0,
            byRule: {}
        };
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = level === 'error' ? '❌' : level === 'success' ? '✅' : '📋';
        console.log(`[${timestamp}] ${prefix} [DealPipeline] ${message}`);
    }

    async moveDeal(dealId, fromStage, toStage, reason) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // Update deal stage
            await client.query(`
                UPDATE deals
                SET stage = $1::"DealStage",
                    "stageChangedAt" = NOW(),
                    "stageChangeReason" = $2,
                    "updatedAt" = NOW(),
                    "hubspotSyncStatus" = 'PENDING_PUSH'::"DealSyncStatus"
                WHERE id = $3
            `, [toStage, reason, dealId]);

            // Log activity (use system user ID from database)
            await client.query(`
                INSERT INTO activities (id, type, subject, description, "dealId", "userId", "createdAt", "updatedAt")
                VALUES (
                    gen_random_uuid()::text,
                    'STAGE_CHANGE'::"ActivityType",
                    $1,
                    $2,
                    $3,
                    'cmjr4p6iy00004lcj5samffw6',
                    NOW(),
                    NOW()
                )
            `, [
                `Stage: ${fromStage} → ${toStage}`,
                `Automatisch verschoben: ${reason}`,
                dealId
            ]);

            await client.query('COMMIT');

            this.stats.moved++;
            this.stats.byRule[reason] = (this.stats.byRule[reason] || 0) + 1;

            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            this.stats.errors++;
            this.log(`Error moving deal ${dealId}: ${error.message}`, 'error');
            return false;
        } finally {
            client.release();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ZEIT-BASIERTE REGELN
    // ─────────────────────────────────────────────────────────────────────────
    async processTimeBasedRules() {
        for (const rule of PIPELINE_RULES.timeBasedRules) {
            let query = `
                SELECT d.id, d.name, d.stage, d."contactId", d."stageChangedAt"
                FROM deals d
                WHERE d.stage = $1::"DealStage"
                  AND d."stageChangedAt" < NOW() - INTERVAL '${rule.daysInStage} days'
                  AND d.stage NOT IN ('WON', 'LOST')
            `;
            const params = [rule.fromStage];

            // Zusätzliche Bedingungen
            if (rule.condition === 'has_contact') {
                query += ` AND d."contactId" IS NOT NULL`;
            } else if (rule.condition === 'has_activity') {
                query += ` AND EXISTS (
                    SELECT 1 FROM activities a
                    WHERE a."dealId" = d.id
                    AND a."completedAt" IS NOT NULL
                )`;
            }

            query += ` LIMIT 50`;

            try {
                const result = await db.query(query, params);

                for (const deal of result.rows) {
                    this.stats.processed++;
                    await this.moveDeal(
                        deal.id,
                        rule.fromStage,
                        rule.toStage,
                        rule.name
                    );
                }
            } catch (error) {
                this.log(`Time rule error (${rule.name}): ${error.message}`, 'error');
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AKTIVITÄTS-BASIERTE REGELN
    // ─────────────────────────────────────────────────────────────────────────
    async processActivityBasedRules() {
        for (const rule of PIPELINE_RULES.activityBasedRules) {
            let query = `
                SELECT DISTINCT d.id, d.name, d.stage
                FROM deals d
                INNER JOIN activities a ON a."dealId" = d.id
                WHERE d.stage = $1::"DealStage"
                  AND a.type = $2::"ActivityType"
                  AND a."completedAt" > NOW() - INTERVAL '24 hours'
                  AND d.stage NOT IN ('WON', 'LOST')
            `;
            const params = [rule.fromStage, rule.activityType];

            // Outcome-Filter
            if (rule.outcomeContains && rule.outcomeContains.length > 0) {
                const outcomeConditions = rule.outcomeContains
                    .map((_, i) => `LOWER(a.outcome) LIKE $${params.length + i + 1}`)
                    .join(' OR ');
                query += ` AND (${outcomeConditions})`;
                params.push(...rule.outcomeContains.map(o => `%${o.toLowerCase()}%`));
            }

            query += ` LIMIT 50`;

            try {
                const result = await db.query(query, params);

                for (const deal of result.rows) {
                    this.stats.processed++;
                    await this.moveDeal(
                        deal.id,
                        rule.fromStage,
                        rule.toStage,
                        rule.name
                    );
                }
            } catch (error) {
                this.log(`Activity rule error (${rule.name}): ${error.message}`, 'error');
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WERT-BASIERTE REGELN
    // ─────────────────────────────────────────────────────────────────────────
    async processValueBasedRules() {
        for (const rule of PIPELINE_RULES.valueBasedRules) {
            const fromStages = rule.fromStages || [rule.fromStage];
            const stageParams = fromStages.map((_, i) => `$${i + 2}::"DealStage"`).join(', ');

            const query = `
                SELECT d.id, d.name, d.stage, d.value
                FROM deals d
                WHERE d.value >= $1
                  AND d.stage IN (${stageParams})
                  AND d.stage NOT IN ('WON', 'LOST')
                LIMIT 50
            `;
            const params = [rule.minValue, ...fromStages];

            try {
                const result = await db.query(query, params);

                for (const deal of result.rows) {
                    this.stats.processed++;
                    await this.moveDeal(
                        deal.id,
                        deal.stage,
                        rule.toStage,
                        rule.name
                    );
                }
            } catch (error) {
                this.log(`Value rule error (${rule.name}): ${error.message}`, 'error');
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // KONTAKT-BASIERTE REGELN
    // ─────────────────────────────────────────────────────────────────────────
    async processContactBasedRules() {
        for (const rule of PIPELINE_RULES.contactBasedRules) {
            const query = `
                SELECT d.id, d.name, d.stage, d."contactId"
                FROM deals d
                WHERE d.stage = $1::"DealStage"
                  AND d."contactId" IS NOT NULL
                  AND d."stageChangedAt" < NOW() - INTERVAL '1 hour'
                  AND d.stage NOT IN ('WON', 'LOST')
                LIMIT 50
            `;

            try {
                const result = await db.query(query, [rule.fromStage]);

                for (const deal of result.rows) {
                    this.stats.processed++;
                    await this.moveDeal(
                        deal.id,
                        rule.fromStage,
                        rule.toStage,
                        rule.name
                    );
                }
            } catch (error) {
                this.log(`Contact rule error (${rule.name}): ${error.message}`, 'error');
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AI-BASIERTES DEAL SCORING (Einstein Bot)
    // ─────────────────────────────────────────────────────────────────────────
    async processAIScoring() {
        const client = getAnthropicClient();
        if (!client) {
            this.log('AI Scoring übersprungen (kein API Key)', 'info');
            return;
        }

        // Hole Deals ohne Score oder mit veraltetem Score (älter als 24h)
        const query = `
            SELECT d.id, d.name, d.value, d.stage, d."createdAt", d."stageChangedAt",
                   d."contactId", d."ownerId", d.deal_score, d."scoredAt",
                   (SELECT COUNT(*) FROM activities a WHERE a."dealId" = d.id) as activity_count
            FROM deals d
            WHERE d.stage NOT IN ('WON', 'LOST')
              AND (d."scoredAt" IS NULL OR d."scoredAt" < NOW() - INTERVAL '24 hours')
            ORDER BY d.value DESC
            LIMIT 20
        `;

        try {
            const result = await db.query(query);
            this.log(`AI Scoring: ${result.rows.length} Deals zu analysieren`);

            for (const deal of result.rows) {
                try {
                    const daysInPipeline = Math.floor(
                        (Date.now() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                    );

                    const dealContext = {
                        name: deal.name,
                        value: deal.value,
                        stage: deal.stage,
                        daysInPipeline,
                        hasContact: !!deal.contactId,
                        hasOwner: !!deal.ownerId,
                        activityCount: parseInt(deal.activity_count) || 0
                    };

                    const response = await client.messages.create({
                        model: 'claude-3-5-haiku-20241022',
                        max_tokens: 256,
                        system: EINSTEIN_SYSTEM_PROMPT,
                        messages: [{
                            role: 'user',
                            content: `Analysiere diesen Deal:\n${JSON.stringify(dealContext, null, 2)}`
                        }]
                    });

                    const responseText = response.content[0].text;
                    const scoreData = extractJSON(responseText);

                    // Update Deal mit Score
                    await db.query(`
                        UPDATE deals
                        SET deal_score = $1,
                            score_breakdown = $2,
                            score_tier = $3,
                            "scoredAt" = NOW(),
                            "updatedAt" = NOW()
                        WHERE id = $4
                    `, [
                        scoreData.score,
                        JSON.stringify({
                            recommendation: scoreData.recommendation,
                            nextAction: scoreData.nextAction,
                            analyzedAt: new Date().toISOString()
                        }),
                        scoreData.tier,
                        deal.id
                    ]);

                    this.stats.aiScored = (this.stats.aiScored || 0) + 1;
                    this.log(`✨ ${deal.name}: Score ${scoreData.score} (${scoreData.tier})`);

                } catch (parseError) {
                    this.log(`AI Score parse error für ${deal.name}: ${parseError.message}`, 'error');
                }
            }
        } catch (error) {
            this.log(`AI Scoring error: ${error.message}`, 'error');
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MAIN RUN
    // ─────────────────────────────────────────────────────────────────────────
    async run() {
        this.log('Starting deal pipeline processing...');
        const startTime = Date.now();

        // Reset stats
        this.stats = { processed: 0, moved: 0, errors: 0, aiScored: 0, byRule: {} };

        try {
            // Process all rule types
            await this.processTimeBasedRules();
            await this.processActivityBasedRules();
            await this.processValueBasedRules();
            await this.processContactBasedRules();

            // AI-basiertes Scoring
            await this.processAIScoring();

            const duration = Date.now() - startTime;

            return {
                success: true,
                summary: `Processed: ${this.stats.processed}, Moved: ${this.stats.moved}, AI-Scored: ${this.stats.aiScored}, Errors: ${this.stats.errors} (${duration}ms)`,
                stats: this.stats
            };
        } catch (error) {
            this.log(`Pipeline processing failed: ${error.message}`, 'error');
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Export for daemon manager
module.exports = {
    run: async () => {
        const processor = new DealPipelineProcessor();
        return processor.run();
    }
};
