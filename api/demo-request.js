/**
 * Demo Request API Endpoint
 * Handles demo requests and sends emails to register@enterprise-universe.com
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Email configuration
const DEMO_EMAIL = 'register@enterprise-universe.com';
const FROM_EMAIL = process.env.SMTP_FROM || 'noreply@enterprise-universe.one';

// Create transporter (configure with actual SMTP settings)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: process.env.SMTP_PORT || 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER || FROM_EMAIL,
        pass: process.env.SMTP_PASS
    }
});

// Log file for demo requests
const LOG_FILE = path.join(__dirname, '../logs/demo-requests.json');

// Ensure logs directory exists
function ensureLogDirectory() {
    const logsDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
}

// Log demo request
function logDemoRequest(data) {
    ensureLogDirectory();

    let requests = [];
    if (fs.existsSync(LOG_FILE)) {
        try {
            requests = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        } catch (e) {
            requests = [];
        }
    }

    requests.push({
        ...data,
        id: `DEMO-${Date.now()}`,
        status: 'pending',
        createdAt: new Date().toISOString()
    });

    fs.writeFileSync(LOG_FILE, JSON.stringify(requests, null, 2));
    return requests[requests.length - 1];
}

// Email template for internal notification
function getInternalEmailTemplate(data) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .field { margin-bottom: 20px; }
        .field label { display: block; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
        .field value { display: block; color: #333; font-size: 16px; font-weight: 500; }
        .message-box { background: #f8f9fa; border-radius: 8px; padding: 15px; margin-top: 20px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        .badge { display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Neue Demo-Anfrage</h1>
            <span class="badge">Enterprise Universe</span>
        </div>
        <div class="content">
            <div class="field">
                <label>Name</label>
                <value>${data.firstName} ${data.lastName}</value>
            </div>
            <div class="field">
                <label>E-Mail</label>
                <value><a href="mailto:${data.email}">${data.email}</a></value>
            </div>
            <div class="field">
                <label>Unternehmen</label>
                <value>${data.company}</value>
            </div>
            <div class="field">
                <label>Telefon</label>
                <value>${data.phone || 'Nicht angegeben'}</value>
            </div>
            ${data.message ? `
            <div class="message-box">
                <label>Nachricht</label>
                <p>${data.message}</p>
            </div>
            ` : ''}
            <div class="field">
                <label>Zeitstempel</label>
                <value>${new Date(data.timestamp).toLocaleString('de-DE')}</value>
            </div>
        </div>
        <div class="footer">
            <p>Diese Anfrage wurde über enterprise-universe.one gestellt.</p>
        </div>
    </div>
</body>
</html>
`;
}

// Email template for user confirmation
function getUserConfirmationTemplate(data) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #0f0f1a; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #1a1a2e; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 40px; text-align: center; }
        .header h1 { margin: 0 0 10px 0; font-size: 28px; }
        .content { padding: 40px; color: #e0e0e0; }
        .content p { line-height: 1.8; margin-bottom: 20px; }
        .highlight { background: rgba(99, 102, 241, 0.1); border-left: 4px solid #6366f1; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .footer { background: rgba(0,0,0,0.2); padding: 20px; text-align: center; color: #888; font-size: 12px; }
        .logo { font-size: 36px; font-weight: 900; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">EU</div>
            <h1>Vielen Dank für Ihr Interesse!</h1>
        </div>
        <div class="content">
            <p>Hallo ${data.firstName},</p>

            <p>vielen Dank für Ihre Anfrage zur Demo-Version von Enterprise Universe. Wir freuen uns über Ihr Interesse an unserer KI-gestützten Business-Automation-Plattform.</p>

            <div class="highlight">
                <strong>Was passiert als Nächstes?</strong><br>
                Unser Team wird sich innerhalb von 24 Stunden bei Ihnen melden, um einen persönlichen Demo-Termin zu vereinbaren.
            </div>

            <p>In der Demo werden wir Ihnen zeigen:</p>
            <ul>
                <li>Unsere 25 spezialisierten AI Agents</li>
                <li>Die CRM & ERP Integration</li>
                <li>WhatsApp Business Automation</li>
                <li>Und vieles mehr...</li>
            </ul>

            <p>Bei Fragen erreichen Sie uns jederzeit unter <a href="mailto:info@enterprise-universe.one" style="color: #6366f1;">info@enterprise-universe.one</a>.</p>

            <p>Mit freundlichen Grüßen,<br>
            <strong>Das Enterprise Universe Team</strong></p>
        </div>
        <div class="footer">
            <p>Enterprise Universe GmbH (i.G.) | Leienbergstr. 1, 53783 Eitorf</p>
            <p><a href="https://enterprise-universe.one" style="color: #6366f1;">enterprise-universe.one</a></p>
        </div>
    </div>
</body>
</html>
`;
}

// Main handler function
async function handleDemoRequest(req, res) {
    try {
        const { firstName, lastName, email, company, phone, message, timestamp } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !company) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const data = { firstName, lastName, email, company, phone, message, timestamp };

        // Log the request
        const logEntry = logDemoRequest(data);

        // Send email to register@enterprise-universe.com
        try {
            await transporter.sendMail({
                from: `"Enterprise Universe" <${FROM_EMAIL}>`,
                to: DEMO_EMAIL,
                subject: `Neue Demo-Anfrage: ${company} - ${firstName} ${lastName}`,
                html: getInternalEmailTemplate(data)
            });

            // Send confirmation email to user
            await transporter.sendMail({
                from: `"Enterprise Universe" <${FROM_EMAIL}>`,
                to: email,
                subject: 'Ihre Demo-Anfrage bei Enterprise Universe',
                html: getUserConfirmationTemplate(data)
            });

            console.log(`[DEMO-REQUEST] Email sent successfully for ${email}`);
        } catch (emailError) {
            console.error('[DEMO-REQUEST] Email sending failed:', emailError.message);
            // Continue even if email fails - we have the log
        }

        res.json({
            success: true,
            message: 'Demo request received successfully',
            requestId: logEntry.id
        });

    } catch (error) {
        console.error('[DEMO-REQUEST] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

// Get all demo requests (admin)
async function getDemoRequests(req, res) {
    try {
        ensureLogDirectory();

        if (!fs.existsSync(LOG_FILE)) {
            return res.json({ requests: [] });
        }

        const requests = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        res.json({ requests });

    } catch (error) {
        console.error('[DEMO-REQUEST] Error fetching requests:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
}

// Setup routes
function setupDemoRequestRoutes(app) {
    app.post('/api/demo-request', handleDemoRequest);
    app.get('/api/demo-requests', getDemoRequests);

    console.log('Demo Request API routes registered');
}

module.exports = {
    handleDemoRequest,
    getDemoRequests,
    setupDemoRequestRoutes
};
