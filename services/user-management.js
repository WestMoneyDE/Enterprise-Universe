/**
 * USER MANAGEMENT SERVICE
 * Authentication, Authorization & User Management
 * Adapted to existing database schema
 *
 * Enterprise Universe - West Money Bau GmbH
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'enterprise-universe-secret-key-2026';
const JWT_EXPIRES_IN = '7d';

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// User Roles (matching existing DB constraint)
const ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    USER: 'user',
    DEMO: 'demo'
};

// Role Permissions
const PERMISSIONS = {
    admin: ['*'],
    manager: ['read', 'write', 'delete', 'manage_users', 'view_reports', 'manage_deals'],
    user: ['read', 'write', 'view_reports', 'manage_deals', 'send_emails'],
    demo: ['read', 'view_reports']
};

/**
 * Create a new user (using existing schema)
 */
async function createUser({ email, password, firstName, lastName, role = 'user', company = '' }) {
    if (!email || !email.includes('@')) {
        throw new Error('Invalid email address');
    }

    if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters');
    }

    if (!Object.values(ROLES).includes(role)) {
        role = 'user';
    }

    const passwordHash = await bcrypt.hash(password, 12);

    try {
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, firstname, lastname, role, company, status, gdpr_consent, agb_accepted)
             VALUES ($1, $2, $3, $4, $5, $6, 'active', true, true)
             RETURNING id, email, firstname, lastname, role, company, status, created_at`,
            [email.toLowerCase(), passwordHash, firstName || '', lastName || '', role, company]
        );

        const user = result.rows[0];
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstname,
            lastName: user.lastname,
            role: user.role,
            company: user.company,
            status: user.status,
            createdAt: user.created_at
        };
    } catch (error) {
        if (error.code === '23505') {
            throw new Error('Email already exists');
        }
        throw error;
    }
}

/**
 * Authenticate user and generate JWT
 */
async function loginUser(email, password, ipAddress = null, userAgent = null) {
    const result = await pool.query(
        `SELECT id, email, password_hash, firstname, lastname, role, company, avatar_url, status
         FROM users WHERE email = $1 AND status = 'active'`,
        [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
        throw new Error('Invalid credentials');
    }

    const user = result.rows[0];

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
        // Increment failed login attempts
        await pool.query(
            'UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1',
            [user.id]
        );
        throw new Error('Invalid credentials');
    }

    // Generate JWT
    const token = jwt.sign(
        {
            userId: user.id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    // Update last login
    await pool.query(
        `UPDATE users SET
            last_login_at = CURRENT_TIMESTAMP,
            last_login_ip = $2,
            failed_login_attempts = 0
         WHERE id = $1`,
        [user.id, ipAddress]
    );

    // Log to login_history (with required login_type field)
    try {
        await pool.query(
            `INSERT INTO login_history (user_id, login_type, ip_address, user_agent, success)
             VALUES ($1, 'password', $2, $3, true)`,
            [user.id, ipAddress, userAgent]
        );
    } catch (e) {
        console.log('Login history note:', e.message);
    }

    // Store session (using existing schema with token_hash)
    try {
        const tokenHash = await bcrypt.hash(token.slice(-20), 8);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await pool.query(
            `INSERT INTO sessions (user_id, token_hash, ip_address, expires_at, is_active)
             VALUES ($1, $2, $3, $4, true)`,
            [user.id, tokenHash, ipAddress, expiresAt]
        );
    } catch (e) {
        console.log('Session storage note:', e.message);
        // Continue even if session storage fails
    }

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstname,
            lastName: user.lastname,
            role: user.role,
            company: user.company,
            avatarUrl: user.avatar_url
        }
    };
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch (error) {
        return null;
    }
}

/**
 * Get user by ID
 */
async function getUserById(userId) {
    const result = await pool.query(
        `SELECT id, email, firstname, lastname, role, company, avatar_url, phone,
                last_login_at, status, created_at
         FROM users WHERE id = $1`,
        [userId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const user = result.rows[0];
    return {
        id: user.id,
        email: user.email,
        firstName: user.firstname,
        lastName: user.lastname,
        role: user.role,
        company: user.company,
        avatarUrl: user.avatar_url,
        phone: user.phone,
        lastLogin: user.last_login_at,
        status: user.status,
        createdAt: user.created_at,
        isActive: user.status === 'active',
        permissions: PERMISSIONS[user.role] || []
    };
}

/**
 * Get all users (admin only)
 */
async function getAllUsers(limit = 100, offset = 0) {
    const result = await pool.query(
        `SELECT id, email, firstname, lastname, role, company,
                last_login_at, status, created_at
         FROM users
         WHERE status != 'deleted'
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
    );

    const countResult = await pool.query("SELECT COUNT(*) FROM users WHERE status != 'deleted'");

    return {
        users: result.rows.map(user => ({
            id: user.id,
            email: user.email,
            firstName: user.firstname,
            lastName: user.lastname,
            role: user.role,
            company: user.company,
            lastLogin: user.last_login_at,
            status: user.status,
            createdAt: user.created_at
        })),
        total: parseInt(countResult.rows[0].count),
        limit,
        offset
    };
}

/**
 * Update user
 */
async function updateUser(userId, updates) {
    const allowedFields = {
        firstName: 'firstname',
        lastName: 'lastname',
        phone: 'phone',
        company: 'company',
        avatarUrl: 'avatar_url'
    };

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields[key]) {
            setClause.push(`${allowedFields[key]} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
        }
    }

    if (setClause.length === 0) {
        throw new Error('No valid fields to update');
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const result = await pool.query(
        `UPDATE users SET ${setClause.join(', ')} WHERE id = $${paramIndex}
         RETURNING id, email, firstname, lastname, role, company`,
        values
    );

    return result.rows[0];
}

/**
 * Update user role (admin only)
 */
async function updateUserRole(userId, newRole, adminId) {
    if (!Object.values(ROLES).includes(newRole)) {
        throw new Error('Invalid role');
    }

    await pool.query(
        'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newRole, userId]
    );

    // Log to audit
    try {
        await pool.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
             VALUES ($1, 'update_role', 'user', $2, $3)`,
            [adminId, userId, JSON.stringify({ newRole })]
        );
    } catch (e) {
        // Ignore audit log errors
    }
}

/**
 * Deactivate user
 */
async function deactivateUser(userId, adminId) {
    await pool.query(
        "UPDATE users SET status = 'suspended', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [userId]
    );

    // Invalidate sessions
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}

/**
 * Change password
 */
async function changePassword(userId, currentPassword, newPassword) {
    const result = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
    );

    if (result.rows.length === 0) {
        throw new Error('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValid) {
        throw new Error('Current password is incorrect');
    }

    if (!newPassword || newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters');
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
        `UPDATE users SET
            password_hash = $1,
            password_changed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newHash, userId]
    );

    // Store in password history
    try {
        await pool.query(
            'INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)',
            [userId, newHash]
        );
    } catch (e) {
        // Ignore
    }
}

/**
 * Logout user
 */
async function logoutUser(userId, token) {
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}

/**
 * Check if user has permission
 */
function hasPermission(userRole, permission) {
    const rolePermissions = PERMISSIONS[userRole] || [];
    return rolePermissions.includes('*') || rolePermissions.includes(permission);
}

/**
 * Ensure admin exists
 */
async function ensureAdminExists() {
    const result = await pool.query(
        "SELECT COUNT(*) FROM users WHERE role = 'admin' AND status = 'active'"
    );

    if (parseInt(result.rows[0].count) === 0) {
        try {
            await createUser({
                email: 'admin@enterprise-universe.one',
                password: 'Admin2026!EU',
                firstName: 'Admin',
                lastName: 'Enterprise Universe',
                role: 'admin',
                company: 'West Money Bau GmbH'
            });
            console.log('✓ Default admin user created: admin@enterprise-universe.one / Admin2026!EU');
        } catch (e) {
            if (!e.message.includes('already exists')) {
                console.warn('⚠ Could not create admin:', e.message);
            }
        }
    }
}

/**
 * Initialize (check DB connection)
 */
async function initDatabase() {
    try {
        await pool.query('SELECT 1');
        console.log('✓ User database connection verified');
        return true;
    } catch (error) {
        console.error('Database connection error:', error);
        throw error;
    }
}

module.exports = {
    initDatabase,
    createUser,
    loginUser,
    verifyToken,
    getUserById,
    getAllUsers,
    updateUser,
    updateUserRole,
    deactivateUser,
    changePassword,
    logoutUser,
    hasPermission,
    ensureAdminExists,
    ROLES,
    PERMISSIONS
};
