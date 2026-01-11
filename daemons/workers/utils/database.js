/**
 * Database Connection for Daemons
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://westmoney:westmoney@localhost:5433/westmoney_os'
});

module.exports = pool;
