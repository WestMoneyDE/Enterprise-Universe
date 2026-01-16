/**
 * INVESTOR MAILER - RETRY FAILED
 * Sendet nur an die 23 fehlgeschlagenen Adressen
 */

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'send.one.com',
    port: 587,
    secure: false,
    auth: {
        user: 'invoice@enterprise-universe.com',
        pass: 'Einfach0!663724'
    }
});

// Failed emails from previous run
const FAILED_EMAILS = [
    { email: 'hello@calmstorm.vc', name: 'Calm/Storm Ventures' },
    { email: 'info@femventix.com', name: 'Femventix' },
    { email: 'b4i@bosch.com', name: 'B4i (Bosch for Innovation)' },
    { email: 'hello@norrsken.org', name: 'Norrsken' },
    { email: 'info@business-angels.de', name: 'Business Angels Deutschland (BAND)' },
    { email: 'info@bacb.de', name: 'Business Angel Club Berlin Brandenburg' },
    { email: 'info@inwi.vc', name: 'InvestorenNetzwerk Wiesbaden' },
    { email: 'info@business-angels-aachen.de', name: 'Business Angels Aachen' },
    { email: 'hello@venture-stars.com', name: 'Venture Stars' },
    { email: 'info@germanaccelerator.com', name: 'German Accelerator' },
    { email: 'info@pnptc.com', name: 'Plug and Play Tech Center' },
    { email: 'info@spinlab.co', name: 'SpinLab' },
    { email: 'info@hubraum.com', name: 'Hub:raum (Deutsche Telekom)' },
    { email: 'info@main-incubator.com', name: 'Main Incubator (Commerzbank)' },
    { email: 'info@axelspringerplugandplay.com', name: 'Axel Springer Plug and Play' },
    { email: 'info@techfounders.com', name: 'TechFounders' },
    { email: 'info@unternehmertum.de', name: 'UnternehmerTUM' },
    { email: 'hello@atlantic-labs.de', name: 'Atlantic Labs' },
    { email: 'info@creathor.vc', name: 'Creathor Ventures' },
    { email: 'ventures@eqtpartners.com', name: 'EQT Ventures' },
    { email: 'info@lakestar.com', name: 'Lakestar' },
    { email: 'info@visionaries.club', name: 'Visionaries Club' },
    { email: 'info@target-global.com', name: 'Target Global' }
];

const EMAIL_TEMPLATE = {
    subject: '🚀 Enterprise Universe: €3+ Mrd. Pipeline – Seed Round Update',
    html: `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.8; color: #1a1a2e; max-width: 650px; margin: 0 auto; padding: 20px; background: #f8fafc; }
        .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); color: white; padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
        .header .tagline { margin-top: 10px; font-size: 16px; opacity: 0.9; }
        .content { background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .metric-box { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #6366f1; padding: 25px; margin: 25px 0; border-radius: 0 12px 12px 0; }
        .metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .metric { text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .metric-value { font-size: 24px; font-weight: 700; color: #6366f1; }
        .metric-label { font-size: 12px; color: #64748b; margin-top: 5px; }
        .highlight { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 0 12px 12px 0; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { text-align: center; padding: 30px; color: #64748b; font-size: 13px; }
        .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
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
                <div class="metric"><div class="metric-value">€3+ Mrd.</div><div class="metric-label">Won Pipeline</div></div>
                <div class="metric"><div class="metric-value">€847K</div><div class="metric-label">Revenue 2024</div></div>
                <div class="metric"><div class="metric-value">€411 Mrd.</div><div class="metric-label">Gewichtete Pipeline</div></div>
                <div class="metric"><div class="metric-value">12:1</div><div class="metric-label">LTV:CAC Ratio</div></div>
            </div>
        </div>
        <div class="highlight">
            <strong>🎯 Meilenstein erreicht:</strong> Unsere vertraglich gesicherte Deal-Pipeline hat die <strong>€3 Milliarden-Marke</strong> überschritten.
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
            <a href="mailto:invest@enterprise-universe.one?subject=Interesse%20an%20Seed%20Round" class="cta-button">→ Pitch Deck anfordern</a>
        </p>
        <p>Ich würde mich freuen, Ihnen in einem <strong>20-minütigen Call</strong> unsere Vision und Zahlen zu präsentieren.</p>
        <div class="signature">
            <p>Mit besten Grüßen,</p>
            <p><strong>Ömer Hüseyin Coskun</strong><br>Founder & CEO<br>Enterprise Universe GmbH</p>
            <p style="color: #6366f1;">📧 invest@enterprise-universe.one<br>📞 +49 177 4547727<br>🌐 enterprise-universe.one</p>
        </div>
    </div>
    <div class="footer">
        <p>Enterprise Universe GmbH | Leienbergstr. 1, 53783 Eitorf</p>
    </div>
</body>
</html>`,
    text: `Enterprise Universe - Seed Round Update\n\n€3+ Mrd. Won Pipeline | €847K Revenue | €15M Pre-Money\n\nKontakt: invest@enterprise-universe.one`
};

async function sendEmail(to, subject, html, text) {
    try {
        const info = await transporter.sendMail({
            from: 'Enterprise Universe <invoice@enterprise-universe.com>',
            replyTo: 'info@enterprise-universe.one',
            to, subject, html, text
        });
        console.log(`✓ Sent to: ${to}`);
        return { success: true, email: to };
    } catch (error) {
        console.error(`✗ Failed: ${to} - ${error.message}`);
        return { success: false, email: to, error: error.message };
    }
}

async function main() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     RETRY: 23 fehlgeschlagene Investor-Emails                 ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const results = [];
    for (let i = 0; i < FAILED_EMAILS.length; i++) {
        const inv = FAILED_EMAILS[i];
        console.log(`[${i + 1}/${FAILED_EMAILS.length}] ${inv.name}...`);

        const result = await sendEmail(inv.email, EMAIL_TEMPLATE.subject, EMAIL_TEMPLATE.html, EMAIL_TEMPLATE.text);
        results.push(result);

        // Longer delay: 5 seconds between emails
        if (i < FAILED_EMAILS.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`\n📊 ERGEBNIS: ${sent} gesendet, ${failed} fehlgeschlagen`);
}

main().catch(console.error);
