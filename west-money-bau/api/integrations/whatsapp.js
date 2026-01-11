/**
 * WhatsApp Business Integration for West Money Bau
 * Handles notifications for projects, subcontractors, and customers
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const WHATSAPP_BUSINESS_ID = process.env.WHATSAPP_BUSINESS_ID;
const WHATSAPP_BASE_URL = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}`;

// Message templates (must be approved in Meta Business Suite)
const TEMPLATES = {
    // Project notifications
    PROJECT_INQUIRY_RECEIVED: 'bau_project_inquiry_received',
    PROJECT_QUOTE_READY: 'bau_project_quote_ready',
    PROJECT_STARTED: 'bau_project_started',
    PROJECT_UPDATE: 'bau_project_update',
    PROJECT_COMPLETED: 'bau_project_completed',

    // Subcontractor notifications
    SUB_APPLICATION_RECEIVED: 'bau_sub_application_received',
    SUB_APPLICATION_APPROVED: 'bau_sub_application_approved',
    SUB_ASSIGNMENT_OFFER: 'bau_sub_assignment_offer',
    SUB_PAYMENT_SENT: 'bau_sub_payment_sent',

    // Customer notifications
    APPOINTMENT_REMINDER: 'bau_appointment_reminder',
    INVOICE_SENT: 'bau_invoice_sent',
    PAYMENT_RECEIVED: 'bau_payment_received'
};

/**
 * Send WhatsApp message via template
 */
async function sendTemplateMessage(to, templateName, components = []) {
    // Format phone number (ensure +49 format for Germany, etc.)
    const formattedPhone = formatPhoneNumber(to);

    const payload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
            name: templateName,
            language: { code: 'de' },
            components: components
        }
    };

    return await whatsappRequest('/messages', 'POST', payload);
}

/**
 * Send plain text message (for replies within 24h window)
 */
async function sendTextMessage(to, text) {
    const formattedPhone = formatPhoneNumber(to);

    const payload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: { body: text }
    };

    return await whatsappRequest('/messages', 'POST', payload);
}

/**
 * Send message with interactive buttons
 */
async function sendInteractiveMessage(to, body, buttons) {
    const formattedPhone = formatPhoneNumber(to);

    const payload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'interactive',
        interactive: {
            type: 'button',
            body: { text: body },
            action: {
                buttons: buttons.map((btn, index) => ({
                    type: 'reply',
                    reply: {
                        id: btn.id || `btn_${index}`,
                        title: btn.title.substring(0, 20) // Max 20 chars
                    }
                }))
            }
        }
    };

    return await whatsappRequest('/messages', 'POST', payload);
}

/**
 * Send document (e.g., invoice, contract)
 */
async function sendDocument(to, documentUrl, filename, caption) {
    const formattedPhone = formatPhoneNumber(to);

    const payload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'document',
        document: {
            link: documentUrl,
            filename: filename,
            caption: caption
        }
    };

    return await whatsappRequest('/messages', 'POST', payload);
}

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Notify customer about project inquiry received
 */
async function notifyProjectInquiryReceived(phone, customerName, projectNumber) {
    return await sendTemplateMessage(phone, TEMPLATES.PROJECT_INQUIRY_RECEIVED, [
        {
            type: 'body',
            parameters: [
                { type: 'text', text: customerName },
                { type: 'text', text: projectNumber }
            ]
        }
    ]);
}

/**
 * Notify customer that quote is ready
 */
async function notifyQuoteReady(phone, customerName, projectTitle, amount) {
    return await sendTemplateMessage(phone, TEMPLATES.PROJECT_QUOTE_READY, [
        {
            type: 'body',
            parameters: [
                { type: 'text', text: customerName },
                { type: 'text', text: projectTitle },
                { type: 'text', text: `${amount.toLocaleString('de-DE')} EUR` }
            ]
        }
    ]);
}

/**
 * Notify subcontractor about new assignment offer
 */
async function notifyAssignmentOffer(phone, subcontractorName, projectTitle, deadline) {
    return await sendTemplateMessage(phone, TEMPLATES.SUB_ASSIGNMENT_OFFER, [
        {
            type: 'body',
            parameters: [
                { type: 'text', text: subcontractorName },
                { type: 'text', text: projectTitle },
                { type: 'text', text: deadline }
            ]
        }
    ]);
}

/**
 * Notify subcontractor about application status
 */
async function notifyApplicationApproved(phone, subcontractorName) {
    return await sendTemplateMessage(phone, TEMPLATES.SUB_APPLICATION_APPROVED, [
        {
            type: 'body',
            parameters: [
                { type: 'text', text: subcontractorName }
            ]
        }
    ]);
}

/**
 * Notify subcontractor about payment
 */
async function notifyPaymentSent(phone, subcontractorName, amount, projectTitle) {
    return await sendTemplateMessage(phone, TEMPLATES.SUB_PAYMENT_SENT, [
        {
            type: 'body',
            parameters: [
                { type: 'text', text: subcontractorName },
                { type: 'text', text: `${amount.toLocaleString('de-DE')} EUR` },
                { type: 'text', text: projectTitle }
            ]
        }
    ]);
}

/**
 * Send appointment reminder
 */
async function sendAppointmentReminder(phone, customerName, date, time, address) {
    return await sendTemplateMessage(phone, TEMPLATES.APPOINTMENT_REMINDER, [
        {
            type: 'body',
            parameters: [
                { type: 'text', text: customerName },
                { type: 'text', text: date },
                { type: 'text', text: time },
                { type: 'text', text: address }
            ]
        }
    ]);
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Make authenticated request to WhatsApp API
 */
async function whatsappRequest(endpoint, method = 'GET', data = null) {
    const url = `${WHATSAPP_BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
            'Content-Type': 'application/json'
        }
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        const result = await response.json();

        if (!response.ok) {
            console.error('[WhatsApp] API Error:', result);
            throw new Error(result.error?.message || 'WhatsApp API error');
        }

        console.log('[WhatsApp] Message sent:', result.messages?.[0]?.id);
        return result;
    } catch (error) {
        console.error('[WhatsApp] Request failed:', error.message);
        throw error;
    }
}

/**
 * Format phone number for WhatsApp API
 */
function formatPhoneNumber(phone) {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Handle German numbers
    if (cleaned.startsWith('0')) {
        cleaned = '49' + cleaned.substring(1);
    }

    // Ensure it starts with country code
    if (!cleaned.startsWith('49') && !cleaned.startsWith('43') && !cleaned.startsWith('41')) {
        // Default to Germany
        cleaned = '49' + cleaned;
    }

    return cleaned;
}

/**
 * Handle incoming webhook from WhatsApp
 */
async function handleWebhook(payload) {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.messages) {
        const message = value.messages[0];
        const contact = value.contacts?.[0];

        return {
            type: 'message',
            from: message.from,
            name: contact?.profile?.name,
            messageId: message.id,
            timestamp: message.timestamp,
            text: message.text?.body,
            buttonReply: message.interactive?.button_reply
        };
    }

    if (value?.statuses) {
        const status = value.statuses[0];
        return {
            type: 'status',
            messageId: status.id,
            status: status.status,
            timestamp: status.timestamp
        };
    }

    return { type: 'unknown', data: payload };
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(payload, signature, appSecret) {
    const crypto = require('crypto');
    const expectedSignature = crypto
        .createHmac('sha256', appSecret)
        .update(payload)
        .digest('hex');

    return `sha256=${expectedSignature}` === signature;
}

module.exports = {
    sendTemplateMessage,
    sendTextMessage,
    sendInteractiveMessage,
    sendDocument,
    notifyProjectInquiryReceived,
    notifyQuoteReady,
    notifyAssignmentOffer,
    notifyApplicationApproved,
    notifyPaymentSent,
    sendAppointmentReminder,
    handleWebhook,
    verifyWebhookSignature,
    formatPhoneNumber,
    TEMPLATES
};
