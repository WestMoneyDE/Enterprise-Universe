#!/usr/bin/env node
/**
 * Batch Process All Won Deals
 * Generates: Customer Cards, Invoices, Email Queue
 * For 3,029 ClosedWon deals from HubSpot
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');

// Directories
const DATA_DIR = path.join(__dirname, '..', 'Data Room', '05_Won_Deals');
const CARDS_DIR = path.join(DATA_DIR, 'Kundenkarten');
const INVOICES_DIR = path.join(DATA_DIR, 'Rechnungen');
const EMAIL_QUEUE_DIR = path.join(DATA_DIR, 'Email_Queue');

// Ensure directories exist
[CARDS_DIR, INVOICES_DIR, EMAIL_QUEUE_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Parse description field to extract customer data
function parseDescription(description) {
    if (!description) return {};

    const data = {};
    const lines = description.split('\n');

    for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1) {
            const key = line.substring(0, colonIndex).trim().toLowerCase();
            const value = line.substring(colonIndex + 1).trim();

            switch (key) {
                case 'region': data.region = value; break;
                case 'land': data.country = value; break;
                case 'stadt': data.city = value; break;
                case 'branche': data.industry = value; break;
                case 'kontakt': data.contact = value; break;
                case 'e-mail': data.email = value; break;
                case 'telefon': data.phone = value; break;
                case 'währung': data.currency = value; break;
            }
        }
    }

    return data;
}

// Generate invoice number
function generateInvoiceNumber(dealId, index) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    return `EU-${year}${month}-${String(index + 1).padStart(5, '0')}`;
}

// Calculate project phases based on amount
function calculateProjectPhases(amount) {
    if (amount >= 1000000) {
        return {
            class: 'S-Class Enterprise',
            phases: [
                { name: 'Discovery & Analysis', duration: '4 Wochen', percentage: 15 },
                { name: 'Architecture Design', duration: '6 Wochen', percentage: 20 },
                { name: 'Implementation Phase 1', duration: '12 Wochen', percentage: 25 },
                { name: 'Implementation Phase 2', duration: '12 Wochen', percentage: 25 },
                { name: 'Testing & QA', duration: '4 Wochen', percentage: 10 },
                { name: 'Go-Live & Support', duration: '2 Wochen', percentage: 5 }
            ],
            paymentTerms: '30% Anzahlung, 40% bei Meilenstein, 30% bei Abnahme'
        };
    } else if (amount >= 500000) {
        return {
            class: 'A-Class Premium',
            phases: [
                { name: 'Discovery & Planning', duration: '3 Wochen', percentage: 20 },
                { name: 'Development', duration: '8 Wochen', percentage: 40 },
                { name: 'Integration', duration: '4 Wochen', percentage: 25 },
                { name: 'Go-Live', duration: '2 Wochen', percentage: 15 }
            ],
            paymentTerms: '40% Anzahlung, 30% bei Meilenstein, 30% bei Abnahme'
        };
    } else if (amount >= 100000) {
        return {
            class: 'B-Class Standard',
            phases: [
                { name: 'Setup & Configuration', duration: '2 Wochen', percentage: 25 },
                { name: 'Implementation', duration: '6 Wochen', percentage: 50 },
                { name: 'Testing & Launch', duration: '2 Wochen', percentage: 25 }
            ],
            paymentTerms: '50% Anzahlung, 50% bei Abnahme'
        };
    } else {
        return {
            class: 'C-Class Basic',
            phases: [
                { name: 'Setup', duration: '1 Woche', percentage: 30 },
                { name: 'Delivery', duration: '2 Wochen', percentage: 70 }
            ],
            paymentTerms: '100% bei Auftragserteilung'
        };
    }
}

// Generate Customer Card (Kundenkarte)
function generateCustomerCard(deal, index, customerData, projectInfo) {
    const card = {
        meta: {
            generatedAt: new Date().toISOString(),
            dealId: deal.id,
            cardNumber: `KK-${deal.id}`
        },
        customer: {
            company: deal.name.replace(/^S-Class:\s*|^A-Class:\s*|^B-Class:\s*|^C-Class:\s*/, '').split('#')[0].trim(),
            contact: customerData.contact || 'N/A',
            email: customerData.email || 'N/A',
            phone: customerData.phone || 'N/A',
            address: {
                city: customerData.city || 'N/A',
                country: customerData.country || 'N/A',
                region: customerData.region || 'N/A'
            },
            industry: customerData.industry || 'N/A'
        },
        deal: {
            name: deal.name,
            amount: deal.amount,
            currency: customerData.currency || 'EUR',
            closeDate: deal.closeDate,
            pipeline: deal.pipeline
        },
        project: {
            class: projectInfo.class,
            phases: projectInfo.phases,
            paymentTerms: projectInfo.paymentTerms,
            estimatedStart: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            deliverables: getDeliverables(projectInfo.class)
        },
        status: {
            cardCreated: true,
            invoiceGenerated: false,
            emailSent: false
        }
    };

    return card;
}

function getDeliverables(projectClass) {
    const base = [
        'Enterprise Universe Platform Access',
        'Technical Documentation',
        'Training Sessions',
        'Support Package'
    ];

    if (projectClass.includes('S-Class')) {
        return [...base, 'Dedicated Project Manager', 'Custom Development', '24/7 Premium Support', 'Quarterly Business Reviews'];
    } else if (projectClass.includes('A-Class')) {
        return [...base, 'Priority Support', 'Custom Integrations', 'Monthly Reviews'];
    } else if (projectClass.includes('B-Class')) {
        return [...base, 'Standard Support', 'Basic Integrations'];
    }
    return base;
}

// Generate Invoice
function generateInvoice(deal, index, customerData, projectInfo) {
    const invoiceNumber = generateInvoiceNumber(deal.id, index);
    const issueDate = new Date();
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const invoice = {
        invoiceNumber,
        issueDate: issueDate.toISOString(),
        dueDate: dueDate.toISOString(),
        status: 'DRAFT',

        seller: {
            company: 'Enterprise Universe GmbH',
            address: 'Musterstraße 1, 10115 Berlin',
            taxId: 'DE123456789',
            bankDetails: {
                bank: 'Deutsche Bank',
                iban: 'DE89 3704 0044 0532 0130 00',
                bic: 'COBADEFFXXX'
            }
        },

        buyer: {
            company: deal.name.replace(/^S-Class:\s*|^A-Class:\s*|^B-Class:\s*|^C-Class:\s*/, '').split('#')[0].trim(),
            contact: customerData.contact || 'N/A',
            email: customerData.email || 'N/A',
            address: `${customerData.city || ''}, ${customerData.country || ''}`
        },

        items: projectInfo.phases.map((phase, i) => ({
            position: i + 1,
            description: `${projectInfo.class} - ${phase.name}`,
            duration: phase.duration,
            amount: Math.round(deal.amount * phase.percentage / 100)
        })),

        totals: {
            subtotal: deal.amount,
            vatRate: 19,
            vatAmount: Math.round(deal.amount * 0.19),
            total: Math.round(deal.amount * 1.19)
        },

        paymentTerms: projectInfo.paymentTerms,
        notes: `Deal ID: ${deal.id}\nProjektklasse: ${projectInfo.class}`
    };

    return invoice;
}

// Generate Email Template
function generateEmailTemplate(deal, customerData, projectInfo, invoiceNumber) {
    const companyName = deal.name.replace(/^S-Class:\s*|^A-Class:\s*|^B-Class:\s*|^C-Class:\s*/, '').split('#')[0].trim();

    return {
        to: customerData.email,
        subject: `Enterprise Universe - Projektstart ${companyName}`,
        template: 'project_kickoff',
        data: {
            contactName: customerData.contact || 'Sehr geehrte Damen und Herren',
            companyName,
            projectClass: projectInfo.class,
            dealAmount: deal.amount,
            invoiceNumber,
            phases: projectInfo.phases,
            paymentTerms: projectInfo.paymentTerms
        },
        status: 'QUEUED',
        queuedAt: new Date().toISOString()
    };
}

// Main processing function
async function processAllDeals() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     BATCH PROCESSING: 3,029 WON DEALS                         ║');
    console.log('║     Kundenkarten | Rechnungen | Email Queue                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    // Load export data
    const exportFiles = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('won_deals_export_') && f.endsWith('.json'));
    if (exportFiles.length === 0) {
        console.error('ERROR: No export file found. Run export-won-deals.js first.');
        process.exit(1);
    }

    const exportFile = path.join(DATA_DIR, exportFiles[exportFiles.length - 1]);
    console.log(`Loading: ${exportFile}\n`);

    const exportData = JSON.parse(fs.readFileSync(exportFile, 'utf-8'));
    const deals = exportData.deals;

    console.log(`Total Deals to process: ${deals.length}\n`);

    // Statistics
    const stats = {
        total: deals.length,
        processed: 0,
        cards: 0,
        invoices: 0,
        emails: 0,
        errors: [],
        byClass: {
            'S-Class': 0,
            'A-Class': 0,
            'B-Class': 0,
            'C-Class': 0
        },
        totalValue: 0,
        totalInvoiceValue: 0
    };

    // Process each deal
    const allCards = [];
    const allInvoices = [];
    const emailQueue = [];

    console.log('Processing deals...\n');

    for (let i = 0; i < deals.length; i++) {
        const deal = deals[i];

        try {
            // Parse customer data from description
            const customerData = parseDescription(deal.description);

            // Calculate project info
            const projectInfo = calculateProjectPhases(deal.amount);

            // Update class statistics
            if (projectInfo.class.includes('S-Class')) stats.byClass['S-Class']++;
            else if (projectInfo.class.includes('A-Class')) stats.byClass['A-Class']++;
            else if (projectInfo.class.includes('B-Class')) stats.byClass['B-Class']++;
            else stats.byClass['C-Class']++;

            // Generate Customer Card
            const card = generateCustomerCard(deal, i, customerData, projectInfo);
            allCards.push(card);
            stats.cards++;

            // Generate Invoice
            const invoice = generateInvoice(deal, i, customerData, projectInfo);
            allInvoices.push(invoice);
            stats.invoices++;
            stats.totalInvoiceValue += invoice.totals.total;

            // Generate Email Template
            if (customerData.email && customerData.email !== 'N/A') {
                const email = generateEmailTemplate(deal, customerData, projectInfo, invoice.invoiceNumber);
                emailQueue.push(email);
                stats.emails++;
            }

            stats.totalValue += deal.amount;
            stats.processed++;

            // Progress indicator
            if ((i + 1) % 500 === 0 || i === deals.length - 1) {
                const pct = Math.round((i + 1) / deals.length * 100);
                console.log(`  Progress: ${i + 1}/${deals.length} (${pct}%) - Cards: ${stats.cards}, Invoices: ${stats.invoices}, Emails: ${stats.emails}`);
            }

        } catch (err) {
            stats.errors.push({ dealId: deal.id, error: err.message });
        }
    }

    // Save all customer cards
    const cardsFile = path.join(CARDS_DIR, `all_kundenkarten_${Date.now()}.json`);
    fs.writeFileSync(cardsFile, JSON.stringify({
        generatedAt: new Date().toISOString(),
        totalCards: allCards.length,
        cards: allCards
    }, null, 2));

    // Save all invoices
    const invoicesFile = path.join(INVOICES_DIR, `all_rechnungen_${Date.now()}.json`);
    fs.writeFileSync(invoicesFile, JSON.stringify({
        generatedAt: new Date().toISOString(),
        totalInvoices: allInvoices.length,
        totalValue: stats.totalInvoiceValue,
        invoices: allInvoices
    }, null, 2));

    // Save email queue
    const emailFile = path.join(EMAIL_QUEUE_DIR, `email_queue_${Date.now()}.json`);
    fs.writeFileSync(emailFile, JSON.stringify({
        generatedAt: new Date().toISOString(),
        totalEmails: emailQueue.length,
        emails: emailQueue
    }, null, 2));

    // Generate summary CSV for invoices
    const csvPath = path.join(INVOICES_DIR, `rechnungen_summary_${Date.now()}.csv`);
    const csvHeader = 'InvoiceNumber,Company,Contact,Email,Amount,VAT,Total,DueDate,Status\n';
    const csvRows = allInvoices.map(inv =>
        `"${inv.invoiceNumber}","${inv.buyer.company}","${inv.buyer.contact}","${inv.buyer.email}",${inv.totals.subtotal},${inv.totals.vatAmount},${inv.totals.total},"${inv.dueDate}","${inv.status}"`
    ).join('\n');
    fs.writeFileSync(csvPath, csvHeader + csvRows);

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                    PROCESSING COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('STATISTICS:');
    console.log(`  Total Deals Processed: ${stats.processed}`);
    console.log(`  Customer Cards Created: ${stats.cards}`);
    console.log(`  Invoices Generated: ${stats.invoices}`);
    console.log(`  Emails Queued: ${stats.emails}`);
    console.log(`  Errors: ${stats.errors.length}`);

    console.log('\nBY PROJECT CLASS:');
    console.log(`  S-Class Enterprise (1M+): ${stats.byClass['S-Class']} deals`);
    console.log(`  A-Class Premium (500K-1M): ${stats.byClass['A-Class']} deals`);
    console.log(`  B-Class Standard (100K-500K): ${stats.byClass['B-Class']} deals`);
    console.log(`  C-Class Basic (<100K): ${stats.byClass['C-Class']} deals`);

    console.log('\nFINANCIAL SUMMARY:');
    console.log(`  Total Deal Value: EUR ${stats.totalValue.toLocaleString('de-DE')}`);
    console.log(`  Total Invoice Value (incl. VAT): EUR ${stats.totalInvoiceValue.toLocaleString('de-DE')}`);

    console.log('\nFILES CREATED:');
    console.log(`  Kundenkarten: ${cardsFile}`);
    console.log(`  Rechnungen: ${invoicesFile}`);
    console.log(`  CSV Summary: ${csvPath}`);
    console.log(`  Email Queue: ${emailFile}`);

    if (stats.errors.length > 0) {
        console.log('\nERRORS:');
        stats.errors.slice(0, 10).forEach(e => console.log(`  Deal ${e.dealId}: ${e.error}`));
        if (stats.errors.length > 10) {
            console.log(`  ... and ${stats.errors.length - 10} more errors`);
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');

    return stats;
}

processAllDeals().catch(console.error);
