/**
 * Invoice Reminder Daemon
 * Sends payment reminders for overdue invoices
 */

const db = require('./utils/database');
const emailService = require('./utils/email-service');

const REMINDER_SCHEDULE = [
    { daysOverdue: 1, template: 'reminder_friendly' },
    { daysOverdue: 7, template: 'reminder_firm' },
    { daysOverdue: 14, template: 'reminder_urgent' },
    { daysOverdue: 30, template: 'reminder_final' }
];

const TEMPLATES = {
    reminder_friendly: {
        subject: 'Freundliche Zahlungserinnerung - Rechnung {invoice_number}',
        body: `
Sehr geehrte/r {customer_name},

wir möchten Sie freundlich daran erinnern, dass die Rechnung {invoice_number}
über {amount} EUR seit gestern fällig ist.

Falls Sie die Zahlung bereits veranlasst haben, betrachten Sie diese
Erinnerung bitte als gegenstandslos.

Rechnungsdetails:
- Rechnungsnummer: {invoice_number}
- Betrag: {amount} EUR
- Fälligkeitsdatum: {due_date}

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
Enterprise Universe
        `
    },
    reminder_firm: {
        subject: 'Zweite Zahlungserinnerung - Rechnung {invoice_number}',
        body: `
Sehr geehrte/r {customer_name},

leider konnten wir noch keinen Zahlungseingang für die Rechnung {invoice_number}
verzeichnen. Der Betrag von {amount} EUR ist seit {days_overdue} Tagen überfällig.

Bitte begleichen Sie den offenen Betrag innerhalb der nächsten 7 Tage.

Rechnungsdetails:
- Rechnungsnummer: {invoice_number}
- Betrag: {amount} EUR
- Fälligkeitsdatum: {due_date}
- Überfällig seit: {days_overdue} Tagen

Mit freundlichen Grüßen
Enterprise Universe
        `
    },
    reminder_urgent: {
        subject: 'DRINGEND: Letzte Zahlungserinnerung - Rechnung {invoice_number}',
        body: `
Sehr geehrte/r {customer_name},

trotz unserer bisherigen Erinnerungen ist die Rechnung {invoice_number}
weiterhin unbezahlt. Der Betrag von {amount} EUR ist seit {days_overdue} Tagen überfällig.

Wir bitten Sie dringend, den Betrag innerhalb von 5 Werktagen zu begleichen,
um weitere Maßnahmen zu vermeiden.

Sollten Sie Zahlungsschwierigkeiten haben, kontaktieren Sie uns bitte umgehend,
um eine Lösung zu finden.

Rechnungsdetails:
- Rechnungsnummer: {invoice_number}
- Betrag: {amount} EUR
- Fälligkeitsdatum: {due_date}

Mit freundlichen Grüßen
Enterprise Universe
        `
    },
    reminder_final: {
        subject: 'Letzte Mahnung vor Inkasso - Rechnung {invoice_number}',
        body: `
Sehr geehrte/r {customer_name},

dies ist unsere letzte Mahnung bezüglich der Rechnung {invoice_number}.

Der Betrag von {amount} EUR ist seit {days_overdue} Tagen überfällig.
Ohne Zahlungseingang innerhalb der nächsten 7 Tage werden wir die
Forderung an ein Inkassounternehmen übergeben.

Rechnungsdetails:
- Rechnungsnummer: {invoice_number}
- Betrag: {amount} EUR
- Fälligkeitsdatum: {due_date}

Enterprise Universe
        `
    }
};

function fillTemplate(template, data) {
    let text = template;
    for (const [key, value] of Object.entries(data)) {
        text = text.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return text;
}

async function run() {
    let remindersSent = 0;
    const errors = [];

    try {
        // Get overdue invoices from bau.payments
        const overdueInvoices = await db.query(`
            SELECT
                p.*,
                c.first_name,
                c.last_name,
                c.email,
                c.company,
                EXTRACT(DAY FROM NOW() - p.due_date) as days_overdue
            FROM bau.payments p
            LEFT JOIN bau.customers c ON p.customer_id = c.id
            WHERE p.status = 'pending'
            AND p.due_date < NOW()
            AND p.payment_type = 'customer_invoice'
            ORDER BY p.due_date ASC
        `);

        for (const invoice of overdueInvoices.rows) {
            const daysOverdue = Math.floor(invoice.days_overdue);

            // Find appropriate reminder template
            let templateKey = null;
            for (const schedule of REMINDER_SCHEDULE) {
                if (daysOverdue >= schedule.daysOverdue) {
                    templateKey = schedule.template;
                }
            }

            if (!templateKey || !invoice.email) continue;

            // Check if we already sent this reminder
            const lastReminder = await db.query(`
                SELECT * FROM bau.notifications
                WHERE entity_type = 'payment'
                AND entity_id = $1
                AND notification_type = $2
                AND created_at > NOW() - INTERVAL '6 days'
            `, [invoice.id, templateKey]);

            if (lastReminder.rows.length > 0) continue;

            // Send reminder
            const template = TEMPLATES[templateKey];
            const data = {
                customer_name: invoice.company || `${invoice.first_name} ${invoice.last_name}`,
                invoice_number: invoice.invoice_number,
                amount: parseFloat(invoice.amount).toFixed(2),
                due_date: new Date(invoice.due_date).toLocaleDateString('de-DE'),
                days_overdue: daysOverdue
            };

            const result = await emailService.sendEmail({
                to: invoice.email,
                subject: fillTemplate(template.subject, data),
                body: fillTemplate(template.body, data)
            });

            if (result.success) {
                remindersSent++;

                // Log the notification
                await db.query(`
                    INSERT INTO bau.notifications
                    (entity_type, entity_id, notification_type, channel, recipient, status)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, ['payment', invoice.id, templateKey, 'email', invoice.email, 'sent']);
            } else {
                errors.push(`Failed to send to ${invoice.email}: ${result.error}`);
            }
        }

    } catch (error) {
        errors.push(error.message);
    }

    return {
        success: errors.length === 0,
        summary: `${remindersSent} reminders sent`,
        errors
    };
}

module.exports = { run, TEMPLATES };
