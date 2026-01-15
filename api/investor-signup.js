/**
 * Investor Signup API Endpoint
 * Handles investor interest form submissions
 * Sends notifications to invest@enterprise-universe.one
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Email configuration
const INVESTOR_EMAIL = 'invest@enterprise-universe.one';
const FROM_EMAIL = process.env.SMTP_FROM || 'noreply@enterprise-universe.one';

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: process.env.SMTP_PORT || 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER || FROM_EMAIL,
        pass: process.env.SMTP_PASS
    }
});

// Log file for investor signups
const LOG_FILE = path.join(__dirname, '../logs/investor-signups.json');

// Ensure logs directory exists
function ensureLogDirectory() {
    const logsDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
}

// Log investor signup
function logInvestorSignup(data) {
    ensureLogDirectory();

    let signups = [];
    if (fs.existsSync(LOG_FILE)) {
        try {
            signups = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        } catch (e) {
            signups = [];
        }
    }

    const entry = {
        ...data,
        id: `INV-${Date.now()}`,
        status: 'pending_review',
        createdAt: new Date().toISOString()
    };

    signups.push(entry);
    fs.writeFileSync(LOG_FILE, JSON.stringify(signups, null, 2));
    return entry;
}

// Format check size for display
function formatCheckSize(size) {
    const labels = {
        '<50k': 'Under EUR 50K',
        '50k-100k': 'EUR 50K - 100K',
        '100k-250k': 'EUR 100K - 250K',
        '250k-500k': 'EUR 250K - 500K',
        '500k+': 'EUR 500K+'
    };
    return labels[size] || size || 'Not specified';
}

// Format investor type for display
function formatInvestorType(type) {
    const labels = {
        'vc': 'Venture Capital',
        'angel': 'Angel Investor',
        'family-office': 'Family Office',
        'corporate-vc': 'Corporate VC',
        'syndicate': 'Syndicate / SPV',
        'other': 'Other'
    };
    return labels[type] || type || 'Not specified';
}

// Format investment focus for display
function formatInvestmentFocus(focus) {
    const labels = {
        'pre-seed': 'Pre-Seed',
        'seed': 'Seed',
        'series-a': 'Series A',
        'growth': 'Growth',
        'multi-stage': 'Multi-Stage'
    };
    return labels[focus] || focus || 'Not specified';
}

// Internal notification email template
function getInternalEmailTemplate(data) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #f5f5f5; padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1e3a8a, #7c3aed); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
        .header .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 6px 16px; border-radius: 20px; font-size: 14px; margin-top: 10px; }
        .content { padding: 30px; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
        .field { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .field:last-child { border-bottom: none; }
        .field-label { color: #64748b; font-size: 14px; }
        .field-value { color: #1e293b; font-size: 14px; font-weight: 500; text-align: right; }
        .highlight { background: linear-gradient(135deg, #dbeafe, #ede9fe); border-radius: 12px; padding: 16px; margin: 20px 0; }
        .highlight-label { font-size: 12px; color: #6366f1; text-transform: uppercase; font-weight: 600; }
        .highlight-value { font-size: 24px; font-weight: 700; color: #1e3a8a; }
        .message-box { background: #f8fafc; border-radius: 12px; padding: 16px; margin-top: 16px; }
        .message-box p { margin: 0; color: #475569; font-size: 14px; line-height: 1.6; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; }
        .action-btn { display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
        .footer-text { color: #94a3b8; font-size: 12px; margin-top: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>New Investor Interest</h1>
            <span class="badge">Data Room Access Request</span>
        </div>
        <div class="content">
            <div class="section">
                <div class="section-title">Contact Information</div>
                <div class="field">
                    <span class="field-label">Name</span>
                    <span class="field-value">${data.firstName} ${data.lastName}</span>
                </div>
                <div class="field">
                    <span class="field-label">Email</span>
                    <span class="field-value"><a href="mailto:${data.email}" style="color: #3b82f6;">${data.email}</a></span>
                </div>
                <div class="field">
                    <span class="field-label">Company</span>
                    <span class="field-value">${data.company}</span>
                </div>
                <div class="field">
                    <span class="field-label">Title</span>
                    <span class="field-value">${data.title || 'Not specified'}</span>
                </div>
            </div>

            <div class="highlight">
                <div class="highlight-label">Typical Check Size</div>
                <div class="highlight-value">${formatCheckSize(data.checkSize)}</div>
            </div>

            <div class="section">
                <div class="section-title">Investment Profile</div>
                <div class="field">
                    <span class="field-label">Investor Type</span>
                    <span class="field-value">${formatInvestorType(data.investorType)}</span>
                </div>
                <div class="field">
                    <span class="field-label">Investment Focus</span>
                    <span class="field-value">${formatInvestmentFocus(data.investmentFocus)}</span>
                </div>
                <div class="field">
                    <span class="field-label">Source</span>
                    <span class="field-value">${data.source || 'Not specified'}</span>
                </div>
            </div>

            ${data.message ? `
            <div class="section">
                <div class="section-title">Message</div>
                <div class="message-box">
                    <p>${data.message}</p>
                </div>
            </div>
            ` : ''}

            <div class="section">
                <div class="section-title">Metadata</div>
                <div class="field">
                    <span class="field-label">Submitted</span>
                    <span class="field-value">${new Date(data.timestamp).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</span>
                </div>
                <div class="field">
                    <span class="field-label">GDPR Consent</span>
                    <span class="field-value" style="color: ${data.gdprConsent ? '#22c55e' : '#ef4444'};">${data.gdprConsent ? 'Yes' : 'No'}</span>
                </div>
            </div>
        </div>
        <div class="footer">
            <a href="https://enterprise-universe.one/investor-portal" class="action-btn">Review in Investor Portal</a>
            <p class="footer-text">Enterprise Universe GmbH | Investor Relations</p>
        </div>
    </div>
</body>
</html>
`;
}

// Investor confirmation email template
function getInvestorConfirmationTemplate(data) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #0f172a; padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
        .header { background: linear-gradient(135deg, #1e3a8a, #7c3aed); color: white; padding: 40px; text-align: center; }
        .logo { font-size: 48px; font-weight: 900; margin-bottom: 16px; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .content { padding: 40px; color: #e2e8f0; }
        .content p { line-height: 1.8; margin-bottom: 20px; font-size: 15px; }
        .timeline { background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; border-radius: 0 12px 12px 0; padding: 20px 24px; margin: 24px 0; }
        .timeline h3 { color: #3b82f6; font-size: 14px; text-transform: uppercase; margin: 0 0 16px 0; font-weight: 600; }
        .timeline-item { display: flex; align-items: flex-start; margin-bottom: 12px; }
        .timeline-item:last-child { margin-bottom: 0; }
        .timeline-dot { width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; margin-right: 12px; margin-top: 6px; flex-shrink: 0; }
        .timeline-text { color: #cbd5e1; font-size: 14px; }
        .highlight-box { background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15)); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; }
        .highlight-box h3 { color: #a78bfa; margin: 0 0 8px 0; font-size: 16px; }
        .highlight-box p { color: #94a3b8; margin: 0; font-size: 14px; }
        .footer { background: rgba(0,0,0,0.2); padding: 24px; text-align: center; }
        .footer p { color: #64748b; font-size: 12px; margin: 0; }
        .footer a { color: #3b82f6; }
        .signature { margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); }
        .signature p { margin: 0; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">EU</div>
            <h1>Thank You for Your Interest</h1>
            <p>We're excited to share our vision with you</p>
        </div>
        <div class="content">
            <p>Dear ${data.firstName},</p>

            <p>Thank you for expressing interest in Enterprise Universe. We're building the future of SME automation in the DACH region, and we're thrilled that you'd like to learn more about our seed round.</p>

            <div class="timeline">
                <h3>What Happens Next</h3>
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-text">Our team reviews your profile (typically within 24 hours)</div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-text">You'll receive secure access to our Data Room</div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-text">Schedule a personal call with our founding team</div>
                </div>
            </div>

            <div class="highlight-box">
                <h3>Data Room Includes</h3>
                <p>Pitch Deck &bull; Financial Model &bull; Term Sheet &bull; Due Diligence Documents</p>
            </div>

            <p>In the meantime, feel free to visit our <a href="https://enterprise-universe.one" style="color: #3b82f6;">website</a> to learn more about our platform and the problems we're solving.</p>

            <p>If you have any immediate questions, don't hesitate to reach out directly.</p>

            <div class="signature">
                <p><strong>Best regards,</strong></p>
                <p style="margin-top: 8px;">Omer Huseyin Coskun</p>
                <p style="color: #64748b;">Founder & CEO, Enterprise Universe GmbH</p>
                <p style="margin-top: 8px;"><a href="mailto:invest@enterprise-universe.one" style="color: #3b82f6;">invest@enterprise-universe.one</a></p>
            </div>
        </div>
        <div class="footer">
            <p>Enterprise Universe GmbH | Leienbergstr. 1, 53783 Eitorf</p>
            <p style="margin-top: 8px;"><a href="https://enterprise-universe.one">enterprise-universe.one</a></p>
        </div>
    </div>
</body>
</html>
`;
}

// Main handler function
async function handleInvestorSignup(req, res) {
    try {
        const {
            firstName,
            lastName,
            email,
            company,
            title,
            checkSize,
            investmentFocus,
            investorType,
            source,
            message,
            gdprConsent,
            timestamp
        } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !company) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: firstName, lastName, email, company'
            });
        }

        // Validate GDPR consent
        if (!gdprConsent) {
            return res.status(400).json({
                success: false,
                error: 'GDPR consent is required'
            });
        }

        const data = {
            firstName,
            lastName,
            email,
            company,
            title,
            checkSize,
            investmentFocus,
            investorType,
            source,
            message,
            gdprConsent,
            timestamp: timestamp || new Date().toISOString()
        };

        // Log the signup
        const logEntry = logInvestorSignup(data);

        // Send emails
        try {
            // Internal notification
            await transporter.sendMail({
                from: `"Enterprise Universe Investors" <${FROM_EMAIL}>`,
                to: INVESTOR_EMAIL,
                subject: `New Investor Interest: ${company} - ${firstName} ${lastName} [${formatCheckSize(checkSize)}]`,
                html: getInternalEmailTemplate(data)
            });

            // Investor confirmation
            await transporter.sendMail({
                from: `"Enterprise Universe" <${FROM_EMAIL}>`,
                to: email,
                subject: 'Thank You for Your Interest - Enterprise Universe',
                html: getInvestorConfirmationTemplate(data)
            });

            console.log(`[INVESTOR-SIGNUP] Emails sent successfully for ${email}`);
        } catch (emailError) {
            console.error('[INVESTOR-SIGNUP] Email sending failed:', emailError.message);
            // Continue even if email fails - we have the log
        }

        res.json({
            success: true,
            message: 'Investor signup received successfully',
            requestId: logEntry.id
        });

    } catch (error) {
        console.error('[INVESTOR-SIGNUP] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

// Get all investor signups (admin)
async function getInvestorSignups(req, res) {
    try {
        ensureLogDirectory();

        if (!fs.existsSync(LOG_FILE)) {
            return res.json({ signups: [] });
        }

        const signups = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        res.json({ signups });

    } catch (error) {
        console.error('[INVESTOR-SIGNUP] Error fetching signups:', error);
        res.status(500).json({ error: 'Failed to fetch signups' });
    }
}

// Update signup status (admin)
async function updateInvestorSignupStatus(req, res) {
    try {
        const { id, status } = req.body;

        if (!id || !status) {
            return res.status(400).json({ error: 'Missing id or status' });
        }

        ensureLogDirectory();

        if (!fs.existsSync(LOG_FILE)) {
            return res.status(404).json({ error: 'No signups found' });
        }

        const signups = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        const index = signups.findIndex(s => s.id === id);

        if (index === -1) {
            return res.status(404).json({ error: 'Signup not found' });
        }

        signups[index].status = status;
        signups[index].updatedAt = new Date().toISOString();

        fs.writeFileSync(LOG_FILE, JSON.stringify(signups, null, 2));

        res.json({ success: true, signup: signups[index] });

    } catch (error) {
        console.error('[INVESTOR-SIGNUP] Error updating status:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
}

// Setup routes
function setupInvestorSignupRoutes(app) {
    app.post('/api/investor-signup', handleInvestorSignup);
    app.get('/api/investor-signups', getInvestorSignups);
    app.patch('/api/investor-signups', updateInvestorSignupStatus);

    console.log('[INVESTOR-SIGNUP] API routes registered');
}

module.exports = {
    handleInvestorSignup,
    getInvestorSignups,
    updateInvestorSignupStatus,
    setupInvestorSignupRoutes
};
