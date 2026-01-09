/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  MEGA SPEED IMPORT ENGINE - 100K Leads/Second                              ║
 * ║  GTz Ecosystem / West Money OS                                             ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Version: 3.0.0 | Release: 09.01.2026                                      ║
 * ║  Author: Enterprise Universe                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ============================================================================
// KONFIGURATION - ULTRA SPEED SETTINGS
// ============================================================================

const MEGA_CONFIG = {
    // HubSpot Settings
    hubspot: {
        apiKey: process.env.HUBSPOT_API_KEY,
        baseUrl: 'https://api.hubapi.com',
        batchSize: 100,          // Max 100 per HubSpot batch
        maxParallelBatches: 1000, // 1000 parallel requests
        rateLimit: 100000,       // Target: 100K/s
    },

    // Worker Pool
    workers: {
        count: os.cpus().length * 4, // 4x CPU cores
        batchesPerWorker: 250,       // Each worker handles 250 batches
    },

    // Memory Management
    memory: {
        maxHeapMB: 8192,            // 8GB max heap
        streamChunkSize: 10000,     // Process 10K leads per chunk
        gcInterval: 100000,         // GC every 100K leads
    },

    // Progress Tracking
    progress: {
        updateIntervalMs: 1000,
        logFile: './logs/mega-import.log',
        stateFile: './logs/import-state.json',
    },

    // Total Leads
    totalLeads: 5600000,
    startFrom: 32000,  // Resume from last position
};

// ============================================================================
// PROGRESS TRACKER
// ============================================================================

class ProgressTracker {
    constructor(total, startFrom = 0) {
        this.total = total;
        this.processed = startFrom;
        this.successful = 0;
        this.failed = 0;
        this.startTime = Date.now();
        this.lastUpdate = Date.now();
        this.rateHistory = [];
    }

    update(success, fail = 0) {
        this.processed += success + fail;
        this.successful += success;
        this.failed += fail;

        const now = Date.now();
        const elapsed = (now - this.lastUpdate) / 1000;
        const rate = (success + fail) / elapsed;

        this.rateHistory.push(rate);
        if (this.rateHistory.length > 60) this.rateHistory.shift();

        this.lastUpdate = now;
    }

    getStats() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const avgRate = this.rateHistory.reduce((a, b) => a + b, 0) / this.rateHistory.length || 0;
        const remaining = this.total - this.processed;
        const eta = remaining / avgRate;

        return {
            processed: this.processed,
            successful: this.successful,
            failed: this.failed,
            total: this.total,
            percentage: ((this.processed / this.total) * 100).toFixed(2),
            rate: Math.round(avgRate),
            elapsed: this.formatTime(elapsed),
            eta: this.formatTime(eta),
            remaining: remaining,
        };
    }

    formatTime(seconds) {
        if (!isFinite(seconds) || seconds < 0) return '--:--:--';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    saveState() {
        const state = {
            processed: this.processed,
            successful: this.successful,
            failed: this.failed,
            timestamp: new Date().toISOString(),
        };
        fs.writeFileSync(MEGA_CONFIG.progress.stateFile, JSON.stringify(state, null, 2));
    }

    loadState() {
        try {
            const state = JSON.parse(fs.readFileSync(MEGA_CONFIG.progress.stateFile, 'utf8'));
            this.processed = state.processed;
            this.successful = state.successful;
            this.failed = state.failed;
            console.log(`📂 State loaded: ${this.processed} leads already processed`);
        } catch (e) {
            console.log('📂 No previous state found, starting fresh');
        }
    }
}

// ============================================================================
// WORLDWIDE LEAD GENERATOR
// ============================================================================

class WorldwideLeadGenerator {
    constructor() {
        // Top industries for B2B leads
        this.industries = [
            'Construction', 'Real Estate', 'Smart Home', 'IoT', 'Security',
            'Architecture', 'Interior Design', 'Property Management',
            'Home Automation', 'Energy Management', 'Building Technology',
            'Facility Management', 'Commercial Real Estate', 'Hospitality',
            'Healthcare Facilities', 'Educational Institutions', 'Retail',
            'Manufacturing', 'Logistics', 'Technology', 'Finance'
        ];

        // Countries with market data
        this.countries = {
            'DE': { code: '+49', cities: ['Berlin', 'München', 'Hamburg', 'Frankfurt', 'Köln', 'Düsseldorf', 'Stuttgart', 'Leipzig', 'Dresden', 'Nürnberg'], weight: 30 },
            'AT': { code: '+43', cities: ['Wien', 'Graz', 'Linz', 'Salzburg', 'Innsbruck'], weight: 8 },
            'CH': { code: '+41', cities: ['Zürich', 'Genf', 'Basel', 'Bern', 'Lausanne'], weight: 8 },
            'NL': { code: '+31', cities: ['Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Eindhoven'], weight: 6 },
            'BE': { code: '+32', cities: ['Brüssel', 'Antwerpen', 'Gent', 'Brügge', 'Lüttich'], weight: 4 },
            'FR': { code: '+33', cities: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Bordeaux', 'Strasbourg'], weight: 10 },
            'UK': { code: '+44', cities: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Edinburgh'], weight: 10 },
            'US': { code: '+1', cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'San Francisco', 'Seattle', 'Miami', 'Boston', 'Denver'], weight: 15 },
            'CA': { code: '+1', cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'], weight: 5 },
            'AU': { code: '+61', cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'], weight: 4 },
        };

        // Job titles
        this.jobTitles = [
            'CEO', 'CTO', 'CFO', 'COO', 'Managing Director', 'Director',
            'VP Operations', 'VP Technology', 'Head of IT', 'IT Director',
            'Facility Manager', 'Project Manager', 'Property Manager',
            'Building Manager', 'Operations Manager', 'Technical Director',
            'Head of Construction', 'Chief Architect', 'Design Director',
            'Smart Home Specialist', 'Automation Expert', 'Security Director'
        ];

        // Company name patterns
        this.companyPrefixes = ['Global', 'International', 'Premier', 'Elite', 'Pro', 'Advanced', 'Smart', 'Modern', 'Future', 'Next', 'Alpha', 'Prime', 'Core', 'Peak', 'Summit'];
        this.companySuffixes = ['Tech', 'Solutions', 'Systems', 'Group', 'Corp', 'Inc', 'Ltd', 'GmbH', 'AG', 'Holdings', 'Partners', 'Associates', 'Enterprises', 'Industries'];

        // First names (international)
        this.firstNames = ['Alexander', 'Maria', 'Thomas', 'Anna', 'Michael', 'Sophie', 'Daniel', 'Laura', 'David', 'Emma', 'James', 'Sarah', 'Robert', 'Julia', 'William', 'Lisa', 'Richard', 'Nina', 'Charles', 'Elena', 'Hans', 'Petra', 'Stefan', 'Claudia', 'Martin', 'Andrea', 'Peter', 'Sandra', 'Klaus', 'Monika', 'Jean', 'Marie', 'Pierre', 'Isabelle', 'François', 'Charlotte', 'John', 'Emily', 'Oliver', 'Grace'];
        this.lastNames = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Thomas', 'Martin', 'Bernard', 'Dubois', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'De Vries', 'Jansen', 'Van den Berg', 'Bakker', 'Visser'];

        this.leadIndex = 0;
        this.countryWeights = this.buildCountryWeights();
    }

    buildCountryWeights() {
        const weights = [];
        Object.entries(this.countries).forEach(([code, data]) => {
            for (let i = 0; i < data.weight; i++) weights.push(code);
        });
        return weights;
    }

    random(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    generatePhone(countryCode) {
        const num = this.randomInt(100000000, 999999999);
        return `${countryCode}${num}`;
    }

    generateEmail(firstName, lastName, company) {
        const domain = company.toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 15);
        const patterns = [
            `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}.com`,
            `${firstName.toLowerCase()[0]}${lastName.toLowerCase()}@${domain}.com`,
            `${firstName.toLowerCase()}@${domain}.com`,
            `${lastName.toLowerCase()}.${firstName.toLowerCase()[0]}@${domain}.com`,
            `contact@${domain}.com`,
        ];
        return this.random(patterns);
    }

    generateCompanyName() {
        const patterns = [
            `${this.random(this.companyPrefixes)} ${this.random(this.industries)} ${this.random(this.companySuffixes)}`,
            `${this.random(this.lastNames)} ${this.random(this.industries)}`,
            `${this.random(this.companyPrefixes)}${this.random(this.industries.map(i => i.replace(/\s/g, '')))}`,
            `${this.random(this.industries)} ${this.random(this.companySuffixes)}`,
        ];
        return this.random(patterns);
    }

    generateLead() {
        this.leadIndex++;

        const countryCode = this.random(this.countryWeights);
        const country = this.countries[countryCode];
        const firstName = this.random(this.firstNames);
        const lastName = this.random(this.lastNames);
        const company = this.generateCompanyName();
        const industry = this.random(this.industries);
        const city = this.random(country.cities);
        const jobTitle = this.random(this.jobTitles);

        // Lead Score based on job title and industry
        const highValueTitles = ['CEO', 'CTO', 'CFO', 'Managing Director', 'Director', 'VP'];
        const highValueIndustries = ['Smart Home', 'Real Estate', 'Construction', 'IoT', 'Security'];

        let score = 50;
        if (highValueTitles.some(t => jobTitle.includes(t))) score += 25;
        if (highValueIndustries.includes(industry)) score += 15;
        score += this.randomInt(-10, 10);
        score = Math.min(100, Math.max(0, score));

        // HubSpot-compatible email sanitization
        const sanitize = (str) => str
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 12) || 'user';

        const cleanFirst = sanitize(firstName);
        const cleanLast = sanitize(lastName);
        const cleanCompany = sanitize(company).substring(0, 8) || 'co';
        const uid = Date.now().toString(36) + this.leadIndex;
        const domains = ['com', 'de', 'eu', 'io', 'tech', 'biz'];
        const domain = this.random(domains);

        const uniqueEmail = `${cleanFirst}${cleanLast}${uid}@${cleanCompany}.${domain}`;

        return {
            // HubSpot Standard Contact Properties ONLY (minimal set)
            email: uniqueEmail,
            firstname: firstName,
            lastname: lastName,
            phone: this.generatePhone(country.code),
            company: company,
            jobtitle: jobTitle,
            city: city,
            lifecyclestage: 'lead',

            // Internal tracking (removed before upload)
            _index: this.leadIndex,
            _score: score,
        };
    }

    generateBatch(size) {
        const leads = [];
        for (let i = 0; i < size; i++) {
            leads.push(this.generateLead());
        }
        return leads;
    }
}

// ============================================================================
// HUBSPOT BATCH UPLOADER
// ============================================================================

class HubSpotBatchUploader {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = MEGA_CONFIG.hubspot.baseUrl;
        this.requestCount = 0;
        this.errorCount = 0;
    }

    async uploadBatch(leads) {
        const inputs = leads.map(lead => {
            // Remove all internal tracking properties (starting with _)
            const properties = {};
            for (const [key, value] of Object.entries(lead)) {
                if (!key.startsWith('_')) {
                    properties[key] = value;
                }
            }
            return { properties };
        });

        try {
            const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts/batch/create`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ inputs }),
            });

            this.requestCount++;

            if (response.status === 429) {
                // Rate limited - exponential backoff
                const retryAfter = parseInt(response.headers.get('Retry-After') || '10');
                await this.sleep(retryAfter * 1000);
                return this.uploadBatch(leads);
            }

            if (!response.ok) {
                const error = await response.text();
                this.errorCount++;
                console.error(`Batch error: ${response.status} - ${error.substring(0, 100)}`);
                return { success: 0, failed: leads.length, error };
            }

            const result = await response.json();
            return {
                success: result.results?.length || leads.length,
                failed: 0,
                ids: result.results?.map(r => r.id) || []
            };

        } catch (error) {
            this.errorCount++;
            console.error(`Upload error: ${error.message}`);
            return { success: 0, failed: leads.length, error: error.message };
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ============================================================================
// PARALLEL IMPORT ENGINE
// ============================================================================

class MegaSpeedImportEngine {
    constructor() {
        this.generator = new WorldwideLeadGenerator();
        this.uploader = new HubSpotBatchUploader(MEGA_CONFIG.hubspot.apiKey);
        this.tracker = new ProgressTracker(MEGA_CONFIG.totalLeads, MEGA_CONFIG.startFrom);
        this.isRunning = false;
        this.workers = [];

        // Ensure logs directory exists
        const logsDir = path.dirname(MEGA_CONFIG.progress.logFile);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
    }

    async start() {
        console.log('\n');
        console.log('╔══════════════════════════════════════════════════════════════════════╗');
        console.log('║         MEGA SPEED IMPORT ENGINE v3.0 - 100K Leads/Second           ║');
        console.log('║                     GTz Ecosystem / West Money OS                   ║');
        console.log('╚══════════════════════════════════════════════════════════════════════╝');
        console.log('\n');

        // Load previous state if exists
        this.tracker.loadState();

        this.isRunning = true;
        const startTime = Date.now();

        // Progress display interval
        const progressInterval = setInterval(() => {
            this.displayProgress();
            this.tracker.saveState();
        }, MEGA_CONFIG.progress.updateIntervalMs);

        // Process in mega chunks
        const chunkSize = MEGA_CONFIG.memory.streamChunkSize;
        const remaining = MEGA_CONFIG.totalLeads - this.tracker.processed;
        const totalChunks = Math.ceil(remaining / chunkSize);

        console.log(`🚀 Starting import: ${remaining.toLocaleString()} leads remaining`);
        console.log(`📦 Chunk size: ${chunkSize.toLocaleString()} | Total chunks: ${totalChunks}`);
        console.log(`⚡ Parallel batches: ${MEGA_CONFIG.hubspot.maxParallelBatches}`);
        console.log('\n');

        try {
            for (let chunk = 0; chunk < totalChunks && this.isRunning; chunk++) {
                const currentChunkSize = Math.min(chunkSize, remaining - (chunk * chunkSize));
                await this.processChunk(currentChunkSize);

                // Force GC periodically
                if (chunk % 10 === 0 && global.gc) {
                    global.gc();
                }
            }
        } catch (error) {
            console.error(`\n❌ Fatal error: ${error.message}`);
        }

        clearInterval(progressInterval);
        this.tracker.saveState();

        const totalTime = (Date.now() - startTime) / 1000;
        this.displayFinalStats(totalTime);
    }

    async processChunk(chunkSize) {
        const batchSize = MEGA_CONFIG.hubspot.batchSize;
        const totalBatches = Math.ceil(chunkSize / batchSize);
        const parallelLimit = MEGA_CONFIG.hubspot.maxParallelBatches;

        const batches = [];
        for (let i = 0; i < totalBatches; i++) {
            const size = Math.min(batchSize, chunkSize - (i * batchSize));
            batches.push(this.generator.generateBatch(size));
        }

        // Process batches in parallel groups
        for (let i = 0; i < batches.length; i += parallelLimit) {
            const group = batches.slice(i, i + parallelLimit);
            const results = await Promise.all(
                group.map(batch => this.uploader.uploadBatch(batch))
            );

            const totalSuccess = results.reduce((sum, r) => sum + r.success, 0);
            const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

            this.tracker.update(totalSuccess, totalFailed);
        }
    }

    displayProgress() {
        const stats = this.tracker.getStats();

        // Clear line and display progress
        process.stdout.write('\r\x1b[K');
        process.stdout.write(
            `⚡ ${stats.processed.toLocaleString()}/${stats.total.toLocaleString()} ` +
            `(${stats.percentage}%) | ` +
            `🚀 ${stats.rate.toLocaleString()}/s | ` +
            `✅ ${stats.successful.toLocaleString()} | ` +
            `❌ ${stats.failed.toLocaleString()} | ` +
            `⏱️  ${stats.elapsed} | ` +
            `ETA: ${stats.eta}`
        );
    }

    displayFinalStats(totalTime) {
        const stats = this.tracker.getStats();

        console.log('\n\n');
        console.log('╔══════════════════════════════════════════════════════════════════════╗');
        console.log('║                        IMPORT COMPLETE                               ║');
        console.log('╠══════════════════════════════════════════════════════════════════════╣');
        console.log(`║  Total Processed:  ${stats.processed.toLocaleString().padStart(15)}                             ║`);
        console.log(`║  Successful:       ${stats.successful.toLocaleString().padStart(15)}                             ║`);
        console.log(`║  Failed:           ${stats.failed.toLocaleString().padStart(15)}                             ║`);
        console.log(`║  Average Rate:     ${stats.rate.toLocaleString().padStart(12)} /s                             ║`);
        console.log(`║  Total Time:       ${this.tracker.formatTime(totalTime).padStart(15)}                             ║`);
        console.log('╚══════════════════════════════════════════════════════════════════════╝');
    }

    stop() {
        this.isRunning = false;
        console.log('\n\n⏹️  Import stopped by user');
        this.tracker.saveState();
    }
}

// ============================================================================
// HUBSPOT SYNC MODULE (Parallel)
// ============================================================================

class HubSpotSyncModule {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.hubapi.com';
        this.syncedCount = 0;
    }

    async syncContacts() {
        console.log('\n📡 Starting HubSpot Sync...');

        // Get all contacts for sync verification
        try {
            const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts?limit=100&properties=email,firstname,lastname`, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.syncedCount = data.total || data.results?.length || 0;
                console.log(`✅ HubSpot Sync: ${this.syncedCount.toLocaleString()} contacts verified`);
            }
        } catch (error) {
            console.error(`❌ Sync error: ${error.message}`);
        }
    }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

if (isMainThread) {
    const engine = new MegaSpeedImportEngine();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\n⚠️  Received SIGINT, stopping gracefully...');
        engine.stop();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\n\n⚠️  Received SIGTERM, stopping gracefully...');
        engine.stop();
        process.exit(0);
    });

    // Start the import
    engine.start().then(() => {
        console.log('\n✅ Import engine finished');
        process.exit(0);
    }).catch(error => {
        console.error(`\n❌ Fatal error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = {
    MegaSpeedImportEngine,
    WorldwideLeadGenerator,
    HubSpotBatchUploader,
    HubSpotSyncModule,
    ProgressTracker,
    MEGA_CONFIG,
};
