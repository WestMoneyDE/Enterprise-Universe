/**
 * INVESTOR MAILER - REMAINING 24
 * Sends to investors that were rate-limited in previous batch
 * With 20s delay between emails to avoid rate limiting
 */
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const transporter = nodemailer.createTransport({
    host: 'send.one.com',
    port: 587,
    secure: false,
    auth: {
        user: 'invoice@enterprise-universe.com',
        pass: 'Einfach0!663724'
    }
});

// Remaining 24 investors that were rate-limited
const REMAINING_EMAILS = [
    { email: 'hello@calmstorm.vc', name: 'Calm/Storm Ventures' },
    { email: 'info@femventix.com', name: 'Femventix' },
    { email: 'b4i@bosch.com', name: 'B4i (Bosch)' },
    { email: 'hello@norrsken.org', name: 'Norrsken' },
    { email: 'info@business-angels.de', name: 'Business Angels Deutschland' },
    { email: 'info@bacb.de', name: 'BACB Berlin' },
    { email: 'info@inwi.vc', name: 'INWI Wiesbaden' },
    { email: 'info@business-angels-aachen.de', name: 'BA Aachen' },
    { email: 'hello@venture-stars.com', name: 'Venture Stars' },
    { email: 'info@germanaccelerator.com', name: 'German Accelerator' },
    { email: 'info@pnptc.com', name: 'Plug and Play' },
    { email: 'info@spinlab.co', name: 'SpinLab' },
    { email: 'info@hubraum.com', name: 'Hub:raum (Telekom)' },
    { email: 'info@main-incubator.com', name: 'Main Incubator' },
    { email: 'info@axelspringerplugandplay.com', name: 'Axel Springer P&P' },
    { email: 'info@techfounders.com', name: 'TechFounders' },
    { email: 'info@unternehmertum.de', name: 'UnternehmerTUM' },
    { email: 'hello@atlantic-labs.de', name: 'Atlantic Labs' },
    { email: 'info@creathor.vc', name: 'Creathor Ventures' },
    { email: 'ventures@eqtpartners.com', name: 'EQT Ventures' },
    { email: 'info@lakestar.com', name: 'Lakestar' },
    { email: 'info@visionaries.club', name: 'Visionaries Club' },
    { email: 'info@target-global.com', name: 'Target Global' },
    { email: 'info@senovo.vc', name: 'Senovo' }
];

const EMAIL_TEMPLATE = {
    subject: '🚀 Enterprise Universe: €3+ Mrd. Pipeline – Seed Round Update',
    html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #1a365d, #2563eb); color: white; padding: 40px; border-radius: 16px 16px 0 0; text-align: center; }
        .content { background: white; padding: 40px; border-radius: 0 0 16px 16px; }
        .metric { background: #f0f9ff; padding: 20px; margin: 20px 0; border-left: 4px solid #2563eb; border-radius: 0 8px 8px 0; }
        .cta { background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="margin:0;">Enterprise Universe</h1>
        <p style="margin:10px 0 0 0; opacity:0.9;">Seed Round Update | Januar 2026</p>
    </div>
    <div class="content">
        <p>Sehr geehrte Damen und Herren,</p>

        <p>Enterprise Universe hat einen wichtigen Meilenstein erreicht: Unsere <strong>gewichtete Deal-Pipeline übersteigt €3 Milliarden</strong>.</p>

        <div class="metric">
            <strong>📊 Aktuelle Kennzahlen:</strong><br><br>
            • <strong>€3+ Mrd.</strong> Won Deal Pipeline<br>
            • <strong>€847K</strong> Revenue 2024<br>
            • <strong>€411 Mrd.</strong> Gewichtete Pipeline (alle Stages)<br>
            • <strong>12:1</strong> LTV:CAC Ratio<br>
            • <strong>3.029</strong> Closedwon Deals
        </div>

        <p><strong>🎯 Unser Ansatz:</strong> KI-gestützte Automatisierung für B2B Enterprise Sales im DACH-Raum. Wir digitalisieren den gesamten Sales-Prozess von Lead Generation bis Invoice.</p>

        <div class="metric">
            <strong>💰 Seed Round:</strong><br><br>
            • Raising: <strong>€1,5M</strong><br>
            • Pre-Money: <strong>€15M</strong><br>
            • Use of Funds: Team, Tech Infrastructure, Market Expansion
        </div>

        <p>Für unser Pitch Deck und weitere Informationen erreichen Sie uns unter:</p>

        <p style="text-align:center;">
            <a href="mailto:invest@enterprise-universe.one" class="cta">📧 Pitch Deck anfordern</a>
        </p>

        <p>Mit besten Grüßen,</p>
        <p>
            <strong>Ömer Hüseyin Coskun</strong><br>
            Founder & CEO<br>
            📞 +49 177 4547727<br>
            📧 oemer@enterprise-universe.one
        </p>
    </div>
    <div class="footer">
        Enterprise Universe GmbH i.G. | Berlin<br>
        <a href="https://enterprise-universe.one">enterprise-universe.one</a>
    </div>
</body>
</html>`,
    text: `Enterprise Universe - Seed Round Update

Sehr geehrte Damen und Herren,

Enterprise Universe hat einen wichtigen Meilenstein erreicht: Unsere gewichtete Deal-Pipeline übersteigt €3 Milliarden.

KENNZAHLEN:
• €3+ Mrd. Won Deal Pipeline
• €847K Revenue 2024
• €411 Mrd. Gewichtete Pipeline
• 12:1 LTV:CAC
• 3.029 Closedwon Deals

SEED ROUND:
• Raising: €1,5M
• Pre-Money: €15M

Für Pitch Deck: invest@enterprise-universe.one

Mit besten Grüßen,
Ömer Hüseyin Coskun
Founder & CEO
+49 177 4547727`
};

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  INVESTOR MAILER - REMAINING 24');
    console.log('  20 Sekunden Delay zwischen E-Mails');
    console.log('═══════════════════════════════════════════════════════════\n');

    const results = [];
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < REMAINING_EMAILS.length; i++) {
        const investor = REMAINING_EMAILS[i];
        const progress = `[${i + 1}/${REMAINING_EMAILS.length}]`;

        try {
            const result = await transporter.sendMail({
                from: '"Enterprise Universe" <invoice@enterprise-universe.com>',
                replyTo: 'invest@enterprise-universe.one',
                to: investor.email,
                subject: EMAIL_TEMPLATE.subject,
                html: EMAIL_TEMPLATE.html,
                text: EMAIL_TEMPLATE.text
            });

            console.log(`✅ ${progress} ${investor.name}: ${investor.email}`);
            results.push({ success: true, email: investor.email, name: investor.name, messageId: result.messageId });
            sent++;

        } catch (error) {
            console.log(`❌ ${progress} ${investor.name}: ${error.message.slice(0, 60)}`);
            results.push({ success: false, email: investor.email, name: investor.name, error: error.message });
            failed++;
        }

        // Wait 20 seconds between emails to avoid rate limiting
        if (i < REMAINING_EMAILS.length - 1) {
            process.stdout.write(`   ⏳ Warte 20s...`);
            await sleep(20000);
            process.stdout.write(` OK\n`);
        }
    }

    // Save log
    const logFile = path.join(__dirname, 'Data Room/04_Outreach/emails_sent', `send_log_remaining_${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`  ERGEBNIS: ${sent} gesendet, ${failed} fehlgeschlagen`);
    console.log(`  Log: ${logFile}`);
    console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
