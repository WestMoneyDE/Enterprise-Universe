/**
 * Email Service for Daemons
 * Centralized email sending for all background workers
 */

const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'send.one.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const CONFIG = {
    from: process.env.SMTP_FROM || `"Enterprise Universe" <${process.env.SMTP_USER}>`,
    adminEmail: 'info@enterprise-universe.com',
    replyTo: 'info@enterprise-universe.com'
};

async function sendEmail({ to, subject, body, html, cc, attachments }) {
    try {
        const result = await transporter.sendMail({
            from: CONFIG.from,
            to: to,
            cc: cc,
            replyTo: CONFIG.replyTo,
            subject: subject,
            text: body,
            html: html,
            attachments: attachments
        });
        console.log(`[EmailService] Sent: ${result.messageId}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error(`[EmailService] Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function sendAlert({ subject, message }) {
    return await sendEmail({
        to: CONFIG.adminEmail,
        subject: `[ALERT] ${subject}`,
        body: message
    });
}

async function sendReport({ subject, html, attachments }) {
    return await sendEmail({
        to: CONFIG.adminEmail,
        subject: subject,
        html: html,
        attachments: attachments
    });
}

module.exports = {
    sendEmail,
    sendAlert,
    sendReport,
    CONFIG
};
