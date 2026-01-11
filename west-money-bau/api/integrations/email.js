/**
 * Email Integration for West Money Bau
 * Sends notifications for applications, projects, etc.
 */

const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

// SMTP Configuration (using one.com)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'send.one.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER || 'info@enterprise-universe.com',
        pass: process.env.SMTP_PASS
    }
});

// West Money Bau specific settings
const BAU_CONFIG = {
    notificationEmail: 'info@west-money-bau.de',
    senderName: 'West Money Bau',
    senderEmail: process.env.SMTP_USER || 'info@enterprise-universe.com',
    signature: `
Mit freundlichen Gruessen

West Money Bau GmbH
Smart Home & Barrierefreies Bauen
LOXONE Gold Partner

info@west-money-bau.de
https://west-money-bau.de
    `.trim()
};

/**
 * Send email
 */
async function sendEmail({ to, cc, subject, body, html }) {
    try {
        const mailOptions = {
            from: `"${BAU_CONFIG.senderName}" <${BAU_CONFIG.senderEmail}>`,
            to: to,
            cc: cc || undefined,
            subject: subject,
            text: body + '\n\n' + BAU_CONFIG.signature,
            html: html || undefined
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('[Email] Sent:', result.messageId);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('[Email] Error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Notify admin about new subcontractor application
 */
async function notifyNewApplication(application) {
    const { first_name, last_name, email, phone, company_name, country, city, specializations, experience_years, hourly_rate_expected } = application;

    const specs = Array.isArray(specializations) ? specializations.join(', ') : specializations;

    const subject = `Neue Subunternehmer-Bewerbung: ${first_name} ${last_name}`;

    const body = `
Eine neue Subunternehmer-Bewerbung ist eingegangen:

BEWERBER-DETAILS
================
Name: ${first_name} ${last_name}
Firma: ${company_name || 'Einzelunternehmer'}
E-Mail: ${email}
Telefon: ${phone}
Standort: ${city}, ${country}

QUALIFIKATIONEN
===============
Fachrichtungen: ${specs}
Berufserfahrung: ${experience_years} Jahre
Stundensatz: ${hourly_rate_expected ? hourly_rate_expected + ' EUR' : 'Nicht angegeben'}

NAECHSTE SCHRITTE
=================
1. Bewerbung im Dashboard pruefen: https://west-money-bau.de/dashboard/
2. Dokumente anfordern (Gewerbeschein, Versicherung)
3. Gegebenenfalls Interview vereinbaren

Diese E-Mail wurde automatisch generiert.
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: linear-gradient(135deg, #00c853, #009624); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .section { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #00c853; }
        .label { color: #666; font-size: 12px; text-transform: uppercase; }
        .value { font-size: 16px; font-weight: 500; }
        .cta { display: inline-block; background: #ff6d00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        .footer { padding: 15px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h2 style="margin:0;">Neue Subunternehmer-Bewerbung</h2>
        <p style="margin:5px 0 0 0; opacity:0.9;">${first_name} ${last_name} - ${city}, ${country}</p>
    </div>
    <div class="content">
        <div class="section">
            <div class="label">Bewerber</div>
            <div class="value">${first_name} ${last_name}</div>
            <div style="margin-top:8px;">
                <strong>Firma:</strong> ${company_name || 'Einzelunternehmer'}<br>
                <strong>E-Mail:</strong> <a href="mailto:${email}">${email}</a><br>
                <strong>Telefon:</strong> <a href="tel:${phone}">${phone}</a>
            </div>
        </div>
        <div class="section">
            <div class="label">Qualifikationen</div>
            <div class="value">${specs}</div>
            <div style="margin-top:8px;">
                <strong>Erfahrung:</strong> ${experience_years} Jahre<br>
                <strong>Stundensatz:</strong> ${hourly_rate_expected ? hourly_rate_expected + ' EUR' : 'Nicht angegeben'}
            </div>
        </div>
        <a href="https://west-money-bau.de/dashboard/" class="cta">Im Dashboard ansehen</a>
    </div>
    <div class="footer">
        Diese E-Mail wurde automatisch von West Money Bau generiert.
    </div>
</body>
</html>
    `.trim();

    return await sendEmail({
        to: BAU_CONFIG.notificationEmail,
        subject,
        body,
        html
    });
}

/**
 * Notify admin about new project inquiry
 */
async function notifyNewProjectInquiry(project, customer) {
    const subject = `Neue Projektanfrage: ${project.project_type} - ${customer.first_name} ${customer.last_name}`;

    const body = `
Eine neue Projektanfrage ist eingegangen:

KUNDE
=====
Name: ${customer.first_name} ${customer.last_name}
E-Mail: ${customer.email}
Telefon: ${customer.phone || 'Nicht angegeben'}

PROJEKT
=======
Typ: ${project.project_type}
Projektnummer: ${project.project_number}
Beschreibung: ${project.description || 'Keine Beschreibung'}

Dashboard: https://west-money-bau.de/dashboard/
    `.trim();

    return await sendEmail({
        to: BAU_CONFIG.notificationEmail,
        subject,
        body
    });
}

/**
 * Send confirmation email to applicant
 */
async function sendApplicationConfirmation(application) {
    const { first_name, email } = application;

    const subject = 'Ihre Bewerbung bei West Money Bau';

    const body = `
Hallo ${first_name},

vielen Dank fuer Ihre Bewerbung als Subunternehmer bei West Money Bau!

Wir haben Ihre Unterlagen erhalten und werden diese sorgfaeltig pruefen. Sie koennen mit einer Rueckmeldung innerhalb von 48 Stunden rechnen.

Bei Fragen stehen wir Ihnen gerne zur Verfuegung.
    `.trim();

    return await sendEmail({
        to: email,
        subject,
        body
    });
}

module.exports = {
    sendEmail,
    notifyNewApplication,
    notifyNewProjectInquiry,
    sendApplicationConfirmation,
    BAU_CONFIG
};
