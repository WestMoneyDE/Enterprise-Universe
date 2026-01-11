/**
 * WEST MONEY BAU - Express API Server
 * PropTech Platform Backend
 * Port: 3016
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Integrations
const integrations = require('./integrations');
const { hubspot, stripe, whatsapp, loxone, email: emailService } = integrations;

const app = express();
const PORT = process.env.BAU_PORT || 3016;

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://westmoney:westmoney@localhost:5433/westmoney_os'
});

// Test database connection
pool.query('SELECT NOW()')
    .then(() => console.log('[DB] PostgreSQL connected'))
    .catch(err => console.error('[DB] Connection error:', err.message));

// Trust proxy for nginx
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "wss:", "https:"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
const allowedOrigins = [
    'https://west-money-bau.de',
    'https://www.west-money-bau.de',
    'https://enterprise-universe.one',
    'http://localhost:3016'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/', apiLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/dashboard', express.static(path.join(__dirname, '../frontend/dashboard')));
app.use('/portal', express.static(path.join(__dirname, '../frontend/portal')));

console.log(`
====================================================
    WEST MONEY BAU - PropTech Platform API
    Version: 1.0.0
    Port: ${PORT}
====================================================
`);

// ═══════════════════════════════════════════════════════════════
// HEALTH & STATUS ENDPOINTS
// ═══════════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'West Money Bau API',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/stats', async (req, res) => {
    try {
        const [projects, customers, subcontractors, revenue, applications] = await Promise.all([
            pool.query('SELECT COUNT(*) as total, SUM(CASE WHEN status = $1 THEN 1 ELSE 0 END) as active FROM bau.projects', ['in_progress']),
            pool.query('SELECT COUNT(*) as total FROM bau.customers'),
            pool.query('SELECT COUNT(*) as total, SUM(CASE WHEN status = $1 THEN 1 ELSE 0 END) as approved FROM bau.subcontractors', ['approved']),
            pool.query(`SELECT COALESCE(SUM(amount), 0) as monthly
                        FROM bau.payments
                        WHERE payment_type = 'customer_invoice'
                        AND status = 'paid'
                        AND paid_at >= date_trunc('month', CURRENT_DATE)`),
            pool.query('SELECT COUNT(*) as pending FROM bau.subcontractor_applications WHERE status IN ($1, $2)', ['new', 'reviewing'])
        ]);

        res.json({
            projects: {
                total: parseInt(projects.rows[0]?.total || 0),
                active: parseInt(projects.rows[0]?.active || 0)
            },
            customers: {
                total: parseInt(customers.rows[0]?.total || 0)
            },
            subcontractors: {
                total: parseInt(subcontractors.rows[0]?.total || 0),
                approved: parseInt(subcontractors.rows[0]?.approved || 0)
            },
            applications: {
                pending: parseInt(applications.rows[0]?.pending || 0)
            },
            revenue: {
                monthly: parseFloat(revenue.rows[0]?.monthly || 0)
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// PROJECTS API
// ═══════════════════════════════════════════════════════════════

// Create project inquiry (public)
app.post('/api/projects/inquiry', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, projectType, message } = req.body;

        // Create or find customer
        let customer = await pool.query(
            'SELECT id FROM bau.customers WHERE email = $1',
            [email]
        );

        if (customer.rows.length === 0) {
            customer = await pool.query(
                `INSERT INTO bau.customers (email, first_name, last_name, phone)
                 VALUES ($1, $2, $3, $4) RETURNING id`,
                [email, firstName, lastName, phone]
            );
        }

        const customerId = customer.rows[0].id;

        // Create project
        const project = await pool.query(
            `INSERT INTO bau.projects (customer_id, title, description, project_type, status)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [customerId, `Anfrage von ${firstName} ${lastName}`, message, projectType, 'inquiry']
        );

        // Log activity
        await pool.query(
            `INSERT INTO bau.activity_log (entity_type, entity_id, action, actor_type, description)
             VALUES ($1, $2, $3, $4, $5)`,
            ['project', project.rows[0].id, 'created', 'customer', 'Neue Projektanfrage eingegangen']
        );

        // Async integrations (don't block response)
        (async () => {
            try {
                // Create HubSpot contact and deal
                const contact = await hubspot.upsertContact({
                    email, firstName, lastName, phone, source: 'website_inquiry'
                });
                await hubspot.createProjectDeal({
                    title: `Anfrage: ${projectType} - ${firstName} ${lastName}`,
                    projectType,
                    description: message,
                    source: 'website'
                }, contact.id);
                console.log('[HubSpot] Contact and deal created for:', email);
            } catch (err) {
                console.error('[HubSpot] Integration error:', err.message);
            }

            try {
                // Send WhatsApp confirmation if phone provided
                if (phone) {
                    await whatsapp.notifyProjectInquiryReceived(phone, firstName, project.rows[0].project_number);
                    console.log('[WhatsApp] Confirmation sent to:', phone);
                }
            } catch (err) {
                console.error('[WhatsApp] Integration error:', err.message);
            }
        })();

        res.status(201).json({
            success: true,
            message: 'Projektanfrage erfolgreich erstellt',
            projectNumber: project.rows[0].project_number
        });
    } catch (error) {
        console.error('[Projects] Inquiry error:', error);
        res.status(500).json({ error: 'Fehler beim Erstellen der Anfrage' });
    }
});

// Get all projects (admin)
app.get('/api/projects', async (req, res) => {
    try {
        const { status, type, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT p.*, c.first_name, c.last_name, c.email, c.company
            FROM bau.projects p
            LEFT JOIN bau.customers c ON p.customer_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            params.push(status);
            query += ` AND p.status = $${params.length}`;
        }

        if (type) {
            params.push(type);
            query += ` AND p.project_type = $${params.length}`;
        }

        query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        res.json({
            total: result.rowCount,
            projects: result.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get project by ID
app.get('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const project = await pool.query(
            `SELECT p.*, c.first_name, c.last_name, c.email, c.phone, c.company
             FROM bau.projects p
             LEFT JOIN bau.customers c ON p.customer_id = c.id
             WHERE p.id = $1`,
            [id]
        );

        if (project.rows.length === 0) {
            return res.status(404).json({ error: 'Projekt nicht gefunden' });
        }

        // Get assignments
        const assignments = await pool.query(
            `SELECT pa.*, s.first_name, s.last_name, s.company_name, s.email
             FROM bau.project_assignments pa
             LEFT JOIN bau.subcontractors s ON pa.subcontractor_id = s.id
             WHERE pa.project_id = $1`,
            [id]
        );

        // Get activity log
        const activities = await pool.query(
            `SELECT * FROM bau.activity_log
             WHERE entity_type = 'project' AND entity_id = $1
             ORDER BY created_at DESC LIMIT 20`,
            [id]
        );

        res.json({
            ...project.rows[0],
            assignments: assignments.rows,
            activities: activities.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update project
app.patch('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const allowedFields = ['title', 'description', 'status', 'project_type', 'estimated_value', 'start_date', 'end_date', 'priority', 'assigned_manager'];
        const setClause = [];
        const values = [];

        Object.keys(updates).forEach((key, index) => {
            if (allowedFields.includes(key)) {
                setClause.push(`${key} = $${index + 1}`);
                values.push(updates[key]);
            }
        });

        if (setClause.length === 0) {
            return res.status(400).json({ error: 'Keine gueltigen Felder zum Aktualisieren' });
        }

        values.push(id);
        const query = `UPDATE bau.projects SET ${setClause.join(', ')} WHERE id = $${values.length} RETURNING *`;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Projekt nicht gefunden' });
        }

        res.json({ success: true, project: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// CUSTOMERS API
// ═══════════════════════════════════════════════════════════════

app.get('/api/customers', async (req, res) => {
    try {
        const { limit = 50, offset = 0, search } = req.query;

        let query = 'SELECT * FROM bau.customers WHERE 1=1';
        const params = [];

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (email ILIKE $${params.length} OR first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR company ILIKE $${params.length})`;
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        res.json({
            total: result.rowCount,
            customers: result.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/customers/:id', async (req, res) => {
    try {
        const customer = await pool.query('SELECT * FROM bau.customers WHERE id = $1', [req.params.id]);

        if (customer.rows.length === 0) {
            return res.status(404).json({ error: 'Kunde nicht gefunden' });
        }

        const projects = await pool.query(
            'SELECT * FROM bau.projects WHERE customer_id = $1 ORDER BY created_at DESC',
            [req.params.id]
        );

        res.json({
            ...customer.rows[0],
            projects: projects.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// SUBCONTRACTORS API (CRITICAL)
// ═══════════════════════════════════════════════════════════════

// Public: Submit application
app.post('/api/subcontractors/apply', async (req, res) => {
    try {
        const {
            email, firstName, lastName, companyName, phone, country, city,
            specializations, experienceYears, hourlyRateExpected,
            portfolioUrl, linkedinUrl, motivation, howFoundUs
        } = req.body;

        // Check for existing application
        const existing = await pool.query(
            'SELECT id, status FROM bau.subcontractor_applications WHERE email = $1 ORDER BY created_at DESC LIMIT 1',
            [email]
        );

        if (existing.rows.length > 0 && ['new', 'reviewing'].includes(existing.rows[0].status)) {
            return res.status(400).json({
                error: 'Eine Bewerbung mit dieser E-Mail-Adresse ist bereits in Bearbeitung'
            });
        }

        const result = await pool.query(
            `INSERT INTO bau.subcontractor_applications
             (email, first_name, last_name, company_name, phone, country, city,
              specializations, experience_years, hourly_rate_expected,
              portfolio_url, linkedin_url, motivation, how_found_us)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             RETURNING id`,
            [email, firstName, lastName, companyName, phone, country, city,
             specializations, experienceYears, hourlyRateExpected,
             portfolioUrl, linkedinUrl, motivation, howFoundUs]
        );

        // Async integrations (don't block response)
        (async () => {
            // Get full application data for email
            const appData = {
                first_name: firstName,
                last_name: lastName,
                email,
                phone,
                company_name: companyName,
                country,
                city,
                specializations,
                experience_years: experienceYears,
                hourly_rate_expected: hourlyRateExpected
            };

            // Send email notification to admin (PRIMARY)
            try {
                await emailService.notifyNewApplication(appData);
                console.log('[Email] Admin notification sent to info@west-money-bau.de');
            } catch (err) {
                console.error('[Email] Notification error:', err.message);
            }

            // Send confirmation to applicant
            try {
                await emailService.sendApplicationConfirmation(appData);
                console.log('[Email] Confirmation sent to applicant');
            } catch (err) {
                console.error('[Email] Confirmation error:', err.message);
            }
        })();

        res.status(201).json({
            success: true,
            message: 'Bewerbung erfolgreich eingereicht. Wir melden uns innerhalb von 48 Stunden.',
            applicationId: result.rows[0].id
        });
    } catch (error) {
        console.error('[Subcontractors] Application error:', error);
        res.status(500).json({ error: 'Fehler beim Einreichen der Bewerbung' });
    }
});

// Admin: Get all applications
app.get('/api/subcontractors/applications', async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;

        let query = 'SELECT * FROM bau.subcontractor_applications WHERE 1=1';
        const params = [];

        if (status) {
            params.push(status);
            query += ` AND status = $${params.length}`;
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        res.json({
            total: result.rowCount,
            applications: result.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Update application status
app.patch('/api/subcontractors/applications/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reviewerNotes, rejectionReason, interviewDate } = req.body;

        const result = await pool.query(
            `UPDATE bau.subcontractor_applications
             SET status = COALESCE($1, status),
                 reviewer_notes = COALESCE($2, reviewer_notes),
                 rejection_reason = COALESCE($3, rejection_reason),
                 interview_date = COALESCE($4, interview_date),
                 reviewed_at = CASE WHEN $1 IS NOT NULL THEN NOW() ELSE reviewed_at END
             WHERE id = $5 RETURNING *`,
            [status, reviewerNotes, rejectionReason, interviewDate, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bewerbung nicht gefunden' });
        }

        // If approved, create subcontractor record
        if (status === 'approved') {
            const app = result.rows[0];
            const subcontractor = await pool.query(
                `INSERT INTO bau.subcontractors
                 (email, first_name, last_name, company_name, phone, country, city,
                  specializations, experience_years, hourly_rate, status, verification_status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'approved', 'unverified')
                 RETURNING id`,
                [app.email, app.first_name, app.last_name, app.company_name, app.phone,
                 app.country, app.city, app.specializations, app.experience_years, app.hourly_rate_expected]
            );

            await pool.query(
                'UPDATE bau.subcontractor_applications SET converted_to_subcontractor_id = $1 WHERE id = $2',
                [subcontractor.rows[0].id, id]
            );

            // TODO: Send welcome email
            // TODO: Create Stripe Connect account
            // TODO: Generate framework contract
        }

        res.json({ success: true, application: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Get all subcontractors
app.get('/api/subcontractors', async (req, res) => {
    try {
        const { status, country, specialization, availability, limit = 50, offset = 0 } = req.query;

        let query = 'SELECT * FROM bau.subcontractors WHERE 1=1';
        const params = [];

        if (status) {
            params.push(status);
            query += ` AND status = $${params.length}`;
        }

        if (country) {
            params.push(country);
            query += ` AND country = $${params.length}`;
        }

        if (specialization) {
            params.push(specialization);
            query += ` AND $${params.length} = ANY(specializations)`;
        }

        if (availability) {
            params.push(availability);
            query += ` AND availability_status = $${params.length}`;
        }

        query += ` ORDER BY rating DESC, created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        res.json({
            total: result.rowCount,
            subcontractors: result.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get subcontractor by ID
app.get('/api/subcontractors/:id', async (req, res) => {
    try {
        const subcontractor = await pool.query(
            'SELECT * FROM bau.subcontractors WHERE id = $1',
            [req.params.id]
        );

        if (subcontractor.rows.length === 0) {
            return res.status(404).json({ error: 'Subunternehmer nicht gefunden' });
        }

        const assignments = await pool.query(
            `SELECT pa.*, p.title as project_title, p.project_number
             FROM bau.project_assignments pa
             JOIN bau.projects p ON pa.project_id = p.id
             WHERE pa.subcontractor_id = $1
             ORDER BY pa.created_at DESC`,
            [req.params.id]
        );

        res.json({
            ...subcontractor.rows[0],
            assignments: assignments.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update subcontractor
app.patch('/api/subcontractors/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const allowedFields = ['status', 'verification_status', 'availability_status', 'hourly_rate', 'daily_rate', 'travel_radius_km', 'notes'];
        const setClause = [];
        const values = [];

        Object.keys(updates).forEach((key, index) => {
            if (allowedFields.includes(key)) {
                setClause.push(`${key} = $${index + 1}`);
                values.push(updates[key]);
            }
        });

        if (setClause.length === 0) {
            return res.status(400).json({ error: 'Keine gueltigen Felder zum Aktualisieren' });
        }

        values.push(id);
        const result = await pool.query(
            `UPDATE bau.subcontractors SET ${setClause.join(', ')} WHERE id = $${values.length} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Subunternehmer nicht gefunden' });
        }

        res.json({ success: true, subcontractor: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// PROJECT ASSIGNMENTS API
// ═══════════════════════════════════════════════════════════════

// Create assignment
app.post('/api/assignments', async (req, res) => {
    try {
        const { projectId, subcontractorId, role, scopeOfWork, agreedRate, rateType, estimatedHours } = req.body;

        // Verify project and subcontractor exist
        const [project, subcontractor] = await Promise.all([
            pool.query('SELECT id, title FROM bau.projects WHERE id = $1', [projectId]),
            pool.query('SELECT id, first_name, last_name, email FROM bau.subcontractors WHERE id = $1', [subcontractorId])
        ]);

        if (project.rows.length === 0) {
            return res.status(404).json({ error: 'Projekt nicht gefunden' });
        }

        if (subcontractor.rows.length === 0) {
            return res.status(404).json({ error: 'Subunternehmer nicht gefunden' });
        }

        const result = await pool.query(
            `INSERT INTO bau.project_assignments
             (project_id, subcontractor_id, role, scope_of_work, agreed_rate, rate_type, estimated_hours, response_deadline)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '48 hours')
             RETURNING *`,
            [projectId, subcontractorId, role, scopeOfWork, agreedRate, rateType, estimatedHours]
        );

        // TODO: Send notification to subcontractor (email + WhatsApp)

        res.status(201).json({
            success: true,
            assignment: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update assignment status
app.patch('/api/assignments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, actualHours, performanceRating, feedback } = req.body;

        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (status) {
            updates.push(`status = $${paramIndex++}`);
            values.push(status);

            if (status === 'accepted') {
                updates.push(`accepted_at = NOW()`);
            } else if (status === 'in_progress') {
                updates.push(`started_at = NOW()`);
            } else if (status === 'completed') {
                updates.push(`completed_at = NOW()`);
            }
        }

        if (actualHours !== undefined) {
            updates.push(`actual_hours = $${paramIndex++}`);
            values.push(actualHours);
        }

        if (performanceRating !== undefined) {
            updates.push(`performance_rating = $${paramIndex++}`);
            values.push(performanceRating);
        }

        if (feedback !== undefined) {
            updates.push(`feedback = $${paramIndex++}`);
            values.push(feedback);
        }

        values.push(id);
        const result = await pool.query(
            `UPDATE bau.project_assignments SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Zuweisung nicht gefunden' });
        }

        // If completed, calculate payment
        if (status === 'completed' && result.rows[0].actual_hours && result.rows[0].agreed_rate) {
            const totalPayment = result.rows[0].actual_hours * result.rows[0].agreed_rate;
            await pool.query(
                'UPDATE bau.project_assignments SET total_payment = $1 WHERE id = $2',
                [totalPayment, id]
            );

            // Update subcontractor rating
            if (performanceRating) {
                await pool.query(
                    `UPDATE bau.subcontractors
                     SET rating = (rating * total_projects + $1) / (total_projects + 1),
                         total_projects = total_projects + 1
                     WHERE id = $2`,
                    [performanceRating, result.rows[0].subcontractor_id]
                );
            }
        }

        res.json({ success: true, assignment: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// PAYMENTS API
// ═══════════════════════════════════════════════════════════════

// Get payments
app.get('/api/payments', async (req, res) => {
    try {
        const { type, status, limit = 50, offset = 0 } = req.query;

        let query = 'SELECT * FROM bau.payments WHERE 1=1';
        const params = [];

        if (type) {
            params.push(type);
            query += ` AND payment_type = $${params.length}`;
        }

        if (status) {
            params.push(status);
            query += ` AND status = $${params.length}`;
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        res.json({
            total: result.rowCount,
            payments: result.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create invoice for project
app.post('/api/payments/invoice', async (req, res) => {
    try {
        const { projectId, amount, dueDate } = req.body;

        const project = await pool.query(
            'SELECT * FROM bau.projects WHERE id = $1',
            [projectId]
        );

        if (project.rows.length === 0) {
            return res.status(404).json({ error: 'Projekt nicht gefunden' });
        }

        const invoiceNumber = `WMB-R-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        const result = await pool.query(
            `INSERT INTO bau.payments
             (payment_type, reference_type, reference_id, customer_id, amount, invoice_number, due_date, status)
             VALUES ('customer_invoice', 'project', $1, $2, $3, $4, $5, 'pending')
             RETURNING *`,
            [projectId, project.rows[0].customer_id, amount, invoiceNumber, dueDate]
        );

        // TODO: Generate PDF
        // TODO: Send to Stripe
        // TODO: Send email to customer

        res.status(201).json({
            success: true,
            payment: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Process subcontractor payment
app.post('/api/payments/subcontractor', async (req, res) => {
    try {
        const { assignmentId } = req.body;

        const assignment = await pool.query(
            `SELECT pa.*, s.stripe_connect_id, s.email, s.first_name, s.last_name
             FROM bau.project_assignments pa
             JOIN bau.subcontractors s ON pa.subcontractor_id = s.id
             WHERE pa.id = $1 AND pa.status = 'completed'`,
            [assignmentId]
        );

        if (assignment.rows.length === 0) {
            return res.status(404).json({ error: 'Abgeschlossene Zuweisung nicht gefunden' });
        }

        const a = assignment.rows[0];
        const amount = a.total_payment || (a.actual_hours * a.agreed_rate);
        const platformFee = amount * 0.05; // 5% platform fee
        const netAmount = amount - platformFee;

        const result = await pool.query(
            `INSERT INTO bau.payments
             (payment_type, reference_type, reference_id, subcontractor_id, amount, platform_fee, net_amount, status)
             VALUES ('subcontractor_payment', 'assignment', $1, $2, $3, $4, $5, 'pending')
             RETURNING *`,
            [assignmentId, a.subcontractor_id, amount, platformFee, netAmount]
        );

        // Update assignment payment status
        await pool.query(
            'UPDATE bau.project_assignments SET payment_status = $1 WHERE id = $2',
            ['processing', assignmentId]
        );

        // TODO: Create Stripe transfer to connected account

        res.status(201).json({
            success: true,
            payment: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// LOXONE API
// ═══════════════════════════════════════════════════════════════

// LOXONE Quote endpoint - using integration module
app.post('/api/loxone/quote', async (req, res) => {
    try {
        const { rooms, features, projectType } = req.body;

        const quote = loxone.generateQuote({
            rooms: rooms,
            features: features,
            projectType: projectType || 'new_build',
            includeInstallation: true,
            includeTraining: true
        });

        res.json({
            success: true,
            quote: quote
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get LOXONE component catalog
app.get('/api/loxone/components', (req, res) => {
    const { category } = req.query;

    if (category) {
        res.json({
            components: loxone.getComponentsByCategory(category)
        });
    } else {
        res.json({
            catalog: loxone.COMPONENT_CATALOG,
            categories: ['core', 'lighting', 'climate', 'shading', 'audio', 'security']
        });
    }
});

// Get LOXONE room presets
app.get('/api/loxone/presets', (req, res) => {
    res.json({
        presets: loxone.getAllRoomPresets()
    });
});

// ═══════════════════════════════════════════════════════════════
// WEBHOOKS
// ═══════════════════════════════════════════════════════════════

app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    // TODO: Implement Stripe webhook handling
    res.json({ received: true });
});

app.post('/webhooks/hubspot', async (req, res) => {
    // TODO: Implement HubSpot webhook handling
    res.json({ received: true });
});

// ═══════════════════════════════════════════════════════════════
// FALLBACK ROUTES
// ═══════════════════════════════════════════════════════════════

// Serve landing page for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[Error]', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`
====================================================
    West Money Bau API Server started

    Endpoints:
      Health:     GET  /api/health
      Projects:   GET  /api/projects
      Customers:  GET  /api/customers
      Subcontr.:  GET  /api/subcontractors
      Apply:      POST /api/subcontractors/apply

    Port: ${PORT}
====================================================
    `);
});

module.exports = app;
