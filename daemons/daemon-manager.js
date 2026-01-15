/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ENTERPRISE UNIVERSE - DAEMON MANAGER
 * Central orchestrator for all background workers
 * ═══════════════════════════════════════════════════════════════════════════
 */

const cron = require('node-cron');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import all daemon workers
const InvoiceReminder = require('./workers/invoice-reminder');
const LeadNurturing = require('./workers/lead-nurturing');
const HealthMonitor = require('./workers/health-monitor');
const SubcontractorMatcher = require('./workers/subcontractor-matcher');
const ReportGenerator = require('./workers/report-generator');
const DataSync = require('./workers/data-sync');
const PaymentProcessor = require('./workers/payment-processor');
const ContractWatcher = require('./workers/contract-watcher');
const CleanupWorker = require('./workers/cleanup-worker');
const AnalyticsCollector = require('./workers/analytics-collector');
const OwnerAssignment = require('./workers/owner-assignment');
const PresentationSender = require('./workers/presentation-sender');

// ═══════════════════════════════════════════════════════════════════════════
// DAEMON REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

const DAEMONS = {
    healthMonitor: {
        name: 'Health Monitor',
        worker: HealthMonitor,
        schedule: '*/5 * * * *',  // Every 5 minutes
        enabled: true,
        critical: true
    },
    invoiceReminder: {
        name: 'Invoice Reminder',
        worker: InvoiceReminder,
        schedule: '0 9 * * 1-5',  // Mon-Fri at 9:00
        enabled: true,
        critical: false
    },
    leadNurturing: {
        name: 'Lead Nurturing',
        worker: LeadNurturing,
        schedule: '0 */4 * * *',  // Every 4 hours
        enabled: true,
        critical: false
    },
    subcontractorMatcher: {
        name: 'Subcontractor Matcher',
        worker: SubcontractorMatcher,
        schedule: '*/30 * * * *',  // Every 30 minutes
        enabled: true,
        critical: false
    },
    reportGenerator: {
        name: 'Report Generator',
        worker: ReportGenerator,
        schedule: '0 8 * * 1-5',  // Mon-Fri at 8:00
        enabled: true,
        critical: false
    },
    dataSync: {
        name: 'Data Sync',
        worker: DataSync,
        schedule: '*/30 * * * *',  // Every 30 minutes
        enabled: true,
        critical: true
    },
    paymentProcessor: {
        name: 'Payment Processor',
        worker: PaymentProcessor,
        schedule: '*/15 * * * *',  // Every 15 minutes
        enabled: true,
        critical: true
    },
    contractWatcher: {
        name: 'Contract Watcher',
        worker: ContractWatcher,
        schedule: '0 7 * * *',  // Daily at 7:00
        enabled: true,
        critical: false
    },
    cleanupWorker: {
        name: 'Cleanup Worker',
        worker: CleanupWorker,
        schedule: '0 3 * * 0',  // Sunday at 3:00
        enabled: true,
        critical: false
    },
    analyticsCollector: {
        name: 'Analytics Collector',
        worker: AnalyticsCollector,
        schedule: '0 * * * *',  // Every hour
        enabled: true,
        critical: false
    },
    ownerAssignment: {
        name: 'Owner Assignment',
        worker: OwnerAssignment,
        schedule: '*/15 * * * *',  // Every 15 minutes
        enabled: true,
        critical: true
    },
    presentationSender: {
        name: 'Presentation Sender',
        worker: PresentationSender,
        schedule: '*/30 * * * *',  // Every 30 minutes
        enabled: true,
        critical: false
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// DAEMON MANAGER CLASS
// ═══════════════════════════════════════════════════════════════════════════

class DaemonManager {
    constructor() {
        this.jobs = new Map();
        this.stats = {
            startTime: new Date(),
            runs: {},
            errors: {}
        };
    }

    log(level, daemon, message) {
        const timestamp = new Date().toISOString();
        const prefix = {
            info: '📋',
            success: '✅',
            error: '❌',
            warning: '⚠️',
            start: '🚀'
        }[level] || '📋';

        console.log(`[${timestamp}] ${prefix} [${daemon}] ${message}`);
    }

    async runDaemon(key, daemon) {
        const startTime = Date.now();
        this.stats.runs[key] = this.stats.runs[key] || 0;
        this.stats.runs[key]++;

        try {
            this.log('info', daemon.name, 'Starting...');
            const result = await daemon.worker.run();
            const duration = Date.now() - startTime;
            this.log('success', daemon.name, `Completed in ${duration}ms`);

            if (result && result.summary) {
                this.log('info', daemon.name, result.summary);
            }

            return result;
        } catch (error) {
            this.stats.errors[key] = this.stats.errors[key] || 0;
            this.stats.errors[key]++;

            this.log('error', daemon.name, `Failed: ${error.message}`);

            // Alert on critical daemon failures
            if (daemon.critical) {
                await this.alertCriticalFailure(daemon.name, error);
            }

            return { success: false, error: error.message };
        }
    }

    async alertCriticalFailure(daemonName, error) {
        try {
            // Send email alert
            const emailService = require('./workers/utils/email-service');
            await emailService.sendAlert({
                subject: `[CRITICAL] Daemon Failure: ${daemonName}`,
                message: `The daemon "${daemonName}" has failed.\n\nError: ${error.message}\n\nStack: ${error.stack}`
            });
        } catch (e) {
            console.error('Failed to send critical alert:', e.message);
        }
    }

    start() {
        console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║          ENTERPRISE UNIVERSE - DAEMON MANAGER                             ║
║          Background Process Orchestrator                                  ║
╚═══════════════════════════════════════════════════════════════════════════╝
        `);

        this.log('start', 'Manager', 'Initializing daemons...');

        // Schedule all enabled daemons
        for (const [key, daemon] of Object.entries(DAEMONS)) {
            if (!daemon.enabled) {
                this.log('warning', daemon.name, 'Disabled - skipping');
                continue;
            }

            try {
                const job = cron.schedule(daemon.schedule, async () => {
                    await this.runDaemon(key, daemon);
                }, {
                    scheduled: true,
                    timezone: 'Europe/Berlin'
                });

                this.jobs.set(key, job);
                this.log('success', daemon.name, `Scheduled: ${daemon.schedule}`);
            } catch (error) {
                this.log('error', daemon.name, `Failed to schedule: ${error.message}`);
            }
        }

        // Run health monitor immediately on start
        this.runDaemon('healthMonitor', DAEMONS.healthMonitor);

        this.log('start', 'Manager', `${this.jobs.size} daemons active`);

        // Status endpoint
        this.startStatusServer();
    }

    startStatusServer() {
        const http = require('http');
        const PORT = process.env.DAEMON_STATUS_PORT || 3099;

        const server = http.createServer((req, res) => {
            if (req.url === '/status') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'running',
                    uptime: Math.round((Date.now() - this.stats.startTime) / 1000),
                    daemons: Object.fromEntries(
                        Object.entries(DAEMONS).map(([key, daemon]) => [
                            key,
                            {
                                name: daemon.name,
                                enabled: daemon.enabled,
                                schedule: daemon.schedule,
                                runs: this.stats.runs[key] || 0,
                                errors: this.stats.errors[key] || 0
                            }
                        ])
                    )
                }, null, 2));
            } else if (req.url === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
            } else if (req.url.startsWith('/run/')) {
                const daemonKey = req.url.replace('/run/', '');
                if (DAEMONS[daemonKey]) {
                    this.runDaemon(daemonKey, DAEMONS[daemonKey]);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ triggered: daemonKey }));
                } else {
                    res.writeHead(404);
                    res.end('Daemon not found');
                }
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
        });

        server.listen(PORT, () => {
            this.log('info', 'Manager', `Status server on port ${PORT}`);
        });
    }

    stop() {
        this.log('info', 'Manager', 'Stopping all daemons...');
        for (const [key, job] of this.jobs) {
            job.stop();
            this.log('info', DAEMONS[key].name, 'Stopped');
        }
        process.exit(0);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// START MANAGER
// ═══════════════════════════════════════════════════════════════════════════

const manager = new DaemonManager();

// Handle graceful shutdown
process.on('SIGTERM', () => manager.stop());
process.on('SIGINT', () => manager.stop());

manager.start();

module.exports = DaemonManager;
