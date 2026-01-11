/**
 * Lead Nurturing Daemon
 * Automated follow-ups based on lead stage and activity
 */

const db = require('./utils/database');
const emailService = require('./utils/email-service');

// Nurturing sequences for different lead types
const SEQUENCES = {
    project_inquiry: [
        { delay_days: 1, template: 'inquiry_followup_1' },
        { delay_days: 3, template: 'inquiry_followup_2' },
        { delay_days: 7, template: 'inquiry_followup_3' },
        { delay_days: 14, template: 'inquiry_final' }
    ],
    subcontractor_application: [
        { delay_days: 2, template: 'application_status_update' },
        { delay_days: 5, template: 'application_documents_reminder' }
    ],
    quote_sent: [
        { delay_days: 2, template: 'quote_followup_1' },
        { delay_days: 5, template: 'quote_followup_2' },
        { delay_days: 10, template: 'quote_expiring' }
    ]
};

const TEMPLATES = {
    inquiry_followup_1: {
        subject: 'Ihre Projektanfrage bei West Money Bau',
        body: `
Sehr geehrte/r {name},

vielen Dank für Ihre Anfrage bezüglich {project_type}.

Wir möchten sicherstellen, dass Sie alle Informationen haben, die Sie benötigen.
Haben Sie Fragen zu unseren Smart Home Lösungen oder zum Ablauf?

Als LOXONE Gold Partner bieten wir Ihnen:
- Kostenlose Erstberatung vor Ort
- Individuelle Planung nach Ihren Wünschen
- Installation durch zertifizierte Fachkräfte
- 2 Jahre Garantie auf alle Komponenten

Antworten Sie einfach auf diese E-Mail oder rufen Sie uns an.

Mit freundlichen Grüßen
West Money Bau Team
        `
    },
    inquiry_followup_2: {
        subject: 'Noch Fragen zu Ihrem {project_type} Projekt?',
        body: `
Hallo {name},

wir wollten kurz nachfragen, ob Sie noch Unterstützung bei Ihrer
{project_type}-Planung benötigen.

Wussten Sie schon?
- Smart Home Systeme können Ihre Energiekosten um bis zu 30% senken
- Barrierefreie Umbauten werden von der KfW gefördert
- Wir bieten flexible Finanzierungsmöglichkeiten

Lassen Sie uns Ihr Projekt gemeinsam besprechen.

Beste Grüße
West Money Bau
        `
    },
    inquiry_followup_3: {
        subject: 'Exklusives Angebot für Ihr Projekt',
        body: `
Sehr geehrte/r {name},

da Sie Interesse an {project_type} gezeigt haben, möchten wir Ihnen
ein besonderes Angebot machen:

Vereinbaren Sie bis Ende des Monats einen Beratungstermin und
erhalten Sie 10% Rabatt auf die Planungskosten.

Einfach auf diese E-Mail antworten oder anrufen.

Mit freundlichen Grüßen
West Money Bau
        `
    },
    inquiry_final: {
        subject: 'Können wir Ihnen noch helfen?',
        body: `
Hallo {name},

wir haben Sie vor einiger Zeit bezüglich Ihres {project_type}-Projekts kontaktiert.

Falls sich Ihre Pläne geändert haben oder Sie zu einem späteren Zeitpunkt
starten möchten, lassen Sie es uns wissen.

Wir sind jederzeit für Sie da.

Beste Grüße
West Money Bau
        `
    },
    quote_followup_1: {
        subject: 'Ihr Angebot von West Money Bau',
        body: `
Sehr geehrte/r {name},

haben Sie unser Angebot erhalten? Wir wollten sicherstellen,
dass Sie alle Details verstanden haben.

Falls Sie Fragen haben oder Anpassungen wünschen, sind wir gerne für Sie da.

Mit freundlichen Grüßen
West Money Bau
        `
    },
    quote_followup_2: {
        subject: 'Feedback zu unserem Angebot?',
        body: `
Hallo {name},

wir sind gespannt auf Ihre Meinung zu unserem Angebot.

Gibt es etwas, das wir anpassen können? Wir sind offen für Ihre Wünsche
und finden sicher eine passende Lösung.

Beste Grüße
West Money Bau
        `
    },
    quote_expiring: {
        subject: 'Ihr Angebot läuft bald ab',
        body: `
Sehr geehrte/r {name},

Ihr Angebot für {project_type} ist noch 5 Tage gültig.

Um die genannten Konditionen zu sichern, bitten wir um Ihre
baldige Rückmeldung.

Bei Fragen sind wir jederzeit erreichbar.

Mit freundlichen Grüßen
West Money Bau
        `
    },
    application_status_update: {
        subject: 'Status Ihrer Bewerbung bei West Money Bau',
        body: `
Hallo {name},

vielen Dank nochmals für Ihre Bewerbung als Subunternehmer.

Wir prüfen derzeit Ihre Unterlagen und melden uns in Kürze mit
den nächsten Schritten.

Falls Sie in der Zwischenzeit Fragen haben, können Sie uns jederzeit erreichen.

Beste Grüße
West Money Bau Team
        `
    },
    application_documents_reminder: {
        subject: 'Fehlende Unterlagen für Ihre Bewerbung',
        body: `
Hallo {name},

für die weitere Bearbeitung Ihrer Bewerbung benötigen wir noch folgende Unterlagen:

- Gewerbeschein / Handelsregisterauszug
- Nachweis der Berufshaftpflichtversicherung
- Referenzen (falls vorhanden)

Bitte senden Sie diese an info@enterprise-universe.com.

Beste Grüße
West Money Bau Team
        `
    }
};

function fillTemplate(template, data) {
    let text = template;
    for (const [key, value] of Object.entries(data)) {
        text = text.replace(new RegExp(`{${key}}`, 'g'), value || '');
    }
    return text;
}

async function run() {
    let emailsSent = 0;
    const errors = [];

    try {
        // Process project inquiries
        const inquiries = await db.query(`
            SELECT
                p.id, p.project_type, p.status, p.created_at,
                c.first_name, c.last_name, c.email, c.company,
                EXTRACT(DAY FROM NOW() - p.created_at) as days_since_created
            FROM bau.projects p
            LEFT JOIN bau.customers c ON p.customer_id = c.id
            WHERE p.status = 'inquiry'
            AND c.email IS NOT NULL
            ORDER BY p.created_at ASC
        `);

        for (const inquiry of inquiries.rows) {
            const sequence = SEQUENCES.project_inquiry;
            const daysSince = Math.floor(inquiry.days_since_created);

            for (const step of sequence) {
                if (daysSince >= step.delay_days) {
                    // Check if already sent
                    const sent = await db.query(`
                        SELECT 1 FROM bau.notifications
                        WHERE entity_type = 'project' AND entity_id = $1
                        AND notification_type = $2
                    `, [inquiry.id, step.template]);

                    if (sent.rows.length === 0) {
                        const template = TEMPLATES[step.template];
                        if (template) {
                            const result = await emailService.sendEmail({
                                to: inquiry.email,
                                subject: fillTemplate(template.subject, {
                                    name: inquiry.company || `${inquiry.first_name} ${inquiry.last_name}`,
                                    project_type: inquiry.project_type
                                }),
                                body: fillTemplate(template.body, {
                                    name: inquiry.first_name || inquiry.company,
                                    project_type: inquiry.project_type
                                })
                            });

                            if (result.success) {
                                emailsSent++;
                                await db.query(`
                                    INSERT INTO bau.notifications
                                    (entity_type, entity_id, notification_type, channel, recipient, status)
                                    VALUES ($1, $2, $3, $4, $5, $6)
                                `, ['project', inquiry.id, step.template, 'email', inquiry.email, 'sent']);
                            }
                        }
                        break; // Only send one email per lead per run
                    }
                }
            }
        }

        // Process subcontractor applications
        const applications = await db.query(`
            SELECT
                id, first_name, last_name, email, status, created_at,
                EXTRACT(DAY FROM NOW() - created_at) as days_since_created
            FROM bau.subcontractor_applications
            WHERE status IN ('new', 'reviewing')
            AND email IS NOT NULL
        `);

        for (const app of applications.rows) {
            const sequence = SEQUENCES.subcontractor_application;
            const daysSince = Math.floor(app.days_since_created);

            for (const step of sequence) {
                if (daysSince >= step.delay_days) {
                    const sent = await db.query(`
                        SELECT 1 FROM bau.notifications
                        WHERE entity_type = 'application' AND entity_id = $1
                        AND notification_type = $2
                    `, [app.id, step.template]);

                    if (sent.rows.length === 0) {
                        const template = TEMPLATES[step.template];
                        if (template) {
                            const result = await emailService.sendEmail({
                                to: app.email,
                                subject: fillTemplate(template.subject, { name: app.first_name }),
                                body: fillTemplate(template.body, { name: app.first_name })
                            });

                            if (result.success) {
                                emailsSent++;
                                await db.query(`
                                    INSERT INTO bau.notifications
                                    (entity_type, entity_id, notification_type, channel, recipient, status)
                                    VALUES ($1, $2, $3, $4, $5, $6)
                                `, ['application', app.id, step.template, 'email', app.email, 'sent']);
                            }
                        }
                        break;
                    }
                }
            }
        }

    } catch (error) {
        errors.push(error.message);
    }

    return {
        success: errors.length === 0,
        summary: `${emailsSent} nurturing emails sent`,
        errors
    };
}

module.exports = { run, TEMPLATES, SEQUENCES };
