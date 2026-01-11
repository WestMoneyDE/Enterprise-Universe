/**
 * Cleanup Worker Daemon
 * Cleans up old logs, temp files, and performs database maintenance
 */

const fs = require('fs').promises;
const path = require('path');
const db = require('./utils/database');

const LOG_RETENTION_DAYS = 30;
const TEMP_RETENTION_DAYS = 7;

async function cleanupLogs() {
    let cleaned = 0;

    try {
        const logDirs = [
            '/home/administrator/.pm2/logs',
            '/home/administrator/Enterprise-Universe/daemons/logs',
            '/var/log/nginx'
        ];

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - LOG_RETENTION_DAYS);

        for (const dir of logDirs) {
            try {
                const files = await fs.readdir(dir);

                for (const file of files) {
                    if (!file.endsWith('.log')) continue;

                    const filePath = path.join(dir, file);
                    const stats = await fs.stat(filePath);

                    if (stats.mtime < cutoffDate) {
                        // Truncate old log files instead of deleting
                        await fs.truncate(filePath, 0);
                        cleaned++;
                        console.log(`[Cleanup] Truncated: ${filePath}`);
                    }
                }
            } catch (e) {
                // Directory might not exist or no permission
            }
        }
    } catch (error) {
        console.error('[Cleanup] Log cleanup error:', error.message);
    }

    return cleaned;
}

async function cleanupTempFiles() {
    let cleaned = 0;

    try {
        const tempDirs = [
            '/tmp',
            '/home/administrator/Enterprise-Universe/temp'
        ];

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - TEMP_RETENTION_DAYS);

        for (const dir of tempDirs) {
            try {
                const files = await fs.readdir(dir);

                for (const file of files) {
                    // Only clean our temp files
                    if (!file.startsWith('eu_') && !file.startsWith('bau_')) continue;

                    const filePath = path.join(dir, file);
                    const stats = await fs.stat(filePath);

                    if (stats.mtime < cutoffDate) {
                        await fs.unlink(filePath);
                        cleaned++;
                    }
                }
            } catch (e) {
                // Skip errors
            }
        }
    } catch (error) {
        console.error('[Cleanup] Temp cleanup error:', error.message);
    }

    return cleaned;
}

async function cleanupDatabase() {
    const results = { deleted: 0 };

    try {
        // Clean old activity logs
        const activityResult = await db.query(`
            DELETE FROM bau.activity_log
            WHERE created_at < NOW() - INTERVAL '90 days'
        `);
        results.activityLogs = activityResult.rowCount;

        // Clean old notifications
        const notifResult = await db.query(`
            DELETE FROM bau.notifications
            WHERE created_at < NOW() - INTERVAL '60 days'
            AND status = 'sent'
        `);
        results.notifications = notifResult.rowCount;

        // Clean daemon logs (if table exists)
        try {
            const daemonResult = await db.query(`
                DELETE FROM daemon_logs
                WHERE created_at < NOW() - INTERVAL '30 days'
            `);
            results.daemonLogs = daemonResult.rowCount;
        } catch (e) {
            // Table might not exist
        }

        results.deleted = (results.activityLogs || 0) +
                         (results.notifications || 0) +
                         (results.daemonLogs || 0);

    } catch (error) {
        console.error('[Cleanup] Database cleanup error:', error.message);
    }

    return results;
}

async function vacuumDatabase() {
    try {
        // Run VACUUM ANALYZE on main tables
        const tables = [
            'bau.projects',
            'bau.customers',
            'bau.subcontractors',
            'bau.subcontractor_applications',
            'bau.payments',
            'bau.activity_log'
        ];

        for (const table of tables) {
            try {
                await db.query(`VACUUM ANALYZE ${table}`);
                console.log(`[Cleanup] Vacuumed: ${table}`);
            } catch (e) {
                // Table might not exist
            }
        }

        return true;
    } catch (error) {
        console.error('[Cleanup] Vacuum error:', error.message);
        return false;
    }
}

async function run() {
    const results = {
        logsCleanedUp: 0,
        tempFilesCleanedUp: 0,
        dbRecordsDeleted: 0,
        vacuumed: false
    };

    results.logsCleanedUp = await cleanupLogs();
    results.tempFilesCleanedUp = await cleanupTempFiles();

    const dbResults = await cleanupDatabase();
    results.dbRecordsDeleted = dbResults.deleted;

    results.vacuumed = await vacuumDatabase();

    // Log cleanup activity
    try {
        await db.query(`
            INSERT INTO bau.activity_log (entity_type, action, description)
            VALUES ('system', 'cleanup', $1)
        `, [`Cleanup: ${results.logsCleanedUp} logs, ${results.tempFilesCleanedUp} temp files, ${results.dbRecordsDeleted} DB records`]);
    } catch (e) {
        // Ignore
    }

    return {
        success: true,
        summary: `Cleaned ${results.logsCleanedUp} logs, ${results.tempFilesCleanedUp} files, ${results.dbRecordsDeleted} records`,
        results
    };
}

module.exports = { run };
