/**
 * INVESTOR MAILER - FINAL 14
 */
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'send.one.com', port: 587, secure: false,
    auth: { user: 'invoice@enterprise-universe.com', pass: 'Einfach0!663724' }
});

const FINAL_EMAILS = [
    'info@germanaccelerator.com', 'info@pnptc.com', 'info@spinlab.co',
    'info@hubraum.com', 'info@main-incubator.com', 'info@axelspringerplugandplay.com',
    'info@techfounders.com', 'info@unternehmertum.de', 'hello@atlantic-labs.de',
    'info@creathor.vc', 'ventures@eqtpartners.com', 'info@lakestar.com',
    'info@visionaries.club', 'info@target-global.com'
];

const EMAIL = {
    subject: '🚀 Enterprise Universe: €3+ Mrd. Pipeline – Seed Round Update',
    html: `<!DOCTYPE html><html><head><style>body{font-family:Arial;max-width:650px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:40px;border-radius:16px 16px 0 0;text-align:center}.content{background:white;padding:40px;border-radius:0 0 16px 16px}.metric{background:#f0f9ff;padding:20px;margin:20px 0;border-left:4px solid #6366f1}</style></head><body><div class="header"><h1>Enterprise Universe</h1><p>Seed Round Update | Januar 2026</p></div><div class="content"><p>Sehr geehrte Damen und Herren,</p><div class="metric"><strong>📊 Kennzahlen:</strong><br>• €3+ Mrd. Won Pipeline<br>• €847K Revenue 2024<br>• €411 Mrd. Gewichtete Pipeline<br>• 12:1 LTV:CAC</div><p><strong>🎯 Meilenstein:</strong> €3 Milliarden Deal-Pipeline erreicht!</p><p><strong>💰 Seed Round:</strong> €1,5M @ €15M Pre-Money</p><p>Für Pitch Deck: <a href="mailto:invest@enterprise-universe.one">invest@enterprise-universe.one</a></p><p>Mit besten Grüßen,<br><strong>Ömer Hüseyin Coskun</strong><br>Founder & CEO<br>📞 +49 177 4547727</p></div></body></html>`,
    text: 'Enterprise Universe Seed Round: €3+ Mrd Pipeline, €1,5M @ €15M. Kontakt: invest@enterprise-universe.one'
};

async function main() {
    console.log('FINAL: 14 Emails senden (10s Delay)...\n');
    let sent = 0;
    for (let i = 0; i < FINAL_EMAILS.length; i++) {
        const email = FINAL_EMAILS[i];
        try {
            await transporter.sendMail({
                from: 'Enterprise Universe <invoice@enterprise-universe.com>',
                replyTo: 'info@enterprise-universe.one',
                to: email, subject: EMAIL.subject, html: EMAIL.html, text: EMAIL.text
            });
            console.log(`✓ [${i+1}/14] ${email}`);
            sent++;
        } catch (e) {
            console.log(`✗ [${i+1}/14] ${email}: ${e.message.slice(0,50)}`);
        }
        if (i < FINAL_EMAILS.length - 1) await new Promise(r => setTimeout(r, 10000));
    }
    console.log(`\n📊 FINAL: ${sent}/14 gesendet`);
}
main();
