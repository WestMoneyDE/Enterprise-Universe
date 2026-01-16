#!/usr/bin/env node
/**
 * Fetch Contact Information for Deals from HubSpot
 * Gets email addresses via deal-contact associations
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.HUBSPOT_API_KEY;
const DATA_DIR = path.join(__dirname, '..', 'Data Room', '05_Won_Deals');
const EMAIL_QUEUE_DIR = path.join(DATA_DIR, 'Email_Queue');

// Rate limiting helper
const delay = ms => new Promise(r => setTimeout(r, ms));

// Fetch deal associations (contacts)
async function getDealContacts(dealId) {
    const url = `https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/contacts`;
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    if (!response.ok) {
        if (response.status === 429) {
            await delay(1000);
            return getDealContacts(dealId);
        }
        return [];
    }

    const data = await response.json();
    return data.results || [];
}

// Fetch contact details
async function getContact(contactId) {
    const url = `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname,phone,company`;
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    if (!response.ok) {
        if (response.status === 429) {
            await delay(1000);
            return getContact(contactId);
        }
        return null;
    }

    return response.json();
}

// Batch fetch contacts (100 at a time)
async function batchGetContacts(contactIds) {
    const url = 'https://api.hubapi.com/crm/v3/objects/contacts/batch/read';
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            inputs: contactIds.map(id => ({ id })),
            properties: ['email', 'firstname', 'lastname', 'phone', 'company']
        })
    });

    if (!response.ok) {
        if (response.status === 429) {
            await delay(2000);
            return batchGetContacts(contactIds);
        }
        console.error(`Batch fetch error: ${response.status}`);
        return [];
    }

    const data = await response.json();
    return data.results || [];
}

// Calculate project info (copied from batch script)
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
    }
    return {
        class: 'C-Class Basic',
        phases: [
            { name: 'Setup', duration: '1 Woche', percentage: 30 },
            { name: 'Delivery', duration: '2 Wochen', percentage: 70 }
        ],
        paymentTerms: '100% bei Auftragserteilung'
    };
}

async function main() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     FETCH DEAL CONTACTS FROM HUBSPOT                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    // Load deals
    const exportFiles = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('won_deals_export_') && f.endsWith('.json'));
    const exportFile = path.join(DATA_DIR, exportFiles[exportFiles.length - 1]);
    const exportData = JSON.parse(fs.readFileSync(exportFile, 'utf-8'));

    // Filter deals without email in description
    const dealsNeedingContacts = exportData.deals.filter(d =>
        !d.description || !d.description.includes('E-Mail:')
    );

    console.log(`Deals without email in description: ${dealsNeedingContacts.length}`);
    console.log(`Processing in batches...\n`);

    const contactsFound = [];
    const emailsAdded = [];
    let processed = 0;

    // Process in smaller batches to avoid rate limits
    const BATCH_SIZE = 50;

    for (let i = 0; i < dealsNeedingContacts.length; i += BATCH_SIZE) {
        const batch = dealsNeedingContacts.slice(i, i + BATCH_SIZE);

        // Get all associations for this batch
        const associations = await Promise.all(
            batch.map(async deal => {
                const contacts = await getDealContacts(deal.id);
                return { deal, contactIds: contacts.map(c => c.id) };
            })
        );

        // Collect unique contact IDs
        const allContactIds = [...new Set(associations.flatMap(a => a.contactIds))];

        if (allContactIds.length > 0) {
            // Batch fetch contact details
            const contacts = await batchGetContacts(allContactIds);
            const contactMap = new Map(contacts.map(c => [c.id, c]));

            // Process each deal's contacts
            for (const { deal, contactIds } of associations) {
                if (contactIds.length > 0) {
                    const contact = contactMap.get(contactIds[0]);
                    if (contact && contact.properties.email) {
                        const projectInfo = calculateProjectPhases(deal.amount);
                        const companyName = deal.name.replace(/^S-Class:\s*|^A-Class:\s*|^B-Class:\s*|^C-Class:\s*/, '').split('#')[0].trim();

                        emailsAdded.push({
                            to: contact.properties.email,
                            subject: `Enterprise Universe - Projektstart ${companyName}`,
                            template: 'project_kickoff',
                            data: {
                                contactName: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim() || 'Sehr geehrte Damen und Herren',
                                companyName,
                                projectClass: projectInfo.class,
                                dealAmount: deal.amount,
                                invoiceNumber: `EU-202601-${String(exportData.deals.indexOf(deal) + 1).padStart(5, '0')}`,
                                phases: projectInfo.phases,
                                paymentTerms: projectInfo.paymentTerms
                            },
                            status: 'QUEUED',
                            queuedAt: new Date().toISOString(),
                            dealId: deal.id
                        });

                        contactsFound.push({
                            dealId: deal.id,
                            dealName: deal.name,
                            email: contact.properties.email,
                            contactName: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim()
                        });
                    }
                }
            }
        }

        processed += batch.length;
        const pct = Math.round(processed / dealsNeedingContacts.length * 100);
        console.log(`  Progress: ${processed}/${dealsNeedingContacts.length} (${pct}%) - Emails found: ${emailsAdded.length}`);

        // Rate limit delay
        await delay(200);
    }

    // Save additional emails
    const additionalEmailsFile = path.join(EMAIL_QUEUE_DIR, `additional_emails_${Date.now()}.json`);
    fs.writeFileSync(additionalEmailsFile, JSON.stringify({
        generatedAt: new Date().toISOString(),
        totalEmails: emailsAdded.length,
        emails: emailsAdded
    }, null, 2));

    // Save contacts found
    const contactsFile = path.join(DATA_DIR, `deal_contacts_${Date.now()}.json`);
    fs.writeFileSync(contactsFile, JSON.stringify({
        generatedAt: new Date().toISOString(),
        totalContacts: contactsFound.length,
        contacts: contactsFound
    }, null, 2));

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                    CONTACT FETCH COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`Contacts Found: ${contactsFound.length}`);
    console.log(`Additional Emails Added: ${emailsAdded.length}`);
    console.log(`\nFiles Created:`);
    console.log(`  Contacts: ${contactsFile}`);
    console.log(`  Additional Emails: ${additionalEmailsFile}`);
    console.log('\n═══════════════════════════════════════════════════════════════');

    return { contactsFound: contactsFound.length, emailsAdded: emailsAdded.length };
}

main().catch(console.error);
