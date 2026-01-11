/**
 * Contract Watcher Daemon
 * Monitors contract expiry dates and sends reminders
 */

const db = require('./utils/database');
const emailService = require('./utils/email-service');

const REMINDER_DAYS = [30, 14, 7, 1];

async function run() {
    let remindersSent = 0;
    const errors = [];

    try {
        // Check subcontractor contracts
        const expiringContracts = await db.query(`
            SELECT
                c.*,
                s.first_name,
                s.last_name,
                s.email,
                s.company_name,
                EXTRACT(DAY FROM c.valid_until - NOW()) as days_until_expiry
            FROM bau.contracts c
            LEFT JOIN bau.subcontractors s ON c.subcontractor_id = s.id
            WHERE c.status = 'active'
            AND c.valid_until IS NOT NULL
            AND c.valid_until > NOW()
            AND c.valid_until < NOW() + INTERVAL '31 days'
        `);

        for (const contract of expiringContracts.rows) {
            const daysUntil = Math.floor(contract.days_until_expiry);

            // Check if we should send a reminder
            const shouldRemind = REMINDER_DAYS.includes(daysUntil);
            if (!shouldRemind) continue;

            // Check if already reminded
            const alreadyReminded = await db.query(`
                SELECT 1 FROM bau.notifications
                WHERE entity_type = 'contract'
                AND entity_id = $1
                AND notification_type = $2
            `, [contract.id, `expiry_reminder_${daysUntil}`]);

            if (alreadyReminded.rows.length > 0) continue;

            // Send reminder to subcontractor
            if (contract.email) {
                await emailService.sendEmail({
                    to: contract.email,
                    subject: `Vertragserinnerung: ${daysUntil} Tage bis Ablauf`,
                    body: `
Hallo ${contract.first_name},

Ihr Rahmenvertrag mit West Money Bau läuft in ${daysUntil} Tagen ab.

Vertragsnummer: ${contract.contract_number}
Ablaufdatum: ${new Date(contract.valid_until).toLocaleDateString('de-DE')}

Bitte kontaktieren Sie uns, wenn Sie den Vertrag verlängern möchten.

Mit freundlichen Grüßen
West Money Bau Team
                    `
                });
            }

            // Send reminder to admin
            await emailService.sendEmail({
                to: emailService.CONFIG.adminEmail,
                subject: `[Vertrag] ${contract.company_name || contract.first_name} - Ablauf in ${daysUntil} Tagen`,
                body: `
Vertrag läuft ab:

Subunternehmer: ${contract.first_name} ${contract.last_name}
Firma: ${contract.company_name || '-'}
Vertragsnummer: ${contract.contract_number}
Ablaufdatum: ${new Date(contract.valid_until).toLocaleDateString('de-DE')}
Tage verbleibend: ${daysUntil}

Dashboard: https://west-money-bau.de/dashboard
                `
            });

            // Record notification
            await db.query(`
                INSERT INTO bau.notifications
                (entity_type, entity_id, notification_type, channel, status)
                VALUES ($1, $2, $3, $4, $5)
            `, ['contract', contract.id, `expiry_reminder_${daysUntil}`, 'email', 'sent']);

            remindersSent++;
        }

        // Check for maintenance contract renewals
        const maintenanceContracts = await db.query(`
            SELECT
                lp.*,
                c.first_name,
                c.last_name,
                c.email,
                EXTRACT(DAY FROM lp.maintenance_renewal_date - NOW()) as days_until_renewal
            FROM bau.loxone_projects lp
            LEFT JOIN bau.customers c ON lp.customer_id = c.id
            WHERE lp.maintenance_contract = true
            AND lp.maintenance_renewal_date IS NOT NULL
            AND lp.maintenance_renewal_date > NOW()
            AND lp.maintenance_renewal_date < NOW() + INTERVAL '31 days'
        `);

        for (const contract of maintenanceContracts.rows) {
            const daysUntil = Math.floor(contract.days_until_renewal);

            if (!REMINDER_DAYS.includes(daysUntil)) continue;

            if (contract.email) {
                await emailService.sendEmail({
                    to: contract.email,
                    subject: `LOXONE Wartungsvertrag - Verlängerung in ${daysUntil} Tagen`,
                    body: `
Sehr geehrte/r ${contract.first_name} ${contract.last_name},

Ihr LOXONE Wartungsvertrag steht zur Verlängerung an.

Verlängerungsdatum: ${new Date(contract.maintenance_renewal_date).toLocaleDateString('de-DE')}

Der Wartungsvertrag beinhaltet:
- Jährliche Systeminspektion
- Software-Updates
- Fernwartung & Support
- Reaktionszeit 24h

Antworten Sie auf diese E-Mail, wenn Sie Fragen haben.

Mit freundlichen Grüßen
West Money Bau Team
                    `
                });

                remindersSent++;
            }
        }

    } catch (error) {
        errors.push(error.message);
        console.error('[ContractWatcher] Error:', error.message);
    }

    return {
        success: errors.length === 0,
        summary: `${remindersSent} contract reminders sent`,
        errors
    };
}

module.exports = { run };
