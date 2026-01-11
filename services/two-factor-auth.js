/**
 * TWO-FACTOR AUTHENTICATION SERVICE
 * TOTP-based 2FA for Enterprise Universe
 *
 * Uses otplib for TOTP generation/verification
 * Uses qrcode for QR code generation
 */

const otplib = require('otplib');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Configuration
const APP_NAME = 'Enterprise Universe';
const BACKUP_CODES_COUNT = 10;

/**
 * Generate a new 2FA secret for a user
 * @param {string} userEmail - User's email for the authenticator app label
 * @returns {Object} - Secret, QR code data URL, and backup codes
 */
async function generateSecret(userEmail) {
    // Generate a random secret (otplib v13 API)
    const secret = otplib.generateSecret();

    // Generate the otpauth URL (otplib v13 API)
    const otpauthUrl = otplib.generateURI({
        issuer: APP_NAME,
        label: userEmail,
        secret: secret,
        type: 'totp'
    });

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
        width: 256,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    });

    // Generate backup codes
    const backupCodes = generateBackupCodes(BACKUP_CODES_COUNT);

    return {
        secret,
        qrCodeDataUrl,
        otpauthUrl,
        backupCodes
    };
}

/**
 * Generate random backup codes
 * @param {number} count - Number of backup codes to generate
 * @returns {Array} - Array of backup code strings
 */
function generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
        // Generate 8-character alphanumeric codes
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(code);
    }
    return codes;
}

/**
 * Verify a TOTP token
 * @param {string} token - The 6-digit token from authenticator app
 * @param {string} secret - The user's 2FA secret
 * @returns {boolean} - Whether the token is valid
 */
function verifyToken(token, secret) {
    try {
        // otplib v13 API - verify returns boolean directly
        return otplib.verify({ token, secret });
    } catch (error) {
        console.error('2FA verification error:', error);
        return false;
    }
}

/**
 * Enable 2FA for a user (store secret in database)
 * @param {number} userId - User ID
 * @param {string} secret - The 2FA secret
 * @param {Array} backupCodes - Array of backup codes
 */
async function enable2FA(userId, secret, backupCodes) {
    // Hash backup codes before storing
    const hashedBackupCodes = backupCodes.map(code =>
        crypto.createHash('sha256').update(code).digest('hex')
    );

    await pool.query(
        `UPDATE users SET
            two_factor_secret = $1,
            two_factor_enabled = true,
            two_factor_backup_codes = $2,
            two_factor_enabled_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [secret, hashedBackupCodes, userId]  // pg driver handles array conversion
    );

    console.log(`[2FA] Enabled for user ${userId}`);
}

/**
 * Disable 2FA for a user
 * @param {number} userId - User ID
 */
async function disable2FA(userId) {
    await pool.query(
        `UPDATE users SET
            two_factor_secret = NULL,
            two_factor_enabled = false,
            two_factor_backup_codes = NULL,
            two_factor_enabled_at = NULL,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [userId]
    );

    console.log(`[2FA] Disabled for user ${userId}`);
}

/**
 * Check if user has 2FA enabled
 * @param {number} userId - User ID
 * @returns {Object} - 2FA status and secret
 */
async function get2FAStatus(userId) {
    const result = await pool.query(
        `SELECT two_factor_enabled, two_factor_secret, two_factor_enabled_at
         FROM users WHERE id = $1`,
        [userId]
    );

    if (result.rows.length === 0) {
        return { enabled: false, secret: null };
    }

    return {
        enabled: result.rows[0].two_factor_enabled || false,
        secret: result.rows[0].two_factor_secret,
        enabledAt: result.rows[0].two_factor_enabled_at
    };
}

/**
 * Verify 2FA token for login
 * @param {number} userId - User ID
 * @param {string} token - The 6-digit token or backup code
 * @returns {Object} - Verification result
 */
async function verify2FAForLogin(userId, token) {
    const result = await pool.query(
        `SELECT two_factor_secret, two_factor_backup_codes
         FROM users WHERE id = $1 AND two_factor_enabled = true`,
        [userId]
    );

    if (result.rows.length === 0) {
        return { success: false, error: '2FA not enabled' };
    }

    const { two_factor_secret: secret, two_factor_backup_codes: backupCodesArray } = result.rows[0];

    // First, try TOTP verification
    if (verifyToken(token, secret)) {
        return { success: true, method: 'totp' };
    }

    // If TOTP fails, try backup codes
    const tokenHash = crypto.createHash('sha256').update(token.toUpperCase()).digest('hex');
    const backupCodes = backupCodesArray || [];  // pg returns array directly

    const codeIndex = backupCodes.indexOf(tokenHash);
    if (codeIndex !== -1) {
        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        await pool.query(
            `UPDATE users SET two_factor_backup_codes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [backupCodes, userId]  // pg driver handles array conversion
        );

        return {
            success: true,
            method: 'backup_code',
            remainingBackupCodes: backupCodes.length
        };
    }

    return { success: false, error: 'Invalid token' };
}

/**
 * Regenerate backup codes for a user
 * @param {number} userId - User ID
 * @returns {Array} - New backup codes
 */
async function regenerateBackupCodes(userId) {
    const backupCodes = generateBackupCodes(BACKUP_CODES_COUNT);
    const hashedBackupCodes = backupCodes.map(code =>
        crypto.createHash('sha256').update(code).digest('hex')
    );

    await pool.query(
        `UPDATE users SET two_factor_backup_codes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [hashedBackupCodes, userId]  // pg driver handles array conversion
    );

    return backupCodes;
}

/**
 * Check if 2FA setup is required (for new users or admin-enforced)
 * @param {number} userId - User ID
 * @returns {boolean} - Whether 2FA setup is required
 */
async function is2FASetupRequired(userId) {
    const result = await pool.query(
        `SELECT role, two_factor_enabled, created_at
         FROM users WHERE id = $1`,
        [userId]
    );

    if (result.rows.length === 0) return false;

    const user = result.rows[0];

    // Require 2FA for admin users
    if (user.role === 'admin' && !user.two_factor_enabled) {
        return true;
    }

    // Optional: Require 2FA for all users
    // return !user.two_factor_enabled;

    return false;
}

/**
 * Initialize 2FA columns in database if they don't exist
 */
async function initDatabase() {
    try {
        // Check if columns exist
        const checkQuery = `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'two_factor_secret'
        `;
        const checkResult = await pool.query(checkQuery);

        if (checkResult.rows.length === 0) {
            // Add 2FA columns
            await pool.query(`
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(64),
                ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT,
                ADD COLUMN IF NOT EXISTS two_factor_enabled_at TIMESTAMP
            `);
            console.log('[2FA] Database columns created');
        }

        console.log('[2FA] Service initialized');
        return true;
    } catch (error) {
        console.error('[2FA] Database init error:', error.message);
        return false;
    }
}

module.exports = {
    generateSecret,
    verifyToken,
    enable2FA,
    disable2FA,
    get2FAStatus,
    verify2FAForLogin,
    regenerateBackupCodes,
    is2FASetupRequired,
    initDatabase
};
