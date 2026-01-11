/**
 * Report Generator Daemon
 * Generates daily/weekly business reports and sends via email
 */

const db = require('./utils/database');
const emailService = require('./utils/email-service');

async function generateDailyReport() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const stats = {};

    try {
        // Projects stats
        const projectStats = await db.query(`
            SELECT
                COUNT(*) FILTER (WHERE created_at >= $1) as new_today,
                COUNT(*) FILTER (WHERE status = 'inquiry') as inquiries,
                COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
                COUNT(*) FILTER (WHERE status = 'completed' AND updated_at >= $1) as completed_today,
                COUNT(*) as total
            FROM bau.projects
        `, [yesterday]);
        stats.projects = projectStats.rows[0];

        // Customer stats
        const customerStats = await db.query(`
            SELECT
                COUNT(*) FILTER (WHERE created_at >= $1) as new_today,
                COUNT(*) as total
            FROM bau.customers
        `, [yesterday]);
        stats.customers = customerStats.rows[0];

        // Subcontractor stats
        const subStats = await db.query(`
            SELECT
                COUNT(*) FILTER (WHERE status = 'approved') as approved,
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) as total
            FROM bau.subcontractors
        `);
        stats.subcontractors = subStats.rows[0];

        // Application stats
        const appStats = await db.query(`
            SELECT
                COUNT(*) FILTER (WHERE created_at >= $1) as new_today,
                COUNT(*) FILTER (WHERE status = 'new') as pending,
                COUNT(*) as total
            FROM bau.subcontractor_applications
        `, [yesterday]);
        stats.applications = appStats.rows[0];

        // Payment stats
        const paymentStats = await db.query(`
            SELECT
                COALESCE(SUM(amount) FILTER (WHERE status = 'paid' AND paid_at >= $1), 0) as revenue_today,
                COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as outstanding,
                COUNT(*) FILTER (WHERE status = 'pending' AND due_date < NOW()) as overdue_count
            FROM bau.payments
            WHERE payment_type = 'customer_invoice'
        `, [yesterday]);
        stats.payments = paymentStats.rows[0];

        // Recent activities
        const activities = await db.query(`
            SELECT action, description, created_at
            FROM bau.activity_log
            WHERE created_at >= $1
            ORDER BY created_at DESC
            LIMIT 10
        `, [yesterday]);
        stats.recentActivities = activities.rows;

    } catch (error) {
        console.error('Error generating stats:', error.message);
    }

    return stats;
}

function formatReportHTML(stats, date) {
    const formatNumber = (n) => parseInt(n || 0).toLocaleString('de-DE');
    const formatCurrency = (n) => parseFloat(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 });

    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #00c853, #009624); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .content { padding: 30px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 16px; font-weight: bold; color: #333; margin-bottom: 15px; border-bottom: 2px solid #00c853; padding-bottom: 5px; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; }
        .stat-value { font-size: 28px; font-weight: bold; color: #00c853; }
        .stat-label { color: #666; font-size: 12px; text-transform: uppercase; }
        .activity-list { list-style: none; padding: 0; }
        .activity-list li { padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px; }
        .activity-list li:last-child { border-bottom: none; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .highlight { color: #ff6d00; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Täglicher Business Report</h1>
            <p>${date}</p>
        </div>
        <div class="content">
            <div class="section">
                <div class="section-title">Projekte</div>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${formatNumber(stats.projects?.new_today)}</div>
                        <div class="stat-label">Neue Anfragen heute</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${formatNumber(stats.projects?.in_progress)}</div>
                        <div class="stat-label">In Bearbeitung</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${formatNumber(stats.projects?.completed_today)}</div>
                        <div class="stat-label">Abgeschlossen heute</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${formatNumber(stats.projects?.total)}</div>
                        <div class="stat-label">Projekte gesamt</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Finanzen</div>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${formatCurrency(stats.payments?.revenue_today)} €</div>
                        <div class="stat-label">Umsatz heute</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${formatCurrency(stats.payments?.outstanding)} €</div>
                        <div class="stat-label">Ausstehend</div>
                    </div>
                </div>
                ${stats.payments?.overdue_count > 0 ? `<p class="highlight">⚠️ ${stats.payments.overdue_count} überfällige Rechnungen</p>` : ''}
            </div>

            <div class="section">
                <div class="section-title">Subunternehmer</div>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${formatNumber(stats.applications?.new_today)}</div>
                        <div class="stat-label">Neue Bewerbungen</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${formatNumber(stats.applications?.pending)}</div>
                        <div class="stat-label">Zu prüfen</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${formatNumber(stats.subcontractors?.approved)}</div>
                        <div class="stat-label">Aktive Partner</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${formatNumber(stats.customers?.new_today)}</div>
                        <div class="stat-label">Neue Kunden</div>
                    </div>
                </div>
            </div>

            ${stats.recentActivities?.length > 0 ? `
            <div class="section">
                <div class="section-title">Letzte Aktivitäten</div>
                <ul class="activity-list">
                    ${stats.recentActivities.map(a => `
                        <li>${a.description || a.action}</li>
                    `).join('')}
                </ul>
            </div>
            ` : ''}
        </div>
        <div class="footer">
            Enterprise Universe - Automatisch generierter Report<br>
            <a href="https://west-money-bau.de/dashboard">Dashboard öffnen</a>
        </div>
    </div>
</body>
</html>
    `;
}

async function run() {
    try {
        const stats = await generateDailyReport();
        const today = new Date().toLocaleDateString('de-DE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const html = formatReportHTML(stats, today);

        const result = await emailService.sendReport({
            subject: `📊 Täglicher Report - ${new Date().toLocaleDateString('de-DE')}`,
            html: html
        });

        return {
            success: result.success,
            summary: `Daily report sent`,
            stats
        };

    } catch (error) {
        return {
            success: false,
            summary: 'Report generation failed',
            error: error.message
        };
    }
}

module.exports = { run, generateDailyReport };
