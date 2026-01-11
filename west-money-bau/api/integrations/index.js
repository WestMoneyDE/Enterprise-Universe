/**
 * West Money Bau - Integrations Index
 * Exports all third-party integrations
 */

const hubspot = require('./hubspot');
const stripe = require('./stripe');
const whatsapp = require('./whatsapp');
const loxone = require('./loxone');
const email = require('./email');

module.exports = {
    hubspot,
    stripe,
    whatsapp,
    loxone,
    email
};
