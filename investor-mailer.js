/**
 * INVESTOR MASS MAILER
 * €3 Mrd Pipeline Announcement
 *
 * Enterprise Universe GmbH
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// SMTP Configuration
const transporter = nodemailer.createTransport({
    host: 'send.one.com',
    port: 587,
    secure: false,
    auth: {
        user: 'invoice@enterprise-universe.com',
        pass: 'Einfach0!663724'
    }
});

// Email Template - €3 Mrd Pipeline Announcement
const EMAIL_TEMPLATE = {
    subject: '🚀 Enterprise Universe: €3+ Mrd. Pipeline – Seed Round Update',

    html: `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            line-height: 1.8;
            color: #1a1a2e;
            max-width: 650px;
            margin: 0 auto;
            padding: 20px;
            background: #f8fafc;
        }
        .header {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
            color: white;
            padding: 40px 30px;
            border-radius: 16px 16px 0 0;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .header .tagline {
            margin-top: 10px;
            font-size: 16px;
            opacity: 0.9;
        }
        .content {
            background: white;
            padding: 40px 30px;
            border-radius: 0 0 16px 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .metric-box {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-left: 4px solid #6366f1;
            padding: 25px;
            margin: 25px 0;
            border-radius: 0 12px 12px 0;
        }
        .metric-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        .metric {
            text-align: center;
            padding: 15px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .metric-value {
            font-size: 24px;
            font-weight: 700;
            color: #6366f1;
        }
        .metric-label {
            font-size: 12px;
            color: #64748b;
            margin-top: 5px;
        }
        .highlight {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 4px solid #f59e0b;
            padding: 20px;
            margin: 25px 0;
            border-radius: 0 12px 12px 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
        }
        .footer {
            text-align: center;
            padding: 30px;
            color: #64748b;
            font-size: 13px;
        }
        .signature {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
        }
        ul {
            padding-left: 20px;
        }
        li {
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Enterprise Universe</h1>
        <div class="tagline">Seed Round Update | Januar 2026</div>
    </div>

    <div class="content">
        <p>Sehr geehrte Damen und Herren,</p>

        <p>ich freue mich, Ihnen ein bedeutendes Update zu <strong>Enterprise Universe</strong> zu geben.</p>

        <div class="metric-box">
            <h3 style="margin-top: 0; color: #6366f1;">📊 Aktuelle Kennzahlen</h3>
            <div class="metric-grid">
                <div class="metric">
                    <div class="metric-value">€3+ Mrd.</div>
                    <div class="metric-label">Won Pipeline</div>
                </div>
                <div class="metric">
                    <div class="metric-value">€847K</div>
                    <div class="metric-label">Revenue 2024</div>
                </div>
                <div class="metric">
                    <div class="metric-value">€411 Mrd.</div>
                    <div class="metric-label">Gewichtete Pipeline</div>
                </div>
                <div class="metric">
                    <div class="metric-value">12:1</div>
                    <div class="metric-label">LTV:CAC Ratio</div>
                </div>
            </div>
        </div>

        <div class="highlight">
            <strong>🎯 Meilenstein erreicht:</strong> Unsere vertraglich gesicherte Deal-Pipeline hat die <strong>€3 Milliarden-Marke</strong> überschritten – ein klarer Beweis für die Marktreife unserer B2B Enterprise-Plattform.
        </div>

        <h3>Was Enterprise Universe einzigartig macht:</h3>
        <ul>
            <li><strong>Kuratiertes Ökosystem</strong> – Top 5% der Software-Anbieter</li>
            <li><strong>End-to-End Service</strong> – Von Auswahl bis Go-Live</li>
            <li><strong>50% schneller & günstiger</strong> als traditionelle Beratung</li>
            <li><strong>12 Enterprise-Kunden</strong> in 12 Monaten gewonnen</li>
        </ul>

        <h3>💰 Investment-Gelegenheit</h3>
        <p>Wir schließen aktuell unsere <strong>Seed-Runde</strong>:</p>
        <ul>
            <li><strong>Ziel:</strong> €1,5M</li>
            <li><strong>Pre-Money Bewertung:</strong> €15M</li>
            <li><strong>Verwendung:</strong> DACH-Expansion & Tech-Team</li>
        </ul>

        <p style="text-align: center;">
            <a href="mailto:invest@enterprise-universe.one?subject=Interesse%20an%20Seed%20Round" class="cta-button">
                → Pitch Deck anfordern
            </a>
        </p>

        <p>Ich würde mich freuen, Ihnen in einem <strong>20-minütigen Call</strong> unsere Vision und Zahlen zu präsentieren.</p>

        <div class="signature">
            <p>Mit besten Grüßen,</p>
            <p><strong>Ömer Hüseyin Coskun</strong><br>
            Founder & CEO<br>
            Enterprise Universe GmbH</p>
            <p style="color: #6366f1;">
                📧 invest@enterprise-universe.one<br>
                📞 +49 177 4547727<br>
                🌐 enterprise-universe.one
            </p>
        </div>
    </div>

    <div class="footer">
        <p>Enterprise Universe GmbH | Leienbergstr. 1, 53783 Eitorf</p>
        <p>Diese E-Mail wurde an Investoren gesendet, die sich für B2B SaaS und Enterprise Software interessieren.</p>
    </div>
</body>
</html>`,

    text: `Enterprise Universe - Seed Round Update

Sehr geehrte Damen und Herren,

ich freue mich, Ihnen ein bedeutendes Update zu Enterprise Universe zu geben.

AKTUELLE KENNZAHLEN:
• €3+ Mrd. Won Pipeline
• €847K Revenue 2024
• €411 Mrd. Gewichtete Pipeline
• 12:1 LTV:CAC Ratio

MEILENSTEIN: Unsere vertraglich gesicherte Deal-Pipeline hat die €3 Milliarden-Marke überschritten.

WAS UNS EINZIGARTIG MACHT:
• Kuratiertes Ökosystem – Top 5% der Software-Anbieter
• End-to-End Service – Von Auswahl bis Go-Live
• 50% schneller & günstiger als traditionelle Beratung
• 12 Enterprise-Kunden in 12 Monaten gewonnen

INVESTMENT-GELEGENHEIT:
• Ziel: €1,5M Seed Round
• Pre-Money: €15M
• Verwendung: DACH-Expansion & Tech-Team

Für Pitch Deck: invest@enterprise-universe.one

Mit besten Grüßen,
Ömer Hüseyin Coskun
Founder & CEO
Enterprise Universe GmbH

📧 invest@enterprise-universe.one
📞 +49 177 4547727
🌐 enterprise-universe.one
`
};

// Load investor emails from CSV
function loadInvestorEmails() {
    const csvPath = path.join(__dirname, 'Data Room/04_Outreach/INVESTOR_DATABASE.csv');
    const csv = fs.readFileSync(csvPath, 'utf-8');
    const lines = csv.split('\n').slice(1); // Skip header

    const investors = [];
    for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(',');
        const email = parts[2]?.trim();
        const vcName = parts[0]?.trim();
        const contact = parts[1]?.trim();

        if (email && email.includes('@')) {
            investors.push({ email, vcName, contact });
        }
    }
    return investors;
}

// Send email
async function sendEmail(to, subject, html, text) {
    try {
        const info = await transporter.sendMail({
            from: 'Enterprise Universe <invoice@enterprise-universe.com>',
            replyTo: 'info@enterprise-universe.one',
            to,
            subject,
            html,
            text
        });
        console.log(`✓ Sent to: ${to} (${info.messageId})`);
        return { success: true, email: to, messageId: info.messageId };
    } catch (error) {
        console.error(`✗ Failed: ${to} - ${error.message}`);
        return { success: false, email: to, error: error.message };
    }
}

// Main function
async function main() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     ENTERPRISE UNIVERSE - INVESTOR MASS MAILER                ║');
    console.log('║     €3 Mrd Pipeline Announcement                              ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const investors = loadInvestorEmails();
    console.log(`📧 Found ${investors.length} investor emails\n`);

    // Show preview
    console.log('Preview of first 5 recipients:');
    investors.slice(0, 5).forEach(inv => {
        console.log(`  • ${inv.vcName}: ${inv.email}`);
    });
    console.log('');

    // Confirm
    const args = process.argv.slice(2);
    if (!args.includes('--send')) {
        console.log('⚠️  DRY RUN MODE');
        console.log('To actually send emails, run with --send flag:');
        console.log('  node investor-mailer.js --send\n');
        return;
    }

    console.log('🚀 SENDING EMAILS...\n');

    const results = [];
    for (let i = 0; i < investors.length; i++) {
        const inv = investors[i];
        console.log(`[${i + 1}/${investors.length}] Sending to ${inv.vcName}...`);

        const result = await sendEmail(
            inv.email,
            EMAIL_TEMPLATE.subject,
            EMAIL_TEMPLATE.html,
            EMAIL_TEMPLATE.text
        );
        results.push(result);

        // Rate limiting - wait 2 seconds between emails
        if (i < investors.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // Summary
    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`📊 SUMMARY: ${sent} sent, ${failed} failed, ${investors.length} total`);
    console.log('═══════════════════════════════════════════════════════════════');

    if (failed > 0) {
        console.log('\nFailed emails:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`  ✗ ${r.email}: ${r.error}`);
        });
    }

    // Save log
    const logPath = path.join(__dirname, 'Data Room/04_Outreach/emails_sent', `send_log_${Date.now()}.json`);
    fs.writeFileSync(logPath, JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
    console.log(`\n📁 Log saved to: ${logPath}`);
}

main().catch(console.error);
