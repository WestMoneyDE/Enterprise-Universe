/**
 * EMAIL TEMPLATES & SEQUENCES SERVICE
 * Template Management, Merge Tags, Email Sequences
 *
 * Enterprise Universe - West Money Bau GmbH
 */

const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// SMTP Transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Available merge tags
const MERGE_TAGS = {
    // Contact/Lead Tags
    '{{firstName}}': 'Vorname des Empfängers',
    '{{lastName}}': 'Nachname des Empfängers',
    '{{fullName}}': 'Vollständiger Name',
    '{{email}}': 'E-Mail Adresse',
    '{{company}}': 'Firmenname',
    '{{phone}}': 'Telefonnummer',
    '{{position}}': 'Position/Titel',

    // Deal Tags
    '{{dealName}}': 'Deal Name',
    '{{dealValue}}': 'Deal Wert',
    '{{dealStage}}': 'Deal Phase',

    // Company Tags
    '{{senderName}}': 'Absender Name',
    '{{senderEmail}}': 'Absender E-Mail',
    '{{senderPhone}}': 'Absender Telefon',
    '{{companyName}}': 'Enterprise Universe',
    '{{companyWebsite}}': 'https://enterprise-universe.one',

    // Dynamic Tags
    '{{currentDate}}': 'Aktuelles Datum',
    '{{currentYear}}': 'Aktuelles Jahr',
    '{{unsubscribeLink}}': 'Abmelde-Link'
};

/**
 * Initialize database tables for sequences
 */
async function initDatabase() {
    const client = await pool.connect();
    try {
        // Email Sequences table
        await client.query(`
            CREATE TABLE IF NOT EXISTS email_sequences (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                description TEXT,
                trigger_type VARCHAR(50) DEFAULT 'manual',
                trigger_config JSONB DEFAULT '{}',
                is_active BOOLEAN DEFAULT true,
                created_by UUID,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Sequence Steps table
        await client.query(`
            CREATE TABLE IF NOT EXISTS email_sequence_steps (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                sequence_id UUID REFERENCES email_sequences(id) ON DELETE CASCADE,
                step_order INTEGER NOT NULL,
                template_id UUID REFERENCES bau_email_templates(id),
                delay_days INTEGER DEFAULT 0,
                delay_hours INTEGER DEFAULT 0,
                condition JSONB DEFAULT '{}',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Sequence Enrollments table
        await client.query(`
            CREATE TABLE IF NOT EXISTS email_sequence_enrollments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                sequence_id UUID REFERENCES email_sequences(id) ON DELETE CASCADE,
                contact_email VARCHAR(255) NOT NULL,
                contact_data JSONB DEFAULT '{}',
                current_step INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'active',
                enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                last_email_at TIMESTAMP
            )
        `);

        // Email Send Log
        await client.query(`
            CREATE TABLE IF NOT EXISTS email_send_log (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                template_id UUID,
                sequence_id UUID,
                recipient_email VARCHAR(255) NOT NULL,
                subject VARCHAR(255),
                status VARCHAR(20) DEFAULT 'sent',
                opened_at TIMESTAMP,
                clicked_at TIMESTAMP,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create indexes
        await client.query(`CREATE INDEX IF NOT EXISTS idx_seq_enrollments_email ON email_sequence_enrollments(contact_email)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_seq_enrollments_status ON email_sequence_enrollments(status)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_email_log_recipient ON email_send_log(recipient_email)`);

        console.log('✓ Email templates database initialized');
        return true;
    } catch (error) {
        console.error('Email DB init error:', error.message);
        return false;
    } finally {
        client.release();
    }
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new email template
 */
async function createTemplate({ name, subject, bodyHtml, bodyText, variables = [] }) {
    const result = await pool.query(
        `INSERT INTO bau_email_templates (name, subject, body_html, body_text, variables)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, subject, bodyHtml, bodyText || '', JSON.stringify(variables)]
    );
    return formatTemplate(result.rows[0]);
}

/**
 * Get all templates
 */
async function getTemplates(activeOnly = false) {
    const whereClause = activeOnly ? 'WHERE is_active = true' : '';
    const result = await pool.query(
        `SELECT * FROM bau_email_templates ${whereClause} ORDER BY created_at DESC`
    );
    return result.rows.map(formatTemplate);
}

/**
 * Get template by ID
 */
async function getTemplateById(id) {
    const result = await pool.query(
        'SELECT * FROM bau_email_templates WHERE id = $1',
        [id]
    );
    return result.rows[0] ? formatTemplate(result.rows[0]) : null;
}

/**
 * Update template
 */
async function updateTemplate(id, updates) {
    const { name, subject, bodyHtml, bodyText, variables, isActive } = updates;

    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(name); }
    if (subject !== undefined) { fields.push(`subject = $${paramIndex++}`); values.push(subject); }
    if (bodyHtml !== undefined) { fields.push(`body_html = $${paramIndex++}`); values.push(bodyHtml); }
    if (bodyText !== undefined) { fields.push(`body_text = $${paramIndex++}`); values.push(bodyText); }
    if (variables !== undefined) { fields.push(`variables = $${paramIndex++}`); values.push(JSON.stringify(variables)); }
    if (isActive !== undefined) { fields.push(`is_active = $${paramIndex++}`); values.push(isActive); }

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
        `UPDATE bau_email_templates SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
    );
    return result.rows[0] ? formatTemplate(result.rows[0]) : null;
}

/**
 * Delete template
 */
async function deleteTemplate(id) {
    await pool.query('DELETE FROM bau_email_templates WHERE id = $1', [id]);
}

/**
 * Format template for API response
 */
function formatTemplate(row) {
    return {
        id: row.id,
        name: row.name,
        subject: row.subject,
        bodyHtml: row.body_html,
        bodyText: row.body_text,
        variables: row.variables || [],
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

// ═══════════════════════════════════════════════════════════════
// MERGE TAG PROCESSING
// ═══════════════════════════════════════════════════════════════

/**
 * Process merge tags in content
 */
function processMergeTags(content, data) {
    let processed = content;

    // Replace all merge tags with data
    for (const [tag, description] of Object.entries(MERGE_TAGS)) {
        const key = tag.replace(/[{}]/g, '');
        let value = '';

        // Get value from data
        if (data[key]) {
            value = data[key];
        } else if (key === 'fullName' && data.firstName && data.lastName) {
            value = `${data.firstName} ${data.lastName}`;
        } else if (key === 'currentDate') {
            value = new Date().toLocaleDateString('de-DE');
        } else if (key === 'currentYear') {
            value = new Date().getFullYear().toString();
        } else if (key === 'companyName') {
            value = 'Enterprise Universe';
        } else if (key === 'companyWebsite') {
            value = 'https://enterprise-universe.one';
        } else if (key === 'unsubscribeLink') {
            value = `https://enterprise-universe.one/unsubscribe?email=${encodeURIComponent(data.email || '')}`;
        }

        // Replace tag in content
        processed = processed.replace(new RegExp(tag.replace(/[{}]/g, '\\{\\}'), 'g'), value);
    }

    return processed;
}

/**
 * Get available merge tags
 */
function getMergeTags() {
    return Object.entries(MERGE_TAGS).map(([tag, description]) => ({
        tag,
        description
    }));
}

// ═══════════════════════════════════════════════════════════════
// EMAIL SENDING
// ═══════════════════════════════════════════════════════════════

/**
 * Send email using template
 */
async function sendTemplateEmail(templateId, recipient, data = {}) {
    const template = await getTemplateById(templateId);
    if (!template) {
        throw new Error('Template not found');
    }

    // Process merge tags
    const subject = processMergeTags(template.subject, { ...data, email: recipient });
    const html = processMergeTags(template.bodyHtml, { ...data, email: recipient });
    const text = processMergeTags(template.bodyText || '', { ...data, email: recipient });

    try {
        // Send email
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || 'Enterprise Universe <noreply@enterprise-universe.one>',
            to: recipient,
            subject,
            html,
            text: text || undefined
        });

        // Log send
        await pool.query(
            `INSERT INTO email_send_log (template_id, recipient_email, subject, status)
             VALUES ($1, $2, $3, 'sent')`,
            [templateId, recipient, subject]
        );

        return {
            success: true,
            messageId: info.messageId,
            recipient,
            subject
        };
    } catch (error) {
        // Log error
        await pool.query(
            `INSERT INTO email_send_log (template_id, recipient_email, subject, status, error_message)
             VALUES ($1, $2, $3, 'failed', $4)`,
            [templateId, recipient, subject, error.message]
        );

        throw error;
    }
}

/**
 * Send bulk emails
 */
async function sendBulkEmails(templateId, recipients, commonData = {}) {
    const results = [];

    for (const recipient of recipients) {
        const email = typeof recipient === 'string' ? recipient : recipient.email;
        const data = typeof recipient === 'object' ? { ...commonData, ...recipient } : commonData;

        try {
            const result = await sendTemplateEmail(templateId, email, data);
            results.push(result);
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            results.push({
                success: false,
                recipient: email,
                error: error.message
            });
        }
    }

    return {
        total: recipients.length,
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
    };
}

// ═══════════════════════════════════════════════════════════════
// EMAIL SEQUENCES
// ═══════════════════════════════════════════════════════════════

/**
 * Create email sequence
 */
async function createSequence({ name, description, triggerType = 'manual', triggerConfig = {}, createdBy }) {
    const result = await pool.query(
        `INSERT INTO email_sequences (name, description, trigger_type, trigger_config, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, description, triggerType, JSON.stringify(triggerConfig), createdBy]
    );
    return formatSequence(result.rows[0]);
}

/**
 * Get all sequences
 */
async function getSequences() {
    const result = await pool.query(
        `SELECT s.*, COUNT(e.id) as enrollment_count
         FROM email_sequences s
         LEFT JOIN email_sequence_enrollments e ON s.id = e.sequence_id AND e.status = 'active'
         GROUP BY s.id
         ORDER BY s.created_at DESC`
    );
    return result.rows.map(formatSequence);
}

/**
 * Get sequence by ID with steps
 */
async function getSequenceById(id) {
    const seqResult = await pool.query(
        'SELECT * FROM email_sequences WHERE id = $1',
        [id]
    );

    if (seqResult.rows.length === 0) return null;

    const stepsResult = await pool.query(
        `SELECT s.*, t.name as template_name, t.subject as template_subject
         FROM email_sequence_steps s
         LEFT JOIN bau_email_templates t ON s.template_id = t.id
         WHERE s.sequence_id = $1
         ORDER BY s.step_order`,
        [id]
    );

    const sequence = formatSequence(seqResult.rows[0]);
    sequence.steps = stepsResult.rows.map(step => ({
        id: step.id,
        order: step.step_order,
        templateId: step.template_id,
        templateName: step.template_name,
        templateSubject: step.template_subject,
        delayDays: step.delay_days,
        delayHours: step.delay_hours,
        condition: step.condition,
        isActive: step.is_active
    }));

    return sequence;
}

/**
 * Add step to sequence
 */
async function addSequenceStep(sequenceId, { templateId, order, delayDays = 0, delayHours = 0, condition = {} }) {
    const result = await pool.query(
        `INSERT INTO email_sequence_steps (sequence_id, template_id, step_order, delay_days, delay_hours, condition)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [sequenceId, templateId, order, delayDays, delayHours, JSON.stringify(condition)]
    );
    return result.rows[0];
}

/**
 * Enroll contact in sequence
 */
async function enrollInSequence(sequenceId, email, contactData = {}) {
    // Check if already enrolled
    const existing = await pool.query(
        `SELECT id FROM email_sequence_enrollments
         WHERE sequence_id = $1 AND contact_email = $2 AND status = 'active'`,
        [sequenceId, email]
    );

    if (existing.rows.length > 0) {
        throw new Error('Contact already enrolled in this sequence');
    }

    const result = await pool.query(
        `INSERT INTO email_sequence_enrollments (sequence_id, contact_email, contact_data)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [sequenceId, email, JSON.stringify(contactData)]
    );

    return result.rows[0];
}

/**
 * Process sequence step (send next email)
 */
async function processSequenceStep(enrollmentId) {
    const enrollment = await pool.query(
        `SELECT e.*, s.id as sequence_id
         FROM email_sequence_enrollments e
         JOIN email_sequences s ON e.sequence_id = s.id
         WHERE e.id = $1 AND e.status = 'active'`,
        [enrollmentId]
    );

    if (enrollment.rows.length === 0) return null;

    const { sequence_id, contact_email, contact_data, current_step } = enrollment.rows[0];

    // Get next step
    const step = await pool.query(
        `SELECT * FROM email_sequence_steps
         WHERE sequence_id = $1 AND step_order = $2 AND is_active = true`,
        [sequence_id, current_step + 1]
    );

    if (step.rows.length === 0) {
        // Sequence complete
        await pool.query(
            `UPDATE email_sequence_enrollments
             SET status = 'completed', completed_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [enrollmentId]
        );
        return { completed: true };
    }

    const { template_id } = step.rows[0];

    // Send email
    await sendTemplateEmail(template_id, contact_email, contact_data || {});

    // Update enrollment
    await pool.query(
        `UPDATE email_sequence_enrollments
         SET current_step = current_step + 1, last_email_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [enrollmentId]
    );

    return { sent: true, step: current_step + 1 };
}

/**
 * Format sequence for API
 */
function formatSequence(row) {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        triggerType: row.trigger_type,
        triggerConfig: row.trigger_config,
        isActive: row.is_active,
        enrollmentCount: parseInt(row.enrollment_count) || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

// ═══════════════════════════════════════════════════════════════
// EMAIL ANALYTICS
// ═══════════════════════════════════════════════════════════════

/**
 * Get email statistics
 */
async function getEmailStats(days = 30) {
    const result = await pool.query(
        `SELECT
            COUNT(*) as total_sent,
            COUNT(*) FILTER (WHERE status = 'sent') as delivered,
            COUNT(*) FILTER (WHERE status = 'failed') as failed,
            COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opened,
            COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) as clicked
         FROM email_send_log
         WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'`
    );

    const stats = result.rows[0];
    return {
        totalSent: parseInt(stats.total_sent) || 0,
        delivered: parseInt(stats.delivered) || 0,
        failed: parseInt(stats.failed) || 0,
        opened: parseInt(stats.opened) || 0,
        clicked: parseInt(stats.clicked) || 0,
        openRate: stats.delivered > 0 ? ((stats.opened / stats.delivered) * 100).toFixed(1) : 0,
        clickRate: stats.opened > 0 ? ((stats.clicked / stats.opened) * 100).toFixed(1) : 0,
        period: `${days} days`
    };
}

/**
 * Get recent email sends
 */
async function getRecentEmails(limit = 50) {
    const result = await pool.query(
        `SELECT l.*, t.name as template_name
         FROM email_send_log l
         LEFT JOIN bau_email_templates t ON l.template_id = t.id
         ORDER BY l.created_at DESC
         LIMIT $1`,
        [limit]
    );

    return result.rows.map(row => ({
        id: row.id,
        templateId: row.template_id,
        templateName: row.template_name,
        recipient: row.recipient_email,
        subject: row.subject,
        status: row.status,
        openedAt: row.opened_at,
        clickedAt: row.clicked_at,
        error: row.error_message,
        sentAt: row.created_at
    }));
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT TEMPLATES
// ═══════════════════════════════════════════════════════════════

/**
 * Create default templates
 */
async function createDefaultTemplates() {
    const defaultTemplates = [
        {
            name: 'welcome',
            subject: 'Willkommen bei Enterprise Universe, {{firstName}}!',
            bodyHtml: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Willkommen bei Enterprise Universe!</h1>
        </div>
        <div class="content">
            <p>Hallo {{firstName}},</p>
            <p>vielen Dank für Ihre Registrierung bei Enterprise Universe. Wir freuen uns, Sie an Bord zu haben!</p>
            <p>Mit Enterprise Universe haben Sie Zugang zu:</p>
            <ul>
                <li>🤖 12 AI-gesteuerte Business Bots</li>
                <li>📊 Intelligentes CRM & Lead Management</li>
                <li>💰 Automatisierte Rechnungsstellung</li>
                <li>📧 Professionelle Email-Kampagnen</li>
            </ul>
            <a href="https://app.enterprise-universe.one/login" class="button">Jetzt einloggen →</a>
            <p>Bei Fragen stehen wir Ihnen jederzeit zur Verfügung.</p>
            <p>Mit freundlichen Grüßen,<br>Das Enterprise Universe Team</p>
        </div>
        <div class="footer">
            <p>© {{currentYear}} Enterprise Universe | West Money Bau GmbH</p>
            <p><a href="{{unsubscribeLink}}">Abmelden</a></p>
        </div>
    </div>
</body>
</html>`,
            bodyText: 'Hallo {{firstName}}, willkommen bei Enterprise Universe!',
            variables: ['firstName', 'lastName', 'email']
        },
        {
            name: 'invoice',
            subject: 'Ihre Rechnung von Enterprise Universe',
            bodyHtml: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a1a2e; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #fff; }
        .invoice-box { background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .amount { font-size: 28px; color: #6366f1; font-weight: bold; }
        .button { display: inline-block; background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Enterprise Universe - Rechnung</h2>
        </div>
        <div class="content">
            <p>Guten Tag {{firstName}} {{lastName}},</p>
            <p>anbei erhalten Sie Ihre Rechnung:</p>
            <div class="invoice-box">
                <p><strong>Deal:</strong> {{dealName}}</p>
                <p class="amount">{{dealValue}}</p>
            </div>
            <a href="https://app.enterprise-universe.one/invoice" class="button">Rechnung ansehen & bezahlen</a>
            <p>Vielen Dank für Ihr Vertrauen!</p>
        </div>
    </div>
</body>
</html>`,
            bodyText: 'Ihre Rechnung: {{dealName}} - {{dealValue}}',
            variables: ['firstName', 'lastName', 'dealName', 'dealValue']
        },
        {
            name: 'follow-up',
            subject: 'Kurze Nachfrage zu unserem Gespräch, {{firstName}}',
            bodyHtml: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    </style>
</head>
<body>
    <p>Hallo {{firstName}},</p>
    <p>ich hoffe, es geht Ihnen gut!</p>
    <p>Ich wollte kurz nachfragen, ob Sie bereits die Möglichkeit hatten, sich unsere Lösung anzuschauen?</p>
    <p>Falls Sie noch Fragen haben oder ein kurzes Gespräch wünschen, lassen Sie es mich gerne wissen.</p>
    <p>Ich freue mich auf Ihre Rückmeldung!</p>
    <div class="signature">
        <p>Mit freundlichen Grüßen,<br>
        {{senderName}}<br>
        Enterprise Universe<br>
        {{senderPhone}}</p>
    </div>
</body>
</html>`,
            bodyText: 'Hallo {{firstName}}, ich wollte kurz nachfragen...',
            variables: ['firstName', 'senderName', 'senderPhone']
        }
    ];

    for (const template of defaultTemplates) {
        try {
            // Check if template exists
            const existing = await pool.query(
                'SELECT id FROM bau_email_templates WHERE name = $1',
                [template.name]
            );

            if (existing.rows.length === 0) {
                await createTemplate(template);
                console.log(`✓ Created default template: ${template.name}`);
            }
        } catch (error) {
            console.log(`Template ${template.name} already exists or error:`, error.message);
        }
    }
}

module.exports = {
    initDatabase,
    // Templates
    createTemplate,
    getTemplates,
    getTemplateById,
    updateTemplate,
    deleteTemplate,
    getMergeTags,
    processMergeTags,
    // Sending
    sendTemplateEmail,
    sendBulkEmails,
    // Sequences
    createSequence,
    getSequences,
    getSequenceById,
    addSequenceStep,
    enrollInSequence,
    processSequenceStep,
    // Analytics
    getEmailStats,
    getRecentEmails,
    // Setup
    createDefaultTemplates,
    MERGE_TAGS
};
