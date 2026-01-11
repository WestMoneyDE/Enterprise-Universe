/**
 * WORKFLOW ENGINE
 * Visual Workflow Builder with Triggers & Actions
 *
 * Enterprise Universe - West Money Bau GmbH
 */

const { Pool } = require('pg');
const EventEmitter = require('events');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Workflow Event Bus
const workflowEvents = new EventEmitter();

// ═══════════════════════════════════════════════════════════════
// TRIGGER TYPES
// ═══════════════════════════════════════════════════════════════

const TRIGGER_TYPES = {
    // Manual Triggers
    manual: {
        name: 'Manueller Start',
        description: 'Workflow wird manuell gestartet',
        icon: '👆',
        config: []
    },

    // Time-based Triggers
    schedule: {
        name: 'Zeitplan',
        description: 'Workflow läuft nach Zeitplan',
        icon: '⏰',
        config: [
            { key: 'cron', type: 'string', label: 'Cron Expression', default: '0 9 * * 1' },
            { key: 'timezone', type: 'string', label: 'Zeitzone', default: 'Europe/Berlin' }
        ]
    },

    // Event Triggers
    deal_created: {
        name: 'Neuer Deal',
        description: 'Wird ausgelöst wenn ein Deal erstellt wird',
        icon: '💼',
        config: [
            { key: 'minValue', type: 'number', label: 'Mindest-Wert (€)', default: 0 },
            { key: 'pipeline', type: 'string', label: 'Pipeline', default: '' }
        ]
    },

    deal_stage_changed: {
        name: 'Deal Stage geändert',
        description: 'Wird ausgelöst wenn sich die Deal-Phase ändert',
        icon: '📊',
        config: [
            { key: 'fromStage', type: 'string', label: 'Von Phase', default: '' },
            { key: 'toStage', type: 'string', label: 'Zu Phase', default: '' }
        ]
    },

    deal_won: {
        name: 'Deal gewonnen',
        description: 'Wird ausgelöst wenn ein Deal gewonnen wird',
        icon: '🏆',
        config: []
    },

    contact_created: {
        name: 'Neuer Kontakt',
        description: 'Wird ausgelöst wenn ein Kontakt erstellt wird',
        icon: '👤',
        config: [
            { key: 'source', type: 'string', label: 'Quelle', default: '' }
        ]
    },

    form_submitted: {
        name: 'Formular eingereicht',
        description: 'Wird ausgelöst bei Formular-Eingabe',
        icon: '📝',
        config: [
            { key: 'formId', type: 'string', label: 'Formular ID', default: '' }
        ]
    },

    webhook: {
        name: 'Webhook',
        description: 'Wird durch externen Webhook ausgelöst',
        icon: '🔗',
        config: [
            { key: 'secret', type: 'string', label: 'Webhook Secret', default: '' }
        ]
    },

    email_opened: {
        name: 'Email geöffnet',
        description: 'Wird ausgelöst wenn eine Email geöffnet wird',
        icon: '📧',
        config: [
            { key: 'templateId', type: 'string', label: 'Template ID', default: '' }
        ]
    },

    lead_score_changed: {
        name: 'Lead Score geändert',
        description: 'Wird ausgelöst bei Score-Änderung',
        icon: '📈',
        config: [
            { key: 'threshold', type: 'number', label: 'Score Schwelle', default: 50 },
            { key: 'direction', type: 'select', label: 'Richtung', options: ['above', 'below'], default: 'above' }
        ]
    }
};

// ═══════════════════════════════════════════════════════════════
// ACTION TYPES
// ═══════════════════════════════════════════════════════════════

const ACTION_TYPES = {
    // Communication Actions
    send_email: {
        name: 'Email senden',
        description: 'Sendet eine Email mit Template',
        icon: '📧',
        config: [
            { key: 'templateId', type: 'string', label: 'Email Template', required: true },
            { key: 'to', type: 'string', label: 'Empfänger (oder {{email}})', default: '{{email}}' },
            { key: 'cc', type: 'string', label: 'CC', default: '' }
        ]
    },

    send_whatsapp: {
        name: 'WhatsApp senden',
        description: 'Sendet eine WhatsApp Nachricht',
        icon: '💬',
        config: [
            { key: 'templateName', type: 'string', label: 'Template Name', required: true },
            { key: 'to', type: 'string', label: 'Telefonnummer (oder {{phone}})', default: '{{phone}}' }
        ]
    },

    send_slack: {
        name: 'Slack Nachricht',
        description: 'Sendet eine Slack Benachrichtigung',
        icon: '💼',
        config: [
            { key: 'channel', type: 'string', label: 'Channel', required: true },
            { key: 'message', type: 'text', label: 'Nachricht', required: true }
        ]
    },

    // CRM Actions
    create_task: {
        name: 'Task erstellen',
        description: 'Erstellt eine Aufgabe',
        icon: '✅',
        config: [
            { key: 'title', type: 'string', label: 'Titel', required: true },
            { key: 'assignee', type: 'string', label: 'Zugewiesen an', default: '' },
            { key: 'dueInDays', type: 'number', label: 'Fällig in (Tagen)', default: 1 }
        ]
    },

    update_deal: {
        name: 'Deal aktualisieren',
        description: 'Aktualisiert Deal-Eigenschaften',
        icon: '💼',
        config: [
            { key: 'property', type: 'string', label: 'Eigenschaft', required: true },
            { key: 'value', type: 'string', label: 'Neuer Wert', required: true }
        ]
    },

    update_contact: {
        name: 'Kontakt aktualisieren',
        description: 'Aktualisiert Kontakt-Eigenschaften',
        icon: '👤',
        config: [
            { key: 'property', type: 'string', label: 'Eigenschaft', required: true },
            { key: 'value', type: 'string', label: 'Neuer Wert', required: true }
        ]
    },

    add_tag: {
        name: 'Tag hinzufügen',
        description: 'Fügt einen Tag hinzu',
        icon: '🏷️',
        config: [
            { key: 'tag', type: 'string', label: 'Tag Name', required: true }
        ]
    },

    // Automation Actions
    enroll_sequence: {
        name: 'In Sequenz einschreiben',
        description: 'Schreibt Kontakt in Email-Sequenz ein',
        icon: '📨',
        config: [
            { key: 'sequenceId', type: 'string', label: 'Sequenz ID', required: true }
        ]
    },

    trigger_workflow: {
        name: 'Workflow auslösen',
        description: 'Startet einen anderen Workflow',
        icon: '⚡',
        config: [
            { key: 'workflowId', type: 'string', label: 'Workflow ID', required: true }
        ]
    },

    // Delay Actions
    delay: {
        name: 'Warten',
        description: 'Wartet eine bestimmte Zeit',
        icon: '⏳',
        config: [
            { key: 'days', type: 'number', label: 'Tage', default: 0 },
            { key: 'hours', type: 'number', label: 'Stunden', default: 0 },
            { key: 'minutes', type: 'number', label: 'Minuten', default: 0 }
        ]
    },

    // Webhook Actions
    webhook_call: {
        name: 'Webhook aufrufen',
        description: 'Ruft eine externe URL auf',
        icon: '🔗',
        config: [
            { key: 'url', type: 'string', label: 'URL', required: true },
            { key: 'method', type: 'select', label: 'Methode', options: ['GET', 'POST', 'PUT'], default: 'POST' },
            { key: 'headers', type: 'json', label: 'Headers (JSON)', default: '{}' }
        ]
    },

    // Conditional Actions
    condition: {
        name: 'Bedingung',
        description: 'Verzweigt basierend auf Bedingung',
        icon: '🔀',
        config: [
            { key: 'field', type: 'string', label: 'Feld', required: true },
            { key: 'operator', type: 'select', label: 'Operator', options: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than'], default: 'equals' },
            { key: 'value', type: 'string', label: 'Wert', required: true }
        ]
    },

    // Invoice Actions
    create_invoice: {
        name: 'Rechnung erstellen',
        description: 'Erstellt eine Rechnung für Deal',
        icon: '🧾',
        config: [
            { key: 'sendEmail', type: 'boolean', label: 'Per Email senden', default: true }
        ]
    },

    // Notification Actions
    notify_team: {
        name: 'Team benachrichtigen',
        description: 'Sendet interne Benachrichtigung',
        icon: '🔔',
        config: [
            { key: 'channel', type: 'select', label: 'Kanal', options: ['email', 'slack', 'dashboard'], default: 'dashboard' },
            { key: 'message', type: 'text', label: 'Nachricht', required: true },
            { key: 'recipients', type: 'string', label: 'Empfänger (kommagetrennt)', default: '' }
        ]
    }
};

// ═══════════════════════════════════════════════════════════════
// DATABASE INITIALIZATION
// ═══════════════════════════════════════════════════════════════

async function initDatabase() {
    const client = await pool.connect();
    try {
        // Workflows table
        await client.query(`
            CREATE TABLE IF NOT EXISTS workflows (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                description TEXT,
                trigger_type VARCHAR(50) NOT NULL,
                trigger_config JSONB DEFAULT '{}',
                is_active BOOLEAN DEFAULT false,
                run_count INTEGER DEFAULT 0,
                last_run TIMESTAMP,
                created_by UUID,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Workflow Actions table
        await client.query(`
            CREATE TABLE IF NOT EXISTS workflow_actions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
                action_order INTEGER NOT NULL,
                action_type VARCHAR(50) NOT NULL,
                action_config JSONB DEFAULT '{}',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Workflow Executions log
        await client.query(`
            CREATE TABLE IF NOT EXISTS workflow_executions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
                trigger_data JSONB DEFAULT '{}',
                status VARCHAR(20) DEFAULT 'running',
                current_action INTEGER DEFAULT 0,
                results JSONB DEFAULT '[]',
                error_message TEXT,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            )
        `);

        // Create indexes
        await client.query(`CREATE INDEX IF NOT EXISTS idx_workflows_active ON workflows(is_active)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_workflows_trigger ON workflows(trigger_type)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_executions_workflow ON workflow_executions(workflow_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_executions_status ON workflow_executions(status)`);

        console.log('✓ Workflow engine database initialized');
        return true;
    } catch (error) {
        console.error('Workflow DB init error:', error.message);
        return false;
    } finally {
        client.release();
    }
}

// ═══════════════════════════════════════════════════════════════
// WORKFLOW CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * Create new workflow
 */
async function createWorkflow({ name, description, triggerType, triggerConfig = {}, createdBy }) {
    if (!TRIGGER_TYPES[triggerType]) {
        throw new Error(`Invalid trigger type: ${triggerType}`);
    }

    const result = await pool.query(
        `INSERT INTO workflows (name, description, trigger_type, trigger_config, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, description, triggerType, JSON.stringify(triggerConfig), createdBy]
    );

    return formatWorkflow(result.rows[0]);
}

/**
 * Get all workflows
 */
async function getWorkflows(activeOnly = false) {
    const whereClause = activeOnly ? 'WHERE is_active = true' : '';
    const result = await pool.query(
        `SELECT w.*, COUNT(a.id) as action_count
         FROM workflows w
         LEFT JOIN workflow_actions a ON w.id = a.workflow_id
         ${whereClause}
         GROUP BY w.id
         ORDER BY w.created_at DESC`
    );
    return result.rows.map(formatWorkflow);
}

/**
 * Get workflow by ID with actions
 */
async function getWorkflowById(id) {
    const wfResult = await pool.query('SELECT * FROM workflows WHERE id = $1', [id]);

    if (wfResult.rows.length === 0) return null;

    const actionsResult = await pool.query(
        `SELECT * FROM workflow_actions WHERE workflow_id = $1 ORDER BY action_order`,
        [id]
    );

    const workflow = formatWorkflow(wfResult.rows[0]);
    workflow.actions = actionsResult.rows.map(action => ({
        id: action.id,
        order: action.action_order,
        type: action.action_type,
        config: action.action_config,
        isActive: action.is_active,
        typeInfo: ACTION_TYPES[action.action_type] || null
    }));

    return workflow;
}

/**
 * Update workflow
 */
async function updateWorkflow(id, updates) {
    const { name, description, triggerType, triggerConfig, isActive } = updates;

    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(name); }
    if (description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(description); }
    if (triggerType !== undefined) { fields.push(`trigger_type = $${paramIndex++}`); values.push(triggerType); }
    if (triggerConfig !== undefined) { fields.push(`trigger_config = $${paramIndex++}`); values.push(JSON.stringify(triggerConfig)); }
    if (isActive !== undefined) { fields.push(`is_active = $${paramIndex++}`); values.push(isActive); }

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
        `UPDATE workflows SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
    );

    return result.rows[0] ? formatWorkflow(result.rows[0]) : null;
}

/**
 * Delete workflow
 */
async function deleteWorkflow(id) {
    await pool.query('DELETE FROM workflows WHERE id = $1', [id]);
}

/**
 * Get all actions for a workflow
 */
async function getWorkflowActions(workflowId) {
    const result = await pool.query(
        `SELECT * FROM workflow_actions
         WHERE workflow_id = $1
         ORDER BY action_order ASC`,
        [workflowId]
    );

    return result.rows.map(row => ({
        id: row.id,
        workflowId: row.workflow_id,
        type: row.action_type,
        config: row.action_config,
        order: row.action_order,
        isActive: row.is_active,
        createdAt: row.created_at
    }));
}

/**
 * Add action to workflow
 */
async function addAction(workflowId, { actionType, actionConfig = {}, order }) {
    if (!ACTION_TYPES[actionType]) {
        throw new Error(`Invalid action type: ${actionType}`);
    }

    // Get next order if not specified
    if (order === undefined) {
        const maxOrder = await pool.query(
            'SELECT COALESCE(MAX(action_order), 0) as max_order FROM workflow_actions WHERE workflow_id = $1',
            [workflowId]
        );
        order = maxOrder.rows[0].max_order + 1;
    }

    const result = await pool.query(
        `INSERT INTO workflow_actions (workflow_id, action_type, action_config, action_order)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [workflowId, actionType, JSON.stringify(actionConfig), order]
    );

    return {
        id: result.rows[0].id,
        order: result.rows[0].action_order,
        type: result.rows[0].action_type,
        config: result.rows[0].action_config
    };
}

/**
 * Update action
 */
async function updateAction(actionId, updates) {
    const { actionConfig, order, isActive } = updates;

    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (actionConfig !== undefined) { fields.push(`action_config = $${paramIndex++}`); values.push(JSON.stringify(actionConfig)); }
    if (order !== undefined) { fields.push(`action_order = $${paramIndex++}`); values.push(order); }
    if (isActive !== undefined) { fields.push(`is_active = $${paramIndex++}`); values.push(isActive); }

    if (fields.length === 0) return null;

    values.push(actionId);

    const result = await pool.query(
        `UPDATE workflow_actions SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
    );

    return result.rows[0];
}

/**
 * Delete action
 */
async function deleteAction(actionId) {
    await pool.query('DELETE FROM workflow_actions WHERE id = $1', [actionId]);
}

/**
 * Format workflow for API
 */
function formatWorkflow(row) {
    const triggerInfo = TRIGGER_TYPES[row.trigger_type] || {};
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        triggerType: row.trigger_type,
        triggerConfig: row.trigger_config,
        triggerInfo: {
            name: triggerInfo.name,
            description: triggerInfo.description,
            icon: triggerInfo.icon
        },
        isActive: row.is_active,
        runCount: row.run_count || 0,
        lastRun: row.last_run,
        actionCount: parseInt(row.action_count) || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

// ═══════════════════════════════════════════════════════════════
// WORKFLOW EXECUTION
// ═══════════════════════════════════════════════════════════════

/**
 * Execute workflow
 */
async function executeWorkflow(workflowId, triggerData = {}) {
    const workflow = await getWorkflowById(workflowId);

    if (!workflow) {
        throw new Error('Workflow not found');
    }

    if (!workflow.isActive) {
        throw new Error('Workflow is not active');
    }

    // Create execution record
    const execResult = await pool.query(
        `INSERT INTO workflow_executions (workflow_id, trigger_data)
         VALUES ($1, $2)
         RETURNING id`,
        [workflowId, JSON.stringify(triggerData)]
    );

    const executionId = execResult.rows[0].id;
    const results = [];

    try {
        // Execute each action
        for (const action of workflow.actions) {
            if (!action.isActive) continue;

            const result = await executeAction(action, triggerData, results);
            results.push({
                actionId: action.id,
                actionType: action.type,
                status: 'success',
                result
            });

            // Update execution progress
            await pool.query(
                `UPDATE workflow_executions SET current_action = $1, results = $2 WHERE id = $3`,
                [action.order, JSON.stringify(results), executionId]
            );

            // Handle delay action
            if (action.type === 'delay') {
                // In production, this would schedule a delayed job
                // For now, we just note the delay
                results[results.length - 1].delayed = true;
            }

            // Handle condition action
            if (action.type === 'condition' && !result.passed) {
                break; // Stop workflow if condition not met
            }
        }

        // Mark execution complete
        await pool.query(
            `UPDATE workflow_executions
             SET status = 'completed', completed_at = CURRENT_TIMESTAMP, results = $1
             WHERE id = $2`,
            [JSON.stringify(results), executionId]
        );

        // Update workflow stats
        await pool.query(
            `UPDATE workflows SET run_count = run_count + 1, last_run = CURRENT_TIMESTAMP WHERE id = $1`,
            [workflowId]
        );

        return {
            executionId,
            workflowId,
            status: 'completed',
            results
        };

    } catch (error) {
        // Mark execution failed
        await pool.query(
            `UPDATE workflow_executions
             SET status = 'failed', completed_at = CURRENT_TIMESTAMP, error_message = $1, results = $2
             WHERE id = $3`,
            [error.message, JSON.stringify(results), executionId]
        );

        throw error;
    }
}

/**
 * Execute single action
 */
async function executeAction(action, triggerData, previousResults) {
    const config = action.config || {};

    // Process merge tags in config
    const processedConfig = processMergeTags(config, triggerData);

    switch (action.type) {
        case 'send_email':
            return await executeSendEmail(processedConfig, triggerData);

        case 'create_task':
            return await executeCreateTask(processedConfig, triggerData);

        case 'update_deal':
            return await executeUpdateDeal(processedConfig, triggerData);

        case 'delay':
            return executeDelay(processedConfig);

        case 'condition':
            return executeCondition(processedConfig, triggerData);

        case 'webhook_call':
            return await executeWebhook(processedConfig, triggerData);

        case 'notify_team':
            return await executeNotifyTeam(processedConfig, triggerData);

        case 'add_tag':
            return executeAddTag(processedConfig, triggerData);

        default:
            return { executed: true, type: action.type, note: 'Action handler not implemented' };
    }
}

/**
 * Process merge tags in config
 */
function processMergeTags(config, data) {
    const processed = {};

    for (const [key, value] of Object.entries(config)) {
        if (typeof value === 'string') {
            processed[key] = value.replace(/\{\{(\w+)\}\}/g, (match, tag) => {
                return data[tag] !== undefined ? data[tag] : match;
            });
        } else {
            processed[key] = value;
        }
    }

    return processed;
}

// Action Executors
async function executeSendEmail(config, data) {
    // Would integrate with email service
    return {
        sent: true,
        to: config.to,
        templateId: config.templateId
    };
}

async function executeCreateTask(config, data) {
    return {
        created: true,
        title: config.title,
        assignee: config.assignee,
        dueDate: new Date(Date.now() + (config.dueInDays || 1) * 24 * 60 * 60 * 1000)
    };
}

async function executeUpdateDeal(config, data) {
    return {
        updated: true,
        property: config.property,
        value: config.value
    };
}

function executeDelay(config) {
    const totalMinutes = (config.days || 0) * 1440 + (config.hours || 0) * 60 + (config.minutes || 0);
    return {
        delayed: true,
        minutes: totalMinutes,
        resumeAt: new Date(Date.now() + totalMinutes * 60 * 1000)
    };
}

function executeCondition(config, data) {
    const fieldValue = data[config.field];
    let passed = false;

    switch (config.operator) {
        case 'equals':
            passed = fieldValue == config.value;
            break;
        case 'not_equals':
            passed = fieldValue != config.value;
            break;
        case 'contains':
            passed = String(fieldValue).includes(config.value);
            break;
        case 'greater_than':
            passed = Number(fieldValue) > Number(config.value);
            break;
        case 'less_than':
            passed = Number(fieldValue) < Number(config.value);
            break;
    }

    return { passed, field: config.field, operator: config.operator, value: config.value };
}

async function executeWebhook(config, data) {
    try {
        const response = await fetch(config.url, {
            method: config.method || 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(config.headers ? JSON.parse(config.headers) : {})
            },
            body: config.method !== 'GET' ? JSON.stringify(data) : undefined
        });

        return {
            called: true,
            url: config.url,
            status: response.status,
            ok: response.ok
        };
    } catch (error) {
        return { called: false, error: error.message };
    }
}

async function executeNotifyTeam(config, data) {
    return {
        notified: true,
        channel: config.channel,
        message: config.message,
        recipients: config.recipients
    };
}

function executeAddTag(config, data) {
    return {
        added: true,
        tag: config.tag
    };
}

// ═══════════════════════════════════════════════════════════════
// EVENT TRIGGERS
// ═══════════════════════════════════════════════════════════════

/**
 * Trigger workflows by event
 */
async function triggerByEvent(eventType, eventData) {
    // Find active workflows with this trigger
    const result = await pool.query(
        `SELECT id FROM workflows WHERE trigger_type = $1 AND is_active = true`,
        [eventType]
    );

    const executions = [];

    for (const row of result.rows) {
        try {
            const execution = await executeWorkflow(row.id, eventData);
            executions.push(execution);
        } catch (error) {
            executions.push({
                workflowId: row.id,
                status: 'failed',
                error: error.message
            });
        }
    }

    return executions;
}

/**
 * Get execution history
 */
async function getExecutions(workflowId = null, limit = 50) {
    let query = `
        SELECT e.*, w.name as workflow_name
        FROM workflow_executions e
        JOIN workflows w ON e.workflow_id = w.id
    `;

    const params = [];

    if (workflowId) {
        query += ' WHERE e.workflow_id = $1';
        params.push(workflowId);
    }

    query += ' ORDER BY e.started_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await pool.query(query, params);

    return result.rows.map(row => ({
        id: row.id,
        workflowId: row.workflow_id,
        workflowName: row.workflow_name,
        status: row.status,
        currentAction: row.current_action,
        triggerData: row.trigger_data,
        results: row.results,
        error: row.error_message,
        startedAt: row.started_at,
        completedAt: row.completed_at
    }));
}

/**
 * Get workflow statistics
 */
async function getStats() {
    const result = await pool.query(`
        SELECT
            COUNT(*) as total_workflows,
            COUNT(*) FILTER (WHERE is_active = true) as active_workflows,
            SUM(run_count) as total_runs
        FROM workflows
    `);

    const execStats = await pool.query(`
        SELECT
            COUNT(*) as total_executions,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'failed') as failed,
            COUNT(*) FILTER (WHERE status = 'running') as running
        FROM workflow_executions
        WHERE started_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
    `);

    return {
        workflows: {
            total: parseInt(result.rows[0].total_workflows) || 0,
            active: parseInt(result.rows[0].active_workflows) || 0,
            totalRuns: parseInt(result.rows[0].total_runs) || 0
        },
        executions: {
            total: parseInt(execStats.rows[0].total_executions) || 0,
            completed: parseInt(execStats.rows[0].completed) || 0,
            failed: parseInt(execStats.rows[0].failed) || 0,
            running: parseInt(execStats.rows[0].running) || 0
        },
        period: '30 days'
    };
}

module.exports = {
    initDatabase,
    // Workflow CRUD
    createWorkflow,
    getWorkflows,
    getAllWorkflows: getWorkflows,  // Alias
    getWorkflowById,
    updateWorkflow,
    deleteWorkflow,
    // Actions
    getWorkflowActions,
    addAction,
    addWorkflowAction: addAction,  // Alias
    updateAction,
    updateWorkflowAction: updateAction,  // Alias
    deleteAction,
    deleteWorkflowAction: deleteAction,  // Alias
    // Execution
    executeWorkflow,
    triggerByEvent,
    triggerWorkflowsByEvent: triggerByEvent,  // Alias
    getExecutions,
    getWorkflowExecutions: getExecutions,  // Alias
    // Stats
    getStats,
    getWorkflowStats: getStats,  // Alias
    // Types
    TRIGGER_TYPES,
    ACTION_TYPES,
    // Events
    workflowEvents
};
