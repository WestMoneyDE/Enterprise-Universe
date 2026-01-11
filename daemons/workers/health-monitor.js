/**
 * Health Monitor Daemon
 * Monitors all services and alerts on issues
 */

const http = require('http');
const https = require('https');
const emailService = require('./utils/email-service');
const db = require('./utils/database');

const SERVICES = [
    { name: 'App Server', url: 'http://localhost:3015/api/health', critical: true },
    { name: 'Bau API', url: 'http://localhost:3016/api/health', critical: true },
    { name: 'West Money Backend', url: 'http://localhost:5000/api/health', critical: false },
    { name: 'Enterprise Universe', url: 'https://enterprise-universe.one', critical: true },
    { name: 'West Money Bau', url: 'https://west-money-bau.de/api/health', critical: true }
];

// Track consecutive failures
const failureCount = {};

async function checkService(service) {
    return new Promise((resolve) => {
        const protocol = service.url.startsWith('https') ? https : http;
        const timeout = setTimeout(() => {
            resolve({ name: service.name, status: 'timeout', critical: service.critical });
        }, 10000);

        const req = protocol.get(service.url, (res) => {
            clearTimeout(timeout);
            resolve({
                name: service.name,
                status: res.statusCode === 200 ? 'healthy' : 'unhealthy',
                statusCode: res.statusCode,
                critical: service.critical
            });
        });

        req.on('error', (err) => {
            clearTimeout(timeout);
            resolve({
                name: service.name,
                status: 'error',
                error: err.message,
                critical: service.critical
            });
        });
    });
}

async function checkDatabase() {
    try {
        const result = await db.query('SELECT NOW()');
        return { name: 'PostgreSQL', status: 'healthy' };
    } catch (error) {
        return { name: 'PostgreSQL', status: 'error', error: error.message, critical: true };
    }
}

async function run() {
    const results = [];
    const failures = [];

    // Check all HTTP services
    for (const service of SERVICES) {
        const result = await checkService(service);
        results.push(result);

        if (result.status !== 'healthy') {
            failureCount[service.name] = (failureCount[service.name] || 0) + 1;

            // Alert after 3 consecutive failures
            if (failureCount[service.name] >= 3 && result.critical) {
                failures.push(result);
            }
        } else {
            failureCount[service.name] = 0;
        }
    }

    // Check database
    const dbResult = await checkDatabase();
    results.push(dbResult);
    if (dbResult.status !== 'healthy') {
        failures.push(dbResult);
    }

    // Send alert if there are critical failures
    if (failures.length > 0) {
        await emailService.sendAlert({
            subject: `Service Health Alert - ${failures.length} issues`,
            message: `The following services have issues:\n\n${failures.map(f =>
                `- ${f.name}: ${f.status} ${f.error ? `(${f.error})` : ''}`
            ).join('\n')}\n\nTimestamp: ${new Date().toISOString()}`
        });
    }

    // Log results to database
    try {
        await db.query(
            `INSERT INTO daemon_logs (daemon_name, status, details, created_at)
             VALUES ($1, $2, $3, NOW())`,
            ['health-monitor', failures.length === 0 ? 'success' : 'warning', JSON.stringify(results)]
        );
    } catch (e) {
        // Table might not exist yet
    }

    const healthy = results.filter(r => r.status === 'healthy').length;
    const total = results.length;

    return {
        success: failures.length === 0,
        summary: `${healthy}/${total} services healthy`,
        results
    };
}

module.exports = { run };
