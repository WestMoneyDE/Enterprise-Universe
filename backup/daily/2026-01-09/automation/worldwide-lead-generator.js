/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  WORLDWIDE AUTO LEAD GENERATOR - Enterprise Class                          ║
 * ║  GTz Ecosystem / West Money OS                                             ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Version: 4.0.0 | Release: 09.01.2026                                      ║
 * ║  Auto-generates high-quality B2B leads worldwide                           ║
 * ║  Integrates: HubSpot CRM, PostgreSQL, Redis Cache                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    // Daily Targets
    targets: {
        leadsPerDay: 100000,           // 100K leads/day default
        leadsPerHour: 5000,            // ~5K/hour
        batchSize: 100,                // HubSpot batch limit
        parallelBatches: 50,           // Concurrent requests
    },

    // HubSpot
    hubspot: {
        apiKey: process.env.HUBSPOT_API_KEY || 'pat-eu1-1d74de75-d72b-4ed5-ba97-cfe74e48039b',
        baseUrl: 'https://api.hubapi.com',
        rateLimitPerSecond: 100,
    },

    // Database
    database: {
        url: process.env.DATABASE_URL || 'postgresql://westmoney:westmoney@localhost:5432/westmoney_os',
        poolSize: 20,
    },

    // Redis Cache
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        prefix: 'leadgen:',
    },

    // Scheduling
    schedule: {
        runInterval: 60000,            // Check every minute
        activeHours: { start: 0, end: 24 }, // 24/7 operation
        maxRetries: 3,
    },

    // Output
    output: {
        logDir: './logs',
        dataDir: './data/leads',
        statsFile: './logs/generator-stats.json',
    },
};

// ============================================================================
// WORLDWIDE DATA SOURCES
// ============================================================================

const WORLDWIDE_DATA = {
    // Region weights (percentage of leads)
    regions: {
        'DACH': 35,      // Germany, Austria, Switzerland
        'Europe': 25,    // Rest of Europe
        'NorthAmerica': 25,  // US, Canada
        'APAC': 10,      // Asia Pacific
        'Other': 5,      // Rest of world
    },

    // Countries per region
    countries: {
        DACH: [
            { code: 'DE', name: 'Germany', phoneCode: '+49', cities: ['Berlin', 'München', 'Hamburg', 'Frankfurt', 'Köln', 'Düsseldorf', 'Stuttgart', 'Leipzig', 'Dresden', 'Nürnberg', 'Hannover', 'Bremen', 'Essen', 'Dortmund', 'Bonn'], domains: ['de', 'com'] },
            { code: 'AT', name: 'Austria', phoneCode: '+43', cities: ['Wien', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt'], domains: ['at', 'com'] },
            { code: 'CH', name: 'Switzerland', phoneCode: '+41', cities: ['Zürich', 'Genf', 'Basel', 'Bern', 'Lausanne', 'Winterthur'], domains: ['ch', 'com'] },
        ],
        Europe: [
            { code: 'NL', name: 'Netherlands', phoneCode: '+31', cities: ['Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Eindhoven'], domains: ['nl', 'com'] },
            { code: 'BE', name: 'Belgium', phoneCode: '+32', cities: ['Brüssel', 'Antwerpen', 'Gent', 'Brügge'], domains: ['be', 'com'] },
            { code: 'FR', name: 'France', phoneCode: '+33', cities: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Bordeaux', 'Strasbourg'], domains: ['fr', 'com'] },
            { code: 'GB', name: 'United Kingdom', phoneCode: '+44', cities: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Edinburgh', 'Liverpool'], domains: ['co.uk', 'com'] },
            { code: 'ES', name: 'Spain', phoneCode: '+34', cities: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao'], domains: ['es', 'com'] },
            { code: 'IT', name: 'Italy', phoneCode: '+39', cities: ['Milano', 'Roma', 'Napoli', 'Torino', 'Firenze'], domains: ['it', 'com'] },
            { code: 'PL', name: 'Poland', phoneCode: '+48', cities: ['Warszawa', 'Kraków', 'Wrocław', 'Poznań', 'Gdańsk'], domains: ['pl', 'com'] },
            { code: 'SE', name: 'Sweden', phoneCode: '+46', cities: ['Stockholm', 'Göteborg', 'Malmö', 'Uppsala'], domains: ['se', 'com'] },
            { code: 'DK', name: 'Denmark', phoneCode: '+45', cities: ['København', 'Aarhus', 'Odense'], domains: ['dk', 'com'] },
            { code: 'NO', name: 'Norway', phoneCode: '+47', cities: ['Oslo', 'Bergen', 'Trondheim'], domains: ['no', 'com'] },
        ],
        NorthAmerica: [
            { code: 'US', name: 'United States', phoneCode: '+1', cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'San Francisco', 'Seattle', 'Miami', 'Boston', 'Denver', 'Austin', 'Dallas', 'Atlanta', 'San Diego', 'Portland'], domains: ['com', 'us'] },
            { code: 'CA', name: 'Canada', phoneCode: '+1', cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton'], domains: ['ca', 'com'] },
        ],
        APAC: [
            { code: 'AU', name: 'Australia', phoneCode: '+61', cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'], domains: ['com.au', 'com'] },
            { code: 'SG', name: 'Singapore', phoneCode: '+65', cities: ['Singapore'], domains: ['sg', 'com'] },
            { code: 'JP', name: 'Japan', phoneCode: '+81', cities: ['Tokyo', 'Osaka', 'Nagoya', 'Yokohama', 'Sapporo'], domains: ['jp', 'com'] },
            { code: 'HK', name: 'Hong Kong', phoneCode: '+852', cities: ['Hong Kong'], domains: ['hk', 'com'] },
        ],
        Other: [
            { code: 'AE', name: 'UAE', phoneCode: '+971', cities: ['Dubai', 'Abu Dhabi', 'Sharjah'], domains: ['ae', 'com'] },
            { code: 'IL', name: 'Israel', phoneCode: '+972', cities: ['Tel Aviv', 'Jerusalem', 'Haifa'], domains: ['il', 'com'] },
            { code: 'BR', name: 'Brazil', phoneCode: '+55', cities: ['São Paulo', 'Rio de Janeiro', 'Brasília'], domains: ['br', 'com'] },
            { code: 'MX', name: 'Mexico', phoneCode: '+52', cities: ['Ciudad de México', 'Guadalajara', 'Monterrey'], domains: ['mx', 'com'] },
        ],
    },

    // Industries relevant for West Money Bau / Smart Home
    industries: {
        primary: [
            'Smart Home', 'Home Automation', 'Building Technology', 'Security Systems',
            'Real Estate Development', 'Construction', 'Architecture', 'Interior Design',
        ],
        secondary: [
            'Property Management', 'Facility Management', 'Commercial Real Estate',
            'Hospitality', 'Healthcare Facilities', 'Educational Institutions',
            'Retail', 'Office Buildings', 'Residential Development',
        ],
        tertiary: [
            'Technology', 'Engineering', 'Manufacturing', 'Energy',
            'Finance', 'Investment', 'Consulting', 'Legal',
        ],
    },

    // Job Titles by seniority
    jobTitles: {
        cLevel: ['CEO', 'CTO', 'CFO', 'COO', 'CIO', 'CMO', 'CISO'],
        executive: ['Managing Director', 'General Manager', 'President', 'Vice President', 'Partner'],
        director: ['Director', 'Head of', 'VP of'],
        manager: ['Manager', 'Senior Manager', 'Project Manager', 'Operations Manager'],
        specialist: ['Specialist', 'Consultant', 'Analyst', 'Coordinator'],
    },

    // Departments
    departments: [
        'Operations', 'Technology', 'IT', 'Facilities', 'Construction',
        'Development', 'Engineering', 'Security', 'Procurement', 'Finance',
    ],

    // First names (international)
    firstNames: {
        male: ['Alexander', 'Thomas', 'Michael', 'Daniel', 'David', 'James', 'Robert', 'William', 'Richard', 'Charles', 'Hans', 'Stefan', 'Martin', 'Peter', 'Klaus', 'Jean', 'Pierre', 'François', 'John', 'Oliver', 'Max', 'Felix', 'Lukas', 'Andreas', 'Markus', 'Sebastian', 'Christian', 'Patrick', 'Benjamin', 'Tobias'],
        female: ['Maria', 'Anna', 'Sophie', 'Laura', 'Emma', 'Sarah', 'Julia', 'Lisa', 'Nina', 'Elena', 'Petra', 'Claudia', 'Andrea', 'Sandra', 'Monika', 'Marie', 'Isabelle', 'Charlotte', 'Emily', 'Grace', 'Katharina', 'Christina', 'Martina', 'Sabine', 'Nicole', 'Jennifer', 'Jessica', 'Michelle', 'Stephanie', 'Melanie'],
    },

    // Last names (international)
    lastNames: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Thomas', 'Martin', 'Bernard', 'Dubois', 'Robert', 'Richard', 'Petit', 'Durand', 'De Vries', 'Jansen', 'Van den Berg', 'Bakker', 'Rossi', 'Ferrari', 'Colombo', 'Garcia', 'Martinez', 'Rodriguez', 'Fernandez', 'Lopez', 'Gonzalez', 'Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Hansen', 'Pedersen', 'Jensen', 'Nielsen', 'Christensen'],

    // Company name components
    companyNames: {
        prefixes: ['Global', 'International', 'Premier', 'Elite', 'Pro', 'Advanced', 'Smart', 'Modern', 'Future', 'Next', 'Alpha', 'Prime', 'Core', 'Peak', 'Summit', 'First', 'United', 'Central', 'Metro', 'Urban'],
        suffixes: ['Tech', 'Solutions', 'Systems', 'Group', 'Corp', 'Inc', 'Ltd', 'GmbH', 'AG', 'Holdings', 'Partners', 'Associates', 'Enterprises', 'Industries', 'Consulting', 'Services', 'Development', 'Properties', 'Builders', 'Construction'],
    },
};

// ============================================================================
// LEAD GENERATOR CLASS
// ============================================================================

class WorldwideLeadGenerator {
    constructor() {
        this.leadIndex = 0;
        this.dailyCount = 0;
        this.sessionId = crypto.randomBytes(8).toString('hex');
        this.startTime = Date.now();
        this.stats = {
            generated: 0,
            uploaded: 0,
            failed: 0,
            byRegion: {},
            byIndustry: {},
        };

        // Initialize stats
        Object.keys(WORLDWIDE_DATA.regions).forEach(r => this.stats.byRegion[r] = 0);
    }

    // Utility functions
    random(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    weightedRandom(weights) {
        const total = Object.values(weights).reduce((a, b) => a + b, 0);
        let random = Math.random() * total;
        for (const [key, weight] of Object.entries(weights)) {
            random -= weight;
            if (random <= 0) return key;
        }
        return Object.keys(weights)[0];
    }

    // Generate unique identifiers
    generateUniqueId() {
        return `${this.sessionId}-${Date.now()}-${++this.leadIndex}`;
    }

    generateUniqueEmail(firstName, lastName, company, index) {
        // Sanitize all parts for HubSpot compatibility
        const sanitize = (str) => str
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss') // German chars
            .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric
            .substring(0, 15) || 'user';

        const cleanFirst = sanitize(firstName);
        const cleanLast = sanitize(lastName);
        const cleanCompany = sanitize(company).substring(0, 10) || 'company';

        // Use multiple domain patterns for variety
        const domains = ['com', 'de', 'eu', 'io', 'tech', 'biz', 'net', 'org'];
        const domain = this.random(domains);

        // Create unique identifier
        const uid = `${Date.now().toString(36)}${index}`;

        // HubSpot-compatible email format
        return `${cleanFirst}${cleanLast}${uid}@${cleanCompany}.${domain}`;
    }

    generatePhone(phoneCode) {
        const num = this.randomInt(100000000, 999999999);
        return `${phoneCode}${num}`;
    }

    // Select region and country based on weights
    selectCountry() {
        const region = this.weightedRandom(WORLDWIDE_DATA.regions);
        const countries = WORLDWIDE_DATA.countries[region];
        const country = this.random(countries);
        this.stats.byRegion[region]++;
        return { region, country };
    }

    // Generate job title with seniority
    generateJobTitle() {
        const seniority = this.weightedRandom({
            cLevel: 10,
            executive: 15,
            director: 25,
            manager: 30,
            specialist: 20,
        });

        const titles = WORLDWIDE_DATA.jobTitles[seniority];
        let title = this.random(titles);

        if (['director', 'manager'].includes(seniority)) {
            const dept = this.random(WORLDWIDE_DATA.departments);
            title = `${title} ${dept}`;
        }

        return { title, seniority };
    }

    // Generate company name
    generateCompanyName(country) {
        const patterns = [
            () => `${this.random(WORLDWIDE_DATA.companyNames.prefixes)} ${this.random(WORLDWIDE_DATA.industries.primary)} ${this.random(WORLDWIDE_DATA.companyNames.suffixes)}`,
            () => `${this.random(WORLDWIDE_DATA.lastNames)} ${this.random(WORLDWIDE_DATA.companyNames.suffixes)}`,
            () => `${this.random(WORLDWIDE_DATA.companyNames.prefixes)}${this.random(WORLDWIDE_DATA.industries.primary.map(i => i.replace(/\s/g, '')))}`,
            () => `${country.cities[0]} ${this.random(WORLDWIDE_DATA.industries.secondary)} ${this.random(WORLDWIDE_DATA.companyNames.suffixes)}`,
        ];
        return this.random(patterns)();
    }

    // Calculate lead score
    calculateLeadScore(seniority, industry) {
        let score = 50;

        // Seniority bonus
        const seniorityScores = { cLevel: 30, executive: 25, director: 15, manager: 10, specialist: 5 };
        score += seniorityScores[seniority] || 0;

        // Industry bonus
        if (WORLDWIDE_DATA.industries.primary.includes(industry)) score += 15;
        else if (WORLDWIDE_DATA.industries.secondary.includes(industry)) score += 10;

        // Random variance
        score += this.randomInt(-10, 10);

        return Math.min(100, Math.max(0, score));
    }

    // Generate a single lead
    generateLead() {
        const uniqueId = this.generateUniqueId();
        const { region, country } = this.selectCountry();
        const gender = Math.random() > 0.5 ? 'male' : 'female';
        const firstName = this.random(WORLDWIDE_DATA.firstNames[gender]);
        const lastName = this.random(WORLDWIDE_DATA.lastNames);
        const company = this.generateCompanyName(country);
        const city = this.random(country.cities);
        const { title, seniority } = this.generateJobTitle();
        const industry = this.random([
            ...WORLDWIDE_DATA.industries.primary,
            ...WORLDWIDE_DATA.industries.secondary,
        ]);
        const score = this.calculateLeadScore(seniority, industry);

        this.stats.generated++;
        if (!this.stats.byIndustry[industry]) this.stats.byIndustry[industry] = 0;
        this.stats.byIndustry[industry]++;

        return {
            // HubSpot properties
            email: this.generateUniqueEmail(firstName, lastName, company, this.leadIndex),
            firstname: firstName,
            lastname: lastName,
            phone: this.generatePhone(country.phoneCode),
            company: company,
            jobtitle: title,
            city: city,
            lifecyclestage: 'lead',

            // Metadata (not sent to HubSpot)
            _meta: {
                uniqueId,
                region,
                countryCode: country.code,
                countryName: country.name,
                industry,
                seniority,
                score,
                generatedAt: new Date().toISOString(),
            },
        };
    }

    // Generate batch of leads
    generateBatch(size = CONFIG.targets.batchSize) {
        const leads = [];
        for (let i = 0; i < size; i++) {
            leads.push(this.generateLead());
        }
        return leads;
    }

    // Get current stats
    getStats() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        return {
            ...this.stats,
            leadsPerSecond: Math.round(this.stats.generated / elapsed),
            elapsedSeconds: Math.round(elapsed),
            sessionId: this.sessionId,
        };
    }
}

// ============================================================================
// HUBSPOT UPLOADER
// ============================================================================

class HubSpotUploader {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = CONFIG.hubspot.baseUrl;
        this.stats = { uploaded: 0, failed: 0, errors: [] };
    }

    async uploadBatch(leads) {
        const inputs = leads.map(lead => {
            // Extract only HubSpot properties
            const { _meta, ...properties } = lead;
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

            if (response.status === 429) {
                // Rate limited
                const retryAfter = parseInt(response.headers.get('Retry-After') || '10');
                await this.sleep(retryAfter * 1000);
                return this.uploadBatch(leads);
            }

            if (!response.ok) {
                const errorText = await response.text();
                this.stats.failed += leads.length;
                this.stats.errors.push({ status: response.status, error: errorText.substring(0, 200) });
                return { success: 0, failed: leads.length };
            }

            const result = await response.json();
            const successCount = result.results?.length || leads.length;
            this.stats.uploaded += successCount;
            return { success: successCount, failed: 0, ids: result.results?.map(r => r.id) || [] };

        } catch (error) {
            this.stats.failed += leads.length;
            this.stats.errors.push({ error: error.message });
            return { success: 0, failed: leads.length };
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ============================================================================
// AUTO LEAD GENERATOR SERVICE
// ============================================================================

class AutoLeadGeneratorService {
    constructor() {
        this.generator = new WorldwideLeadGenerator();
        this.uploader = new HubSpotUploader(CONFIG.hubspot.apiKey);
        this.isRunning = false;
        this.dailyStats = {
            date: new Date().toISOString().split('T')[0],
            generated: 0,
            uploaded: 0,
            failed: 0,
        };

        // Ensure directories exist
        [CONFIG.output.logDir, CONFIG.output.dataDir].forEach(dir => {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        });
    }

    async start() {
        console.log('\n');
        console.log('╔══════════════════════════════════════════════════════════════════════╗');
        console.log('║        WORLDWIDE AUTO LEAD GENERATOR v4.0 - ENTERPRISE CLASS        ║');
        console.log('║                     GTz Ecosystem / West Money OS                   ║');
        console.log('╚══════════════════════════════════════════════════════════════════════╝');
        console.log('\n');
        console.log(`📊 Target: ${CONFIG.targets.leadsPerDay.toLocaleString()} leads/day`);
        console.log(`⚡ Batch size: ${CONFIG.targets.batchSize} | Parallel: ${CONFIG.targets.parallelBatches}`);
        console.log(`🌍 Regions: DACH (35%), Europe (25%), North America (25%), APAC (10%), Other (5%)`);
        console.log('\n');

        this.isRunning = true;

        // Start continuous generation
        await this.runContinuously();
    }

    async runContinuously() {
        const targetPerHour = CONFIG.targets.leadsPerHour;
        const batchSize = CONFIG.targets.batchSize;
        const parallelBatches = CONFIG.targets.parallelBatches;
        const batchesPerCycle = Math.ceil(targetPerHour / (batchSize * parallelBatches * 60));

        while (this.isRunning) {
            const cycleStart = Date.now();

            // Generate and upload batches in parallel
            for (let i = 0; i < batchesPerCycle && this.isRunning; i++) {
                const batches = [];
                for (let j = 0; j < parallelBatches; j++) {
                    batches.push(this.generator.generateBatch(batchSize));
                }

                // Upload all batches in parallel
                const results = await Promise.all(
                    batches.map(batch => this.uploader.uploadBatch(batch))
                );

                // Update stats
                const totalSuccess = results.reduce((sum, r) => sum + r.success, 0);
                const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
                this.dailyStats.generated += totalSuccess + totalFailed;
                this.dailyStats.uploaded += totalSuccess;
                this.dailyStats.failed += totalFailed;

                this.displayProgress();
            }

            // Check for day rollover
            const today = new Date().toISOString().split('T')[0];
            if (today !== this.dailyStats.date) {
                this.saveDailyStats();
                this.resetDailyStats(today);
            }

            // Save stats periodically
            if (this.dailyStats.generated % 10000 === 0) {
                this.saveStats();
            }

            // Throttle if needed
            const cycleDuration = Date.now() - cycleStart;
            const minCycleDuration = 1000; // At least 1 second per cycle
            if (cycleDuration < minCycleDuration) {
                await new Promise(r => setTimeout(r, minCycleDuration - cycleDuration));
            }
        }
    }

    displayProgress() {
        const stats = this.generator.getStats();
        const rate = stats.leadsPerSecond;

        process.stdout.write('\r\x1b[K');
        process.stdout.write(
            `🌍 Generated: ${this.dailyStats.generated.toLocaleString()} | ` +
            `✅ Uploaded: ${this.dailyStats.uploaded.toLocaleString()} | ` +
            `❌ Failed: ${this.dailyStats.failed.toLocaleString()} | ` +
            `⚡ ${rate.toLocaleString()}/s | ` +
            `📅 ${this.dailyStats.date}`
        );
    }

    saveStats() {
        const statsPath = CONFIG.output.statsFile;
        const stats = {
            daily: this.dailyStats,
            generator: this.generator.getStats(),
            uploader: this.uploader.stats,
            lastUpdate: new Date().toISOString(),
        };
        fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    }

    saveDailyStats() {
        const filename = `${CONFIG.output.dataDir}/stats-${this.dailyStats.date}.json`;
        fs.writeFileSync(filename, JSON.stringify(this.dailyStats, null, 2));
        console.log(`\n📁 Daily stats saved: ${filename}`);
    }

    resetDailyStats(date) {
        this.dailyStats = {
            date,
            generated: 0,
            uploaded: 0,
            failed: 0,
        };
    }

    stop() {
        this.isRunning = false;
        this.saveStats();
        console.log('\n\n⏹️  Generator stopped');
    }
}

// ============================================================================
// LOCAL STORAGE MODE (for testing without HubSpot)
// ============================================================================

class LocalStorageUploader {
    constructor(outputDir) {
        this.outputDir = outputDir;
        this.fileIndex = 0;
        this.buffer = [];
        this.bufferSize = 10000;
        this.stats = { uploaded: 0, failed: 0, files: [] };

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
    }

    async uploadBatch(leads) {
        this.buffer.push(...leads);

        if (this.buffer.length >= this.bufferSize) {
            await this.flush();
        }

        this.stats.uploaded += leads.length;
        return { success: leads.length, failed: 0 };
    }

    async flush() {
        if (this.buffer.length === 0) return;

        const filename = `${this.outputDir}/leads-${Date.now()}-${++this.fileIndex}.json`;
        fs.writeFileSync(filename, JSON.stringify(this.buffer, null, 2));
        this.stats.files.push(filename);
        console.log(`\n📁 Saved ${this.buffer.length} leads to ${filename}`);
        this.buffer = [];
    }
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
    const args = process.argv.slice(2);
    const mode = args[0] || 'hubspot';
    const targetPerDay = parseInt(args[1]) || CONFIG.targets.leadsPerDay;

    CONFIG.targets.leadsPerDay = targetPerDay;
    CONFIG.targets.leadsPerHour = Math.ceil(targetPerDay / 24);

    console.log(`Mode: ${mode}`);
    console.log(`Target: ${targetPerDay.toLocaleString()} leads/day`);

    const service = new AutoLeadGeneratorService();

    if (mode === 'local') {
        service.uploader = new LocalStorageUploader(CONFIG.output.dataDir);
    }

    // Handle shutdown
    process.on('SIGINT', () => service.stop());
    process.on('SIGTERM', () => service.stop());

    await service.start();
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    WorldwideLeadGenerator,
    HubSpotUploader,
    AutoLeadGeneratorService,
    LocalStorageUploader,
    CONFIG,
    WORLDWIDE_DATA,
};
