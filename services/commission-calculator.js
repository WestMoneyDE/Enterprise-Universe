/**
 * COMMISSION CALCULATOR SERVICE
 * Priority-based commission calculation for CYBERSPACE Marketplace
 *
 * Priority Order:
 * 1. Product-Level Rule (highest priority)
 * 2. Category-Level Rate
 * 3. Vendor-Level Rate
 * 4. Global Default (10%)
 *
 * Enterprise Universe - West Money Bau GmbH
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// ═══════════════════════════════════════════════════════════════
// DEFAULT COMMISSION RATES
// ═══════════════════════════════════════════════════════════════

const DEFAULT_COMMISSION = {
    standard: 10.00,      // Standard vendor rate
    silver: 8.00,         // >€10K/month
    gold: 6.00,           // >€50K/month
    platinum: 5.00,       // >€100K/month
    enterprise: 3.00,     // Custom negotiated
    affiliate: 5.00       // Affiliate commission
};

// Vendor tier thresholds (monthly revenue in EUR)
const VENDOR_TIERS = {
    silver: 10000,
    gold: 50000,
    platinum: 100000,
    enterprise: null  // Custom
};

// ═══════════════════════════════════════════════════════════════
// COMMISSION CALCULATION
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate commission for an order item
 * Uses priority-based lookup: Product > Category > Vendor > Default
 *
 * @param {Object} params
 * @param {string} params.productId - Product UUID
 * @param {string} params.vendorId - Vendor UUID
 * @param {number} params.amount - Order amount in cents
 * @param {string} [params.affiliateCode] - Optional affiliate tracking code
 * @returns {Object} Commission breakdown
 */
async function calculateCommission({ productId, vendorId, amount, affiliateCode }) {
    const client = await pool.connect();

    try {
        // Get product with category and vendor info
        const productResult = await client.query(`
            SELECT
                p.id AS product_id,
                p.name AS product_name,
                p.product_type,
                p.commission_override,
                c.id AS category_id,
                c.name AS category_name,
                c.commission_rate AS category_commission,
                v.id AS vendor_id,
                v.company_name AS vendor_name,
                v.commission_tier,
                v.commission_rate AS vendor_commission,
                v.total_sales
            FROM cyberspace.products p
            LEFT JOIN cyberspace.categories c ON p.category_id = c.id
            LEFT JOIN cyberspace.vendors v ON p.vendor_id = v.id
            WHERE p.id = $1
        `, [productId]);

        if (productResult.rows.length === 0) {
            throw new Error(`Product not found: ${productId}`);
        }

        const product = productResult.rows[0];
        let commissionRate = DEFAULT_COMMISSION.standard;
        let commissionSource = 'default';
        let commissionReason = 'Standard platform commission (10%)';

        // Priority 1: Check product-level commission rule
        const productRuleResult = await client.query(`
            SELECT rate, reason
            FROM cyberspace.commission_rules
            WHERE is_active = TRUE
              AND applies_to = 'product'
              AND target_id = $1
              AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
              AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
            ORDER BY priority DESC
            LIMIT 1
        `, [productId]);

        if (productRuleResult.rows.length > 0) {
            commissionRate = parseFloat(productRuleResult.rows[0].rate);
            commissionSource = 'product_rule';
            commissionReason = productRuleResult.rows[0].reason || `Product-specific rate: ${commissionRate}%`;
        }
        // Priority 2: Check product commission override
        else if (product.commission_override !== null) {
            commissionRate = parseFloat(product.commission_override);
            commissionSource = 'product_override';
            commissionReason = `Product override: ${commissionRate}%`;
        }
        // Priority 3: Check category commission rate
        else if (product.category_commission !== null) {
            commissionRate = parseFloat(product.category_commission);
            commissionSource = 'category';
            commissionReason = `${product.category_name} category rate: ${commissionRate}%`;
        }
        // Priority 4: Check vendor-level commission
        else if (product.vendor_commission !== null) {
            commissionRate = parseFloat(product.vendor_commission);
            commissionSource = 'vendor';
            commissionReason = `Vendor ${product.vendor_name} rate: ${commissionRate}%`;
        }
        // Priority 5: Use vendor tier-based rate
        else if (product.commission_tier) {
            commissionRate = DEFAULT_COMMISSION[product.commission_tier] || DEFAULT_COMMISSION.standard;
            commissionSource = 'vendor_tier';
            commissionReason = `${product.commission_tier} tier rate: ${commissionRate}%`;
        }

        // Calculate amounts
        const amountEur = amount / 100; // Convert cents to EUR
        const platformCommission = (amountEur * commissionRate) / 100;
        const vendorPayout = amountEur - platformCommission;

        // Calculate affiliate commission if applicable
        let affiliateCommission = 0;
        let affiliateId = null;

        if (affiliateCode) {
            const affiliateResult = await client.query(`
                SELECT id, commission_rate
                FROM cyberspace.affiliates
                WHERE tracking_code = $1 AND status = 'active'
            `, [affiliateCode]);

            if (affiliateResult.rows.length > 0) {
                affiliateId = affiliateResult.rows[0].id;
                const affiliateRate = parseFloat(affiliateResult.rows[0].commission_rate);
                affiliateCommission = (amountEur * affiliateRate) / 100;
            }
        }

        return {
            success: true,
            product: {
                id: product.product_id,
                name: product.product_name,
                type: product.product_type
            },
            vendor: {
                id: product.vendor_id,
                name: product.vendor_name,
                tier: product.commission_tier
            },
            category: {
                id: product.category_id,
                name: product.category_name
            },
            amounts: {
                orderTotal: amountEur,
                orderTotalCents: amount,
                platformCommission: Math.round(platformCommission * 100) / 100,
                platformCommissionCents: Math.round(platformCommission * 100),
                vendorPayout: Math.round(vendorPayout * 100) / 100,
                vendorPayoutCents: Math.round(vendorPayout * 100),
                affiliateCommission: Math.round(affiliateCommission * 100) / 100,
                affiliateCommissionCents: Math.round(affiliateCommission * 100)
            },
            commission: {
                rate: commissionRate,
                source: commissionSource,
                reason: commissionReason
            },
            affiliate: affiliateId ? {
                id: affiliateId,
                code: affiliateCode,
                commission: affiliateCommission
            } : null
        };

    } finally {
        client.release();
    }
}

/**
 * Calculate commission for entire cart/order
 * @param {Array} items - Array of {productId, quantity, unitPrice}
 * @param {string} [affiliateCode] - Optional affiliate code
 * @returns {Object} Aggregated commission breakdown
 */
async function calculateOrderCommission(items, affiliateCode = null) {
    const results = [];
    let totalOrderAmount = 0;
    let totalPlatformCommission = 0;
    let totalAffiliateCommission = 0;
    const vendorPayouts = {};

    for (const item of items) {
        const itemTotal = item.quantity * item.unitPrice;
        const commission = await calculateCommission({
            productId: item.productId,
            vendorId: item.vendorId,
            amount: itemTotal,
            affiliateCode
        });

        results.push({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            ...commission
        });

        totalOrderAmount += itemTotal;
        totalPlatformCommission += commission.amounts.platformCommissionCents;
        totalAffiliateCommission += commission.amounts.affiliateCommissionCents;

        // Aggregate vendor payouts
        const vendorId = commission.vendor.id;
        if (!vendorPayouts[vendorId]) {
            vendorPayouts[vendorId] = {
                vendorId,
                vendorName: commission.vendor.name,
                totalPayout: 0,
                itemCount: 0
            };
        }
        vendorPayouts[vendorId].totalPayout += commission.amounts.vendorPayoutCents;
        vendorPayouts[vendorId].itemCount += item.quantity;
    }

    return {
        success: true,
        summary: {
            orderTotal: totalOrderAmount / 100,
            orderTotalCents: totalOrderAmount,
            platformCommission: totalPlatformCommission / 100,
            platformCommissionCents: totalPlatformCommission,
            affiliateCommission: totalAffiliateCommission / 100,
            affiliateCommissionCents: totalAffiliateCommission,
            netRevenue: (totalPlatformCommission - totalAffiliateCommission) / 100,
            netRevenueCents: totalPlatformCommission - totalAffiliateCommission
        },
        vendorPayouts: Object.values(vendorPayouts),
        items: results,
        affiliateCode
    };
}

// ═══════════════════════════════════════════════════════════════
// VENDOR TIER MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Update vendor tier based on monthly sales
 * Called by scheduled job
 */
async function updateVendorTiers() {
    const client = await pool.connect();

    try {
        // Calculate last 30 days sales per vendor
        const salesResult = await client.query(`
            SELECT
                v.id AS vendor_id,
                v.commission_tier AS current_tier,
                COALESCE(SUM(oi.unit_price * oi.quantity), 0) AS monthly_sales
            FROM cyberspace.vendors v
            LEFT JOIN cyberspace.products p ON p.vendor_id = v.id
            LEFT JOIN cyberspace.order_items oi ON oi.product_id = p.id
            LEFT JOIN cyberspace.orders o ON o.id = oi.order_id
            WHERE v.status = 'active'
              AND (o.created_at IS NULL OR o.created_at >= CURRENT_DATE - INTERVAL '30 days')
              AND (o.status IS NULL OR o.status NOT IN ('cancelled', 'refunded'))
            GROUP BY v.id
        `);

        const updates = [];

        for (const vendor of salesResult.rows) {
            const sales = vendor.monthly_sales / 100; // Convert to EUR
            let newTier = 'standard';

            if (vendor.current_tier === 'enterprise') {
                // Enterprise tier is permanent (negotiated)
                continue;
            } else if (sales >= VENDOR_TIERS.platinum) {
                newTier = 'platinum';
            } else if (sales >= VENDOR_TIERS.gold) {
                newTier = 'gold';
            } else if (sales >= VENDOR_TIERS.silver) {
                newTier = 'silver';
            }

            if (newTier !== vendor.current_tier) {
                await client.query(`
                    UPDATE cyberspace.vendors
                    SET commission_tier = $1,
                        commission_rate = $2,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $3
                `, [newTier, DEFAULT_COMMISSION[newTier], vendor.vendor_id]);

                updates.push({
                    vendorId: vendor.vendor_id,
                    oldTier: vendor.current_tier,
                    newTier: newTier,
                    monthlySales: sales
                });
            }
        }

        return {
            success: true,
            vendorsUpdated: updates.length,
            updates
        };

    } finally {
        client.release();
    }
}

// ═══════════════════════════════════════════════════════════════
// COMMISSION RULES MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new commission rule
 */
async function createCommissionRule(ruleData) {
    const {
        name,
        appliesTo,  // 'product', 'category', 'vendor', 'global'
        targetId,
        rate,
        priority = 0,
        reason,
        validFrom,
        validUntil,
        createdBy
    } = ruleData;

    const result = await pool.query(`
        INSERT INTO cyberspace.commission_rules
        (name, applies_to, target_id, rate, priority, reason, valid_from, valid_until, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
    `, [name, appliesTo, targetId, rate, priority, reason, validFrom, validUntil, createdBy]);

    return result.rows[0];
}

/**
 * Get all active commission rules
 */
async function getCommissionRules(filters = {}) {
    let query = `
        SELECT cr.*,
               CASE cr.applies_to
                   WHEN 'product' THEN p.name
                   WHEN 'category' THEN c.name
                   WHEN 'vendor' THEN v.company_name
                   ELSE 'Global'
               END AS target_name
        FROM cyberspace.commission_rules cr
        LEFT JOIN cyberspace.products p ON cr.applies_to = 'product' AND cr.target_id = p.id
        LEFT JOIN cyberspace.categories c ON cr.applies_to = 'category' AND cr.target_id = c.id
        LEFT JOIN cyberspace.vendors v ON cr.applies_to = 'vendor' AND cr.target_id = v.id
        WHERE 1=1
    `;
    const params = [];

    if (filters.isActive !== undefined) {
        params.push(filters.isActive);
        query += ` AND cr.is_active = $${params.length}`;
    }

    if (filters.appliesTo) {
        params.push(filters.appliesTo);
        query += ` AND cr.applies_to = $${params.length}`;
    }

    query += ' ORDER BY cr.priority DESC, cr.created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
}

/**
 * Deactivate a commission rule
 */
async function deactivateRule(ruleId) {
    const result = await pool.query(`
        UPDATE cyberspace.commission_rules
        SET is_active = FALSE
        WHERE id = $1
        RETURNING *
    `, [ruleId]);

    return result.rows[0];
}

// ═══════════════════════════════════════════════════════════════
// COMMISSION ANALYTICS
// ═══════════════════════════════════════════════════════════════

/**
 * Get commission statistics
 */
async function getCommissionStats(dateRange = {}) {
    const { startDate, endDate } = dateRange;

    let dateFilter = '';
    const params = [];

    if (startDate) {
        params.push(startDate);
        dateFilter += ` AND o.created_at >= $${params.length}`;
    }
    if (endDate) {
        params.push(endDate);
        dateFilter += ` AND o.created_at <= $${params.length}`;
    }

    const result = await pool.query(`
        SELECT
            COUNT(DISTINCT o.id) AS total_orders,
            SUM(o.total_amount) AS total_revenue,
            SUM(o.platform_commission) AS total_commission,
            AVG(o.platform_commission * 100.0 / NULLIF(o.total_amount, 0)) AS avg_commission_rate,
            COUNT(DISTINCT o.affiliate_id) AS unique_affiliates,
            SUM(o.affiliate_commission) AS total_affiliate_commission
        FROM cyberspace.orders o
        WHERE o.status NOT IN ('cancelled', 'refunded')
        ${dateFilter}
    `, params);

    return result.rows[0];
}

/**
 * Get commission breakdown by category
 */
async function getCommissionByCategory(dateRange = {}) {
    const { startDate, endDate } = dateRange;

    let dateFilter = '';
    const params = [];

    if (startDate) {
        params.push(startDate);
        dateFilter += ` AND o.created_at >= $${params.length}`;
    }
    if (endDate) {
        params.push(endDate);
        dateFilter += ` AND o.created_at <= $${params.length}`;
    }

    const result = await pool.query(`
        SELECT
            c.id AS category_id,
            c.name AS category_name,
            c.commission_rate AS category_rate,
            COUNT(DISTINCT oi.order_id) AS order_count,
            SUM(oi.unit_price * oi.quantity) AS total_revenue,
            SUM(oi.platform_commission) AS total_commission,
            AVG(oi.platform_commission * 100.0 / NULLIF(oi.unit_price * oi.quantity, 0)) AS effective_rate
        FROM cyberspace.categories c
        LEFT JOIN cyberspace.products p ON p.category_id = c.id
        LEFT JOIN cyberspace.order_items oi ON oi.product_id = p.id
        LEFT JOIN cyberspace.orders o ON o.id = oi.order_id
        WHERE o.status NOT IN ('cancelled', 'refunded')
        ${dateFilter}
        GROUP BY c.id
        ORDER BY total_commission DESC NULLS LAST
    `, params);

    return result.rows;
}

/**
 * Get top vendors by commission generated
 */
async function getTopVendorsByCommission(limit = 10, dateRange = {}) {
    const { startDate, endDate } = dateRange;

    let dateFilter = '';
    const params = [limit];

    if (startDate) {
        params.push(startDate);
        dateFilter += ` AND o.created_at >= $${params.length}`;
    }
    if (endDate) {
        params.push(endDate);
        dateFilter += ` AND o.created_at <= $${params.length}`;
    }

    const result = await pool.query(`
        SELECT
            v.id AS vendor_id,
            v.company_name AS vendor_name,
            v.commission_tier,
            v.commission_rate,
            COUNT(DISTINCT o.id) AS order_count,
            SUM(oi.unit_price * oi.quantity) AS total_revenue,
            SUM(oi.platform_commission) AS commission_generated,
            SUM(oi.vendor_payout) AS vendor_earnings
        FROM cyberspace.vendors v
        JOIN cyberspace.products p ON p.vendor_id = v.id
        JOIN cyberspace.order_items oi ON oi.product_id = p.id
        JOIN cyberspace.orders o ON o.id = oi.order_id
        WHERE o.status NOT IN ('cancelled', 'refunded')
        ${dateFilter}
        GROUP BY v.id
        ORDER BY commission_generated DESC
        LIMIT $1
    `, params);

    return result.rows;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Core calculation
    calculateCommission,
    calculateOrderCommission,

    // Tier management
    updateVendorTiers,
    DEFAULT_COMMISSION,
    VENDOR_TIERS,

    // Rules management
    createCommissionRule,
    getCommissionRules,
    deactivateRule,

    // Analytics
    getCommissionStats,
    getCommissionByCategory,
    getTopVendorsByCommission
};
