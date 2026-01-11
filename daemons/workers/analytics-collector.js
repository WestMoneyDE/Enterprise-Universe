/**
 * Analytics Collector Daemon
 * Collects and aggregates business metrics
 */

const db = require('./utils/database');

async function collectMetrics() {
    const metrics = {
        timestamp: new Date().toISOString(),
        hour: new Date().getHours()
    };

    try {
        // Project metrics
        const projectMetrics = await db.query(`
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'inquiry') as inquiries,
                COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_24h,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_7d,
                COALESCE(AVG(EXTRACT(DAY FROM
                    CASE WHEN status = 'completed' THEN updated_at - created_at END
                )), 0) as avg_completion_days
            FROM bau.projects
        `);
        metrics.projects = projectMetrics.rows[0];

        // Customer metrics
        const customerMetrics = await db.query(`
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_24h,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_7d,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_30d
            FROM bau.customers
        `);
        metrics.customers = customerMetrics.rows[0];

        // Subcontractor metrics
        const subMetrics = await db.query(`
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'approved') as approved,
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE availability_status = 'available') as available,
                COALESCE(AVG(rating), 0) as avg_rating
            FROM bau.subcontractors
        `);
        metrics.subcontractors = subMetrics.rows[0];

        // Application metrics
        const appMetrics = await db.query(`
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'new') as new,
                COUNT(*) FILTER (WHERE status = 'approved') as approved,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_24h
            FROM bau.subcontractor_applications
        `);
        metrics.applications = appMetrics.rows[0];

        // Revenue metrics
        const revenueMetrics = await db.query(`
            SELECT
                COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as total_revenue,
                COALESCE(SUM(amount) FILTER (WHERE status = 'paid' AND paid_at > NOW() - INTERVAL '24 hours'), 0) as revenue_24h,
                COALESCE(SUM(amount) FILTER (WHERE status = 'paid' AND paid_at > NOW() - INTERVAL '7 days'), 0) as revenue_7d,
                COALESCE(SUM(amount) FILTER (WHERE status = 'paid' AND paid_at > NOW() - INTERVAL '30 days'), 0) as revenue_30d,
                COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as outstanding,
                COUNT(*) FILTER (WHERE status = 'pending' AND due_date < NOW()) as overdue_count
            FROM bau.payments
            WHERE payment_type = 'customer_invoice'
        `);
        metrics.revenue = revenueMetrics.rows[0];

        // Assignment metrics
        const assignmentMetrics = await db.query(`
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
                COALESCE(AVG(performance_rating) FILTER (WHERE performance_rating IS NOT NULL), 0) as avg_performance
            FROM bau.project_assignments
        `);
        metrics.assignments = assignmentMetrics.rows[0];

    } catch (error) {
        console.error('[Analytics] Collection error:', error.message);
    }

    return metrics;
}

async function storeMetrics(metrics) {
    try {
        // Create analytics table if it doesn't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS bau.analytics_snapshots (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMPTZ DEFAULT NOW(),
                hour INTEGER,
                metrics JSONB,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Store snapshot
        await db.query(`
            INSERT INTO bau.analytics_snapshots (timestamp, hour, metrics)
            VALUES ($1, $2, $3)
        `, [metrics.timestamp, metrics.hour, JSON.stringify(metrics)]);

        // Clean old snapshots (keep last 30 days)
        await db.query(`
            DELETE FROM bau.analytics_snapshots
            WHERE created_at < NOW() - INTERVAL '30 days'
        `);

        return true;
    } catch (error) {
        console.error('[Analytics] Storage error:', error.message);
        return false;
    }
}

async function calculateTrends() {
    const trends = {};

    try {
        // Get snapshots from 24h and 7d ago
        const comparisons = await db.query(`
            SELECT
                metrics,
                EXTRACT(DAY FROM NOW() - timestamp) as days_ago
            FROM bau.analytics_snapshots
            WHERE timestamp IN (
                (SELECT timestamp FROM bau.analytics_snapshots
                 WHERE timestamp < NOW() - INTERVAL '23 hours'
                 ORDER BY timestamp DESC LIMIT 1),
                (SELECT timestamp FROM bau.analytics_snapshots
                 WHERE timestamp < NOW() - INTERVAL '6 days 23 hours'
                 ORDER BY timestamp DESC LIMIT 1)
            )
        `);

        // Calculate trends based on historical data
        // This would compare current metrics to historical ones

    } catch (error) {
        console.error('[Analytics] Trend calculation error:', error.message);
    }

    return trends;
}

async function run() {
    const metrics = await collectMetrics();
    const stored = await storeMetrics(metrics);
    const trends = await calculateTrends();

    return {
        success: stored,
        summary: `Collected ${Object.keys(metrics).length} metric categories`,
        metrics,
        trends
    };
}

module.exports = { run, collectMetrics };
