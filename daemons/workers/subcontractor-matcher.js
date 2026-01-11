/**
 * Subcontractor Matcher Daemon
 * Matches available subcontractors to open projects based on skills and location
 */

const db = require('./utils/database');
const emailService = require('./utils/email-service');

// Matching weights
const WEIGHTS = {
    specialization: 40,
    location: 30,
    rating: 15,
    availability: 15
};

// Country proximity for location matching
const COUNTRY_PROXIMITY = {
    'DE': ['DE', 'AT', 'CH', 'NL', 'BE', 'PL', 'CZ'],
    'AT': ['AT', 'DE', 'CH', 'CZ', 'HU', 'IT'],
    'CH': ['CH', 'DE', 'AT', 'FR', 'IT']
};

function calculateMatchScore(project, subcontractor) {
    let score = 0;

    // Specialization match
    if (project.project_type && subcontractor.specializations) {
        const projectType = project.project_type.toLowerCase();
        const specs = subcontractor.specializations.map(s => s.toLowerCase());

        const typeMapping = {
            'smart_home': ['smart_home', 'electrical', 'security'],
            'electrical': ['electrical', 'smart_home'],
            'barrier_free': ['plumbing', 'construction', 'hvac'],
            'security': ['security', 'electrical', 'smart_home'],
            'hvac': ['hvac', 'plumbing'],
            'plumbing': ['plumbing', 'hvac', 'construction']
        };

        const relevantSpecs = typeMapping[projectType] || [projectType];
        const matchingSpecs = specs.filter(s => relevantSpecs.includes(s));

        if (matchingSpecs.length > 0) {
            score += WEIGHTS.specialization * (matchingSpecs.length / relevantSpecs.length);
        }
    }

    // Location match
    if (project.location_country && subcontractor.country) {
        const nearby = COUNTRY_PROXIMITY[project.location_country] || [project.location_country];
        if (subcontractor.country === project.location_country) {
            score += WEIGHTS.location;
        } else if (nearby.includes(subcontractor.country)) {
            score += WEIGHTS.location * 0.6;
        }
    }

    // Rating
    if (subcontractor.rating) {
        score += WEIGHTS.rating * (subcontractor.rating / 5);
    }

    // Availability
    if (subcontractor.availability_status === 'available') {
        score += WEIGHTS.availability;
    } else if (subcontractor.availability_status === 'limited') {
        score += WEIGHTS.availability * 0.5;
    }

    return Math.round(score);
}

async function run() {
    let matchesMade = 0;
    let notificationsSent = 0;
    const errors = [];

    try {
        // Get open projects needing subcontractors
        const openProjects = await db.query(`
            SELECT p.*, c.first_name as customer_first, c.last_name as customer_last
            FROM bau.projects p
            LEFT JOIN bau.customers c ON p.customer_id = c.id
            WHERE p.status IN ('signed', 'in_progress')
            AND NOT EXISTS (
                SELECT 1 FROM bau.project_assignments pa
                WHERE pa.project_id = p.id AND pa.status = 'accepted'
            )
            ORDER BY p.priority DESC, p.created_at ASC
            LIMIT 20
        `);

        // Get available subcontractors
        const subcontractors = await db.query(`
            SELECT * FROM bau.subcontractors
            WHERE status = 'approved'
            AND availability_status IN ('available', 'limited')
            ORDER BY rating DESC NULLS LAST
        `);

        for (const project of openProjects.rows) {
            const matches = [];

            for (const sub of subcontractors.rows) {
                const score = calculateMatchScore(project, sub);
                if (score >= 40) {
                    matches.push({ subcontractor: sub, score });
                }
            }

            // Sort by score and take top 3
            matches.sort((a, b) => b.score - a.score);
            const topMatches = matches.slice(0, 3);

            for (const match of topMatches) {
                // Check if already suggested
                const existing = await db.query(`
                    SELECT 1 FROM bau.project_assignments
                    WHERE project_id = $1 AND subcontractor_id = $2
                `, [project.id, match.subcontractor.id]);

                if (existing.rows.length === 0) {
                    // Create assignment suggestion
                    await db.query(`
                        INSERT INTO bau.project_assignments
                        (project_id, subcontractor_id, status, match_score)
                        VALUES ($1, $2, 'suggested', $3)
                    `, [project.id, match.subcontractor.id, match.score]);

                    matchesMade++;

                    // Notify subcontractor
                    if (match.subcontractor.email) {
                        const result = await emailService.sendEmail({
                            to: match.subcontractor.email,
                            subject: `Neues Projektangebot: ${project.project_type}`,
                            body: `
Hallo ${match.subcontractor.first_name},

wir haben ein neues Projekt, das zu Ihrem Profil passt:

Projekttyp: ${project.project_type}
Kunde: ${project.customer_first} ${project.customer_last}
Match-Score: ${match.score}%

Loggen Sie sich ins Portal ein, um Details zu sehen und das Projekt anzunehmen:
https://west-money-bau.de/portal

Mit freundlichen Grüßen
West Money Bau Team
                            `
                        });

                        if (result.success) {
                            notificationsSent++;
                        }
                    }
                }
            }
        }

        // Log activity
        if (matchesMade > 0) {
            await db.query(`
                INSERT INTO bau.activity_log (entity_type, entity_id, action, description)
                VALUES ('system', NULL, 'auto_match', $1)
            `, [`${matchesMade} Projekt-Subunternehmer Matches erstellt`]);
        }

    } catch (error) {
        errors.push(error.message);
    }

    return {
        success: errors.length === 0,
        summary: `${matchesMade} matches, ${notificationsSent} notifications`,
        errors
    };
}

module.exports = { run, calculateMatchScore };
