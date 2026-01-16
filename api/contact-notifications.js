/**
 * Contact Notification Scheduler
 * Schedules and sends email notifications for project contact points
 *
 * Enterprise Universe - West Money Bau GmbH
 * @version 1.0.0
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { queueEmail } = require('../services/email-queue');

// Data file for scheduled notifications
const NOTIFICATIONS_FILE = path.join(__dirname, '../data/scheduled-notifications.json');

// Ensure data directory exists
function ensureDataDir() {
    const dir = path.dirname(NOTIFICATIONS_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Load notifications
function loadNotifications() {
    ensureDataDir();
    if (!fs.existsSync(NOTIFICATIONS_FILE)) {
        const defaultData = { notifications: [], sent: [] };
        saveNotifications(defaultData);
        return defaultData;
    }
    try {
        return JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf8'));
    } catch (e) {
        return { notifications: [], sent: [] };
    }
}

// Save notifications
function saveNotifications(data) {
    ensureDataDir();
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(data, null, 2));
}

// ═══════════════════════════════════════════════════════════════
// EMAIL TEMPLATES FOR CONTACT NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

const NOTIFICATION_TEMPLATES = {
    // Customer contact templates
    customer_kickoff: {
        subject: 'Projektvorbereitung: {{projectName}} - Kickoff-Termin',
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 25px; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 25px; border-radius: 0 0 10px 10px; }
        .highlight { background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
        .agenda { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .agenda li { padding: 5px 0; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>Kickoff-Termin Erinnerung</h2>
        <p>{{projectName}}</p>
    </div>
    <div class="content">
        <p>Guten Tag {{customerName}},</p>
        <p>dies ist eine freundliche Erinnerung an Ihren bevorstehenden <strong>Kickoff-Termin</strong> fuer Ihr Projekt.</p>

        <div class="highlight">
            <strong>Termin:</strong> {{scheduledDate}}<br>
            <strong>Art:</strong> {{contactMethod}}<br>
            <strong>Projekt:</strong> {{projectName}}
        </div>

        <div class="agenda">
            <h4>Geplante Agenda:</h4>
            <ul>
                {{agendaItems}}
            </ul>
        </div>

        <p>Bitte halten Sie relevante Unterlagen (Grundrisse, Wunschlisten) bereit.</p>
        <p>Bei Rueckfragen erreichen Sie uns jederzeit.</p>

        <p>Mit freundlichen Gruessen,<br>
        <strong>West Money Bau GmbH</strong><br>
        Enterprise Universe Team</p>
    </div>
    <div class="footer">
        West Money Bau GmbH | Smart Home & Industrie 4.0
    </div>
</body>
</html>`
    },

    customer_status: {
        subject: 'Projektstatus: {{projectName}} - Wochentliches Update',
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 25px; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 25px; border-radius: 0 0 10px 10px; }
        .status-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e2e8f0; }
        .progress { background: #dbeafe; border-radius: 20px; height: 20px; overflow: hidden; }
        .progress-bar { background: linear-gradient(90deg, #3b82f6, #2563eb); height: 100%; transition: width 0.3s; }
    </style>
</head>
<body>
    <div class="header">
        <h2>Wochentliches Projekt-Update</h2>
        <p>{{projectName}}</p>
    </div>
    <div class="content">
        <p>Guten Tag {{customerName}},</p>
        <p>hier ist Ihr woechentliches Update zum Projektfortschritt:</p>

        <div class="status-box">
            <h4>Projektfortschritt</h4>
            <div class="progress">
                <div class="progress-bar" style="width: {{progressPercent}}%"></div>
            </div>
            <p style="text-align: center; margin-top: 5px;"><strong>{{progressPercent}}%</strong> abgeschlossen</p>
        </div>

        <div class="status-box">
            <h4>Aktueller Stand</h4>
            <p>{{statusSummary}}</p>
        </div>

        <div class="status-box">
            <h4>Naechste Schritte</h4>
            <ul>
                {{nextSteps}}
            </ul>
        </div>

        <p>Bei Fragen stehen wir Ihnen gerne zur Verfuegung.</p>

        <p>Mit freundlichen Gruessen,<br>
        <strong>West Money Bau GmbH</strong></p>
    </div>
</body>
</html>`
    },

    customer_handover: {
        subject: 'Projektabschluss: {{projectName}} - Uebergabetermin',
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 25px; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 25px; border-radius: 0 0 10px 10px; }
        .checklist { background: #f5f3ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .checklist li { padding: 5px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h2>Projektabschluss & Uebergabe</h2>
        <p>{{projectName}}</p>
    </div>
    <div class="content">
        <p>Guten Tag {{customerName}},</p>
        <p>Ihr Projekt naehert sich dem erfolgreichen Abschluss! Wir moechten Sie an den bevorstehenden <strong>Uebergabetermin</strong> erinnern.</p>

        <div class="checklist">
            <h4>Was Sie erwartet:</h4>
            <ul>
                <li>Vollstaendiger Funktionstest aller Systeme</li>
                <li>Persoenliche Einweisung in die Bedienung</li>
                <li>Uebergabe der Dokumentation</li>
                <li>Erklaerung der Wartungsempfehlungen</li>
            </ul>
        </div>

        <p><strong>Termin:</strong> {{scheduledDate}}<br>
        <strong>Dauer:</strong> ca. 2-3 Stunden</p>

        <p>Wir freuen uns auf den erfolgreichen Projektabschluss!</p>

        <p>Mit freundlichen Gruessen,<br>
        <strong>West Money Bau GmbH</strong></p>
    </div>
</body>
</html>`
    },

    // Subcontractor contact templates
    subcontractor_engagement: {
        subject: 'Projektanfrage: {{projectName}} - {{tradeName}}',
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 25px; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 25px; border-radius: 0 0 10px 10px; }
        .project-box { background: #fff7ed; border: 1px solid #fed7aa; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .tasks { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .cta { display: inline-block; background: #f97316; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h2>Projektanfrage</h2>
        <p>{{tradeName}}</p>
    </div>
    <div class="content">
        <p>Sehr geehrte Damen und Herren,</p>
        <p>wir moechten Sie fuer ein neues Projekt im Bereich <strong>{{tradeName}}</strong> anfragen.</p>

        <div class="project-box">
            <h4>Projektdetails</h4>
            <p><strong>Projekt:</strong> {{projectName}}<br>
            <strong>Kunde:</strong> {{customerName}}<br>
            <strong>Adresse:</strong> {{projectAddress}}<br>
            <strong>Geplanter Start:</strong> {{startDate}}</p>
        </div>

        <div class="tasks">
            <h4>Benoetigte Leistungen:</h4>
            <ul>
                {{taskList}}
            </ul>
        </div>

        <p><strong>Geschaetzte Dauer:</strong> {{estimatedDays}} Arbeitstage</p>

        <p>Bitte teilen Sie uns Ihre Verfuegbarkeit und einen Kostenvoranschlag mit.</p>

        <a href="mailto:projekte@west-money-bau.de?subject=Zusage: {{projectName}}" class="cta">Verfuegbarkeit bestaetigen</a>

        <p>Mit freundlichen Gruessen,<br>
        <strong>West Money Bau GmbH</strong><br>
        Projektkoordination</p>
    </div>
</body>
</html>`
    },

    subcontractor_reminder: {
        subject: 'Erinnerung: Projektstart {{projectName}} - {{tradeName}}',
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #eab308, #ca8a04); color: white; padding: 25px; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 25px; border-radius: 0 0 10px 10px; }
        .alert { background: #fef3c7; border-left: 4px solid #eab308; padding: 15px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h2>Projektstart Erinnerung</h2>
        <p>{{tradeName}}</p>
    </div>
    <div class="content">
        <p>Sehr geehrte Damen und Herren,</p>

        <div class="alert">
            <strong>Erinnerung:</strong> Der Projektstart fuer <strong>{{projectName}}</strong> steht bevor!
        </div>

        <p><strong>Startdatum:</strong> {{startDate}}<br>
        <strong>Adresse:</strong> {{projectAddress}}<br>
        <strong>Ansprechpartner vor Ort:</strong> {{siteContact}}</p>

        <p>Bitte stellen Sie sicher, dass alle Materialien und Mitarbeiter bereitstehen.</p>

        <p>Bei Fragen oder Aenderungen kontaktieren Sie uns bitte umgehend.</p>

        <p>Mit freundlichen Gruessen,<br>
        <strong>West Money Bau GmbH</strong></p>
    </div>
</body>
</html>`
    },

    // Internal team notifications
    internal_reminder: {
        subject: '[INTERN] Kontakt faellig: {{contactType}} - {{projectName}}',
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #64748b, #475569); color: white; padding: 20px; border-radius: 10px 10px 0 0; }
        .content { background: #f1f5f9; padding: 20px; border-radius: 0 0 10px 10px; }
        .action-box { background: white; border: 2px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h2>Kontakt-Erinnerung</h2>
    </div>
    <div class="content">
        <div class="action-box">
            <h4>Aktion erforderlich</h4>
            <p><strong>Typ:</strong> {{contactType}}<br>
            <strong>Projekt:</strong> {{projectName}}<br>
            <strong>Kunde/Partner:</strong> {{contactName}}<br>
            <strong>Faellig:</strong> {{dueDate}}</p>
        </div>

        <p><strong>Beschreibung:</strong><br>{{description}}</p>

        <p><strong>Kontaktdaten:</strong><br>
        {{contactDetails}}</p>

        <p>Bitte den Kontakt durchfuehren und im System dokumentieren.</p>
    </div>
</body>
</html>`
    }
};

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION SCHEDULING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Schedule notifications from communication plan
 */
function scheduleFromCommunicationPlan(customerId, customerData, communicationSchedule, projectData) {
    const data = loadNotifications();
    const scheduledItems = [];
    const now = new Date();

    // Schedule customer contacts
    if (communicationSchedule.customerContacts) {
        communicationSchedule.customerContacts.forEach((contact, index) => {
            const notification = {
                id: `notif-${crypto.randomBytes(6).toString('hex')}`,
                customerId,
                type: 'customer',
                contactType: contact.type,
                templateKey: getTemplateKeyForContactType(contact.type, 'customer'),
                recipient: customerData.email || projectData.customerEmail,
                recipientName: customerData.name || projectData.customerName || 'Kunde',
                projectName: projectData.name || `Projekt ${customerId}`,
                scheduledFor: calculateScheduleDate(contact.timing, projectData.startDate),
                timing: contact.timing,
                method: contact.method,
                agenda: contact.agenda || [],
                status: 'scheduled',
                createdAt: now.toISOString()
            };
            data.notifications.push(notification);
            scheduledItems.push(notification);
        });
    }

    // Schedule subcontractor contacts
    if (communicationSchedule.subcontractorContacts) {
        communicationSchedule.subcontractorContacts.forEach((contact) => {
            const notification = {
                id: `notif-${crypto.randomBytes(6).toString('hex')}`,
                customerId,
                type: 'subcontractor',
                contactType: contact.type,
                templateKey: getTemplateKeyForContactType(contact.type, 'subcontractor'),
                trade: contact.trade,
                recipient: null, // Will be filled when subcontractor is assigned
                projectName: projectData.name || `Projekt ${customerId}`,
                scheduledFor: calculateScheduleDate(contact.timing, projectData.startDate),
                timing: contact.timing,
                method: contact.method,
                status: 'scheduled',
                createdAt: now.toISOString()
            };
            data.notifications.push(notification);
            scheduledItems.push(notification);
        });
    }

    // Schedule internal reminders for team
    const internalEmail = process.env.TEAM_EMAIL || 'team@west-money-bau.de';
    scheduledItems.forEach(item => {
        // Create internal reminder 1 day before each contact
        const reminderDate = new Date(item.scheduledFor);
        reminderDate.setDate(reminderDate.getDate() - 1);

        if (reminderDate > now) {
            const reminder = {
                id: `notif-${crypto.randomBytes(6).toString('hex')}`,
                customerId,
                type: 'internal',
                contactType: item.contactType,
                templateKey: 'internal_reminder',
                recipient: internalEmail,
                projectName: item.projectName,
                relatedNotificationId: item.id,
                scheduledFor: reminderDate.toISOString(),
                status: 'scheduled',
                createdAt: now.toISOString()
            };
            data.notifications.push(reminder);
        }
    });

    saveNotifications(data);

    console.log(`[NOTIFICATIONS] Scheduled ${scheduledItems.length} contact notifications for customer ${customerId}`);

    return {
        success: true,
        scheduled: scheduledItems.length,
        notifications: scheduledItems
    };
}

/**
 * Get template key based on contact type
 */
function getTemplateKeyForContactType(contactType, category) {
    const mappings = {
        customer: {
            'Kickoff': 'customer_kickoff',
            'Statusupdate': 'customer_status',
            'Abnahme': 'customer_handover',
            'default': 'customer_status'
        },
        subcontractor: {
            'Beauftragung': 'subcontractor_engagement',
            'Erinnerung': 'subcontractor_reminder',
            'default': 'subcontractor_engagement'
        }
    };

    const categoryMappings = mappings[category] || mappings.customer;
    return categoryMappings[contactType] || categoryMappings.default;
}

/**
 * Calculate schedule date from timing string
 */
function calculateScheduleDate(timing, projectStartDate) {
    const now = new Date();
    const startDate = projectStartDate ? new Date(projectStartDate) : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // Default 2 weeks from now

    // Parse timing strings
    if (timing === 'Tag 1' || timing === 'Projektstart') {
        return startDate.toISOString();
    }

    if (timing === 'Projektende') {
        // Assume 8 weeks project duration
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 56);
        return endDate.toISOString();
    }

    if (timing === 'Wöchentlich' || timing === 'Woechentlich') {
        // First weekly update 1 week after start
        const weeklyDate = new Date(startDate);
        weeklyDate.setDate(weeklyDate.getDate() + 7);
        return weeklyDate.toISOString();
    }

    // "X Wochen vor Start" pattern
    const weeksBeforeMatch = timing.match(/(\d+)\s*Wochen?\s*vor\s*Start/i);
    if (weeksBeforeMatch) {
        const weeks = parseInt(weeksBeforeMatch[1]);
        const scheduleDate = new Date(startDate);
        scheduleDate.setDate(scheduleDate.getDate() - (weeks * 7));
        return scheduleDate.toISOString();
    }

    // Default: schedule for start date
    return startDate.toISOString();
}

/**
 * Process and send due notifications
 */
async function processDueNotifications() {
    const data = loadNotifications();
    const now = new Date();
    const processed = [];

    for (const notification of data.notifications) {
        if (notification.status !== 'scheduled') continue;

        const scheduledDate = new Date(notification.scheduledFor);
        if (scheduledDate > now) continue;

        // Skip if no recipient
        if (!notification.recipient) {
            console.log(`[NOTIFICATIONS] Skipping ${notification.id} - no recipient assigned`);
            continue;
        }

        try {
            // Get template
            const template = NOTIFICATION_TEMPLATES[notification.templateKey];
            if (!template) {
                console.error(`[NOTIFICATIONS] Template not found: ${notification.templateKey}`);
                notification.status = 'failed';
                notification.error = 'Template not found';
                continue;
            }

            // Build email content
            const emailContent = buildEmailContent(template, notification);

            // Queue email
            const result = queueEmail({
                to: notification.recipient,
                subject: emailContent.subject,
                html: emailContent.html
            }, {
                notificationId: notification.id,
                customerId: notification.customerId,
                type: 'contact_notification'
            });

            if (result.success) {
                notification.status = 'sent';
                notification.sentAt = now.toISOString();
                notification.emailQueueId = result.id;
                processed.push(notification);

                // Move to sent array
                data.sent.push({ ...notification });
            } else {
                notification.status = 'failed';
                notification.error = result.reason;
            }

        } catch (error) {
            console.error(`[NOTIFICATIONS] Error processing ${notification.id}:`, error.message);
            notification.status = 'failed';
            notification.error = error.message;
        }
    }

    // Remove sent notifications from active list
    data.notifications = data.notifications.filter(n => n.status === 'scheduled');

    saveNotifications(data);

    console.log(`[NOTIFICATIONS] Processed ${processed.length} due notifications`);
    return { processed: processed.length, notifications: processed };
}

/**
 * Build email content from template
 */
function buildEmailContent(template, notification) {
    let subject = template.subject;
    let html = template.html;

    // Replace placeholders
    const replacements = {
        '{{projectName}}': notification.projectName || 'Projekt',
        '{{customerName}}': notification.recipientName || 'Kunde',
        '{{tradeName}}': notification.trade || 'Gewerk',
        '{{scheduledDate}}': formatDate(notification.scheduledFor),
        '{{contactMethod}}': notification.method || 'Termin',
        '{{contactType}}': notification.contactType || 'Kontakt',
        '{{contactName}}': notification.recipientName || 'Kontakt',
        '{{dueDate}}': formatDate(notification.scheduledFor),
        '{{description}}': notification.description || '',
        '{{agendaItems}}': (notification.agenda || []).map(item => `<li>${item}</li>`).join(''),
        '{{taskList}}': (notification.tasks || []).map(task => `<li>${task}</li>`).join(''),
        '{{progressPercent}}': notification.progressPercent || '0',
        '{{statusSummary}}': notification.statusSummary || 'Projekt lauft planmaessig.',
        '{{nextSteps}}': (notification.nextSteps || ['Fortsetzung nach Plan']).map(step => `<li>${step}</li>`).join(''),
        '{{startDate}}': formatDate(notification.startDate || notification.scheduledFor),
        '{{projectAddress}}': notification.projectAddress || 'Adresse wird mitgeteilt',
        '{{estimatedDays}}': notification.estimatedDays || '5',
        '{{siteContact}}': notification.siteContact || 'Projektleiter',
        '{{contactDetails}}': notification.contactDetails || ''
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
        subject = subject.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
        html = html.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    return { subject, html };
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// ═══════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all scheduled notifications
 */
async function getNotifications(req, res) {
    try {
        const { customerId, status, type } = req.query;
        const data = loadNotifications();

        let notifications = data.notifications;

        if (customerId) {
            notifications = notifications.filter(n => n.customerId === customerId);
        }
        if (status) {
            notifications = notifications.filter(n => n.status === status);
        }
        if (type) {
            notifications = notifications.filter(n => n.type === type);
        }

        res.json({
            success: true,
            count: notifications.length,
            notifications
        });
    } catch (error) {
        console.error('[NOTIFICATIONS] Get error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Get notification by ID
 */
async function getNotificationById(req, res) {
    try {
        const { id } = req.params;
        const data = loadNotifications();

        const notification = data.notifications.find(n => n.id === id) ||
                           data.sent.find(n => n.id === id);

        if (!notification) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }

        res.json({ success: true, notification });
    } catch (error) {
        console.error('[NOTIFICATIONS] Get by ID error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Schedule notifications for a customer
 */
async function scheduleNotifications(req, res) {
    try {
        const { customerId } = req.params;
        const { communicationSchedule, customerData, projectData } = req.body;

        if (!communicationSchedule) {
            return res.status(400).json({ success: false, error: 'Communication schedule required' });
        }

        const result = scheduleFromCommunicationPlan(
            customerId,
            customerData || {},
            communicationSchedule,
            projectData || {}
        );

        res.json(result);
    } catch (error) {
        console.error('[NOTIFICATIONS] Schedule error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Manually trigger sending of due notifications
 */
async function triggerNotifications(req, res) {
    try {
        const result = await processDueNotifications();
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('[NOTIFICATIONS] Trigger error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Update notification (e.g., assign recipient to subcontractor notification)
 */
async function updateNotification(req, res) {
    try {
        const { id } = req.params;
        const updates = req.body;
        const data = loadNotifications();

        const notification = data.notifications.find(n => n.id === id);
        if (!notification) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }

        // Apply updates
        Object.assign(notification, updates, { updatedAt: new Date().toISOString() });
        saveNotifications(data);

        res.json({ success: true, notification });
    } catch (error) {
        console.error('[NOTIFICATIONS] Update error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Cancel a scheduled notification
 */
async function cancelNotification(req, res) {
    try {
        const { id } = req.params;
        const data = loadNotifications();

        const index = data.notifications.findIndex(n => n.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }

        const cancelled = data.notifications.splice(index, 1)[0];
        cancelled.status = 'cancelled';
        cancelled.cancelledAt = new Date().toISOString();
        data.sent.push(cancelled);

        saveNotifications(data);

        res.json({ success: true, message: 'Notification cancelled', notification: cancelled });
    } catch (error) {
        console.error('[NOTIFICATIONS] Cancel error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Get sent notification history
 */
async function getNotificationHistory(req, res) {
    try {
        const { customerId, limit = 50 } = req.query;
        const data = loadNotifications();

        let sent = data.sent;
        if (customerId) {
            sent = sent.filter(n => n.customerId === customerId);
        }

        // Sort by sentAt descending and limit
        sent = sent
            .sort((a, b) => new Date(b.sentAt || b.createdAt) - new Date(a.sentAt || a.createdAt))
            .slice(0, parseInt(limit));

        res.json({
            success: true,
            count: sent.length,
            history: sent
        });
    } catch (error) {
        console.error('[NOTIFICATIONS] History error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Get available notification templates
 */
async function getTemplates(req, res) {
    try {
        const templates = Object.entries(NOTIFICATION_TEMPLATES).map(([key, template]) => ({
            key,
            subject: template.subject,
            description: getTemplateDescription(key)
        }));

        res.json({ success: true, templates });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

function getTemplateDescription(key) {
    const descriptions = {
        customer_kickoff: 'Kickoff-Termin Erinnerung fuer Kunden',
        customer_status: 'Woechentliches Projekt-Status Update',
        customer_handover: 'Projektabschluss und Uebergabe Einladung',
        subcontractor_engagement: 'Subunternehmer Projektanfrage',
        subcontractor_reminder: 'Erinnerung an Subunternehmer vor Projektstart',
        internal_reminder: 'Interne Team-Erinnerung fuer faellige Kontakte'
    };
    return descriptions[key] || 'Benachrichtigungsvorlage';
}

// ═══════════════════════════════════════════════════════════════
// SETUP ROUTES
// ═══════════════════════════════════════════════════════════════

function setupContactNotificationRoutes(app) {
    // Get all notifications
    app.get('/api/notifications', getNotifications);

    // Get notification templates
    app.get('/api/notifications/templates', getTemplates);

    // Get notification history
    app.get('/api/notifications/history', getNotificationHistory);

    // Trigger processing of due notifications
    app.post('/api/notifications/process', triggerNotifications);

    // Get single notification
    app.get('/api/notifications/:id', getNotificationById);

    // Update notification
    app.put('/api/notifications/:id', express.json(), updateNotification);

    // Cancel notification
    app.delete('/api/notifications/:id', cancelNotification);

    // Schedule notifications for a customer
    app.post('/api/customer/:customerId/notifications/schedule', express.json(), scheduleNotifications);

    // Get customer's notifications
    app.get('/api/customer/:customerId/notifications', (req, res) => {
        req.query.customerId = req.params.customerId;
        getNotifications(req, res);
    });

    console.log('[NOTIFICATIONS] Contact notification routes registered');
}

module.exports = {
    setupContactNotificationRoutes,
    scheduleFromCommunicationPlan,
    processDueNotifications,
    NOTIFICATION_TEMPLATES,
    loadNotifications,
    saveNotifications
};
