/**
 * Scan IMAP for investor-related bounces
 */
const Imap = require('imap');
const { simpleParser } = require('mailparser');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const IMAP_CONFIG = {
    user: process.env.SMTP_USER || 'invoice@enterprise-universe.com',
    password: process.env.SMTP_PASS,
    host: 'imap.one.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
};

// Investor domains to look for
const INVESTOR_DOMAINS = [
    'htgf.de', 'uvcpartners.com', 'pointnine.com', 'nrwbank.de', 'lbbw.de',
    'paua.vc', 'fly.vc', 'project-a.com', 'motu.vc', 'saasgarage.vc',
    'cherry.vc', 'earlybird.com', 'hvcapital.com', 'siemens.com', 'bosch.com',
    'sap.com', 'bmwiventures.com', 'tgfs.de', 'bayernkapital.de', '415capital.com',
    'ab-alpha.de', 'accel.com', 'acorda.de', 'alstin.capital', 'calmstorm.vc',
    'femventix.com', 'norrsken.org', 'business-angels.de', 'bacb.de', 'inwi.vc',
    'business-angels-aachen.de', 'venture-stars.com', 'germanaccelerator.com',
    'pnptc.com', 'spinlab.co', 'hubraum.com', 'main-incubator.com',
    'axelspringerplugandplay.com', 'techfounders.com', 'unternehmertum.de',
    'atlantic-labs.de', 'creathor.vc', 'eqtpartners.com', 'lakestar.com',
    'visionaries.club', 'target-global.com', 'senovo.vc'
];

function connectImap() {
    return new Promise((resolve, reject) => {
        const imap = new Imap(IMAP_CONFIG);
        imap.once('ready', () => resolve(imap));
        imap.once('error', reject);
        imap.connect();
    });
}

function openInbox(imap) {
    return new Promise((resolve, reject) => {
        imap.openBox('INBOX', true, (err, box) => {
            if (err) reject(err);
            else resolve(box);
        });
    });
}

function searchEmails(imap, criteria) {
    return new Promise((resolve, reject) => {
        imap.search(criteria, (err, results) => {
            if (err) reject(err);
            else resolve(results || []);
        });
    });
}

function fetchEmail(imap, uid) {
    return new Promise((resolve, reject) => {
        const fetch = imap.fetch(uid, { bodies: '' });
        fetch.on('message', (msg) => {
            let buffer = '';
            msg.on('body', (stream) => {
                stream.on('data', (chunk) => buffer += chunk.toString('utf8'));
            });
            msg.once('end', async () => {
                try {
                    resolve(await simpleParser(buffer));
                } catch (e) { reject(e); }
            });
        });
        fetch.once('error', reject);
    });
}

function extractBouncedEmail(text) {
    // Look for investor domain emails in bounce message
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    const matches = text.match(emailRegex) || [];

    for (const email of matches) {
        const domain = email.split('@')[1]?.toLowerCase();
        if (INVESTOR_DOMAINS.some(d => domain?.includes(d))) {
            return email.toLowerCase();
        }
    }
    return null;
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  SCANNING IMAP FOR INVESTOR BOUNCES');
    console.log('═══════════════════════════════════════════════════════════\n');

    const imap = await connectImap();
    console.log('✓ Connected to IMAP\n');

    await openInbox(imap);

    // Search for bounce/undeliverable emails from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const criteria = [
        ['SINCE', today],
        ['OR',
            ['FROM', 'postmaster'],
            ['OR',
                ['FROM', 'mailer-daemon'],
                ['OR',
                    ['SUBJECT', 'Undelivered'],
                    ['OR',
                        ['SUBJECT', 'Undeliverable'],
                        ['OR',
                            ['SUBJECT', 'Delivery'],
                            ['SUBJECT', 'failure']
                        ]
                    ]
                ]
            ]
        ]
    ];

    const uids = await searchEmails(imap, criteria);
    console.log(`Found ${uids.length} bounce emails from today\n`);

    const investorBounces = [];

    for (const uid of uids.slice(0, 100)) { // Check up to 100
        try {
            const parsed = await fetchEmail(imap, uid);
            const text = (parsed.text || '') + ' ' + (parsed.html || '') + ' ' + (parsed.subject || '');
            const bouncedEmail = extractBouncedEmail(text);

            if (bouncedEmail) {
                const bounceInfo = {
                    email: bouncedEmail,
                    subject: parsed.subject,
                    from: parsed.from?.text,
                    date: parsed.date
                };

                // Check if already added
                if (!investorBounces.find(b => b.email === bouncedEmail)) {
                    investorBounces.push(bounceInfo);
                    console.log(`❌ BOUNCE: ${bouncedEmail}`);
                    console.log(`   Subject: ${parsed.subject?.slice(0, 60)}`);
                    console.log('');
                }
            }
        } catch (e) {
            // Skip errors
        }
    }

    imap.end();

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  FOUND ${investorBounces.length} INVESTOR BOUNCES`);
    console.log('═══════════════════════════════════════════════════════════\n');

    if (investorBounces.length > 0) {
        console.log('Bounced investor emails:');
        investorBounces.forEach(b => console.log(`  - ${b.email}`));
    } else {
        console.log('✓ No investor bounces found - all emails delivered successfully!');
    }

    return investorBounces;
}

main().catch(console.error);
