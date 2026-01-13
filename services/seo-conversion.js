/**
 * SEO & CONVERSION OPTIMIZATION SERVICE
 * High-ROI Marketing Tools for CYBERSPACE
 *
 * Features:
 * - Automated SEO Meta Generation
 * - Schema.org Structured Data
 * - Open Graph & Twitter Cards
 * - Conversion Tracking & Analytics
 * - A/B Testing Framework
 * - ROI Calculation Engine
 *
 * Enterprise Universe - West Money Bau GmbH
 */

const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// ═══════════════════════════════════════════════════════════════
// SEO META GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate SEO meta tags for a product
 */
function generateProductMeta(product, options = {}) {
    const { baseUrl = 'https://enterprise-universe.de', locale = 'de_DE' } = options;

    const title = product.seo_title || `${product.name} | CYBERSPACE Marketplace`;
    const description = product.seo_description ||
        product.short_description ||
        `${product.name} - Jetzt kaufen bei CYBERSPACE. ${product.description?.substring(0, 140)}...`;

    const price = (product.price / 100).toFixed(2);
    const image = product.images?.[0] || `${baseUrl}/images/product-default.jpg`;
    const url = `${baseUrl}/produkte/${product.slug}`;

    return {
        // Basic Meta
        title,
        description: description.substring(0, 160),
        keywords: product.seo_keywords || generateKeywords(product),
        canonical: url,

        // Open Graph
        og: {
            title,
            description,
            type: 'product',
            url,
            image,
            locale,
            site_name: 'CYBERSPACE by Enterprise Universe',
            'product:price:amount': price,
            'product:price:currency': 'EUR',
            'product:availability': product.stock_quantity > 0 ? 'in stock' : 'out of stock',
            'product:condition': 'new',
            'product:brand': product.vendor_name || 'Enterprise Universe'
        },

        // Twitter Card
        twitter: {
            card: 'summary_large_image',
            site: '@enterpriseuniverse',
            title,
            description,
            image
        },

        // Structured Data (JSON-LD)
        jsonLd: generateProductSchema(product, baseUrl)
    };
}

/**
 * Generate Schema.org Product structured data
 */
function generateProductSchema(product, baseUrl) {
    const price = (product.price / 100).toFixed(2);

    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description || product.short_description,
        image: product.images || [],
        sku: product.sku,
        brand: {
            '@type': 'Brand',
            name: product.vendor_name || 'Enterprise Universe'
        },
        offers: {
            '@type': 'Offer',
            url: `${baseUrl}/produkte/${product.slug}`,
            priceCurrency: 'EUR',
            price: price,
            priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            availability: product.stock_quantity > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            seller: {
                '@type': 'Organization',
                name: product.vendor_name || 'Enterprise Universe'
            }
        },
        aggregateRating: product.review_count > 0 ? {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.review_count
        } : undefined,
        category: product.category_name
    };
}

/**
 * Generate keywords from product data
 */
function generateKeywords(product) {
    const keywords = [
        product.name,
        product.category_name,
        product.vendor_name,
        product.product_type,
        'kaufen',
        'bestellen',
        'online',
        'Smart Home',
        'Enterprise Universe'
    ].filter(Boolean);

    // Add from attributes
    if (product.attributes) {
        Object.values(product.attributes).forEach(val => {
            if (typeof val === 'string') keywords.push(val);
        });
    }

    return [...new Set(keywords)].join(', ');
}

/**
 * Generate Organization schema for homepage
 */
function generateOrganizationSchema(options = {}) {
    const { baseUrl = 'https://enterprise-universe.de' } = options;

    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Enterprise Universe',
        alternateName: 'CYBERSPACE Marketplace',
        url: baseUrl,
        logo: `${baseUrl}/images/logo.png`,
        sameAs: [
            'https://www.linkedin.com/company/enterprise-universe',
            'https://www.instagram.com/enterpriseuniverse',
            'https://www.facebook.com/enterpriseuniverse'
        ],
        contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+49-XXX-XXXXXXX',
            contactType: 'customer service',
            availableLanguage: ['German', 'English']
        },
        address: {
            '@type': 'PostalAddress',
            streetAddress: 'Musterstraße 1',
            addressLocality: 'Berlin',
            postalCode: '10115',
            addressCountry: 'DE'
        }
    };
}

/**
 * Generate BreadcrumbList schema
 */
function generateBreadcrumbSchema(breadcrumbs, baseUrl = 'https://enterprise-universe.de') {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: crumb.name,
            item: `${baseUrl}${crumb.url}`
        }))
    };
}

// ═══════════════════════════════════════════════════════════════
// CONVERSION TRACKING
// ═══════════════════════════════════════════════════════════════

/**
 * Track conversion event
 */
async function trackConversion(eventData) {
    const {
        eventType,      // page_view, product_view, add_to_cart, checkout_start, purchase, signup
        sessionId,
        userId,
        productId,
        orderId,
        value,          // in cents
        source,         // utm_source
        medium,         // utm_medium
        campaign,       // utm_campaign
        referrer,
        landingPage,
        device,
        metadata = {}
    } = eventData;

    const result = await pool.query(`
        INSERT INTO cyberspace.conversion_events (
            event_type, session_id, user_id, product_id, order_id,
            value, source, medium, campaign, referrer, landing_page,
            device, metadata, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
    `, [
        eventType, sessionId, userId, productId, orderId,
        value, source, medium, campaign, referrer, landingPage,
        device, JSON.stringify(metadata), metadata.ip, metadata.userAgent
    ]);

    return result.rows[0];
}

/**
 * Generate conversion funnel report
 */
async function getConversionFunnel(dateRange = {}) {
    const { startDate, endDate } = dateRange;

    let dateFilter = '';
    const params = [];

    if (startDate) {
        params.push(startDate);
        dateFilter += ` AND created_at >= $${params.length}`;
    }
    if (endDate) {
        params.push(endDate);
        dateFilter += ` AND created_at <= $${params.length}`;
    }

    const result = await pool.query(`
        SELECT
            event_type,
            COUNT(*) AS event_count,
            COUNT(DISTINCT session_id) AS unique_sessions,
            SUM(value) AS total_value
        FROM cyberspace.conversion_events
        WHERE 1=1 ${dateFilter}
        GROUP BY event_type
        ORDER BY
            CASE event_type
                WHEN 'page_view' THEN 1
                WHEN 'product_view' THEN 2
                WHEN 'add_to_cart' THEN 3
                WHEN 'checkout_start' THEN 4
                WHEN 'purchase' THEN 5
                ELSE 6
            END
    `, params);

    const funnel = result.rows;

    // Calculate conversion rates
    const pageViews = funnel.find(f => f.event_type === 'page_view')?.unique_sessions || 0;
    const productViews = funnel.find(f => f.event_type === 'product_view')?.unique_sessions || 0;
    const addToCarts = funnel.find(f => f.event_type === 'add_to_cart')?.unique_sessions || 0;
    const checkouts = funnel.find(f => f.event_type === 'checkout_start')?.unique_sessions || 0;
    const purchases = funnel.find(f => f.event_type === 'purchase')?.unique_sessions || 0;

    return {
        funnel,
        conversionRates: {
            viewToProduct: pageViews ? ((productViews / pageViews) * 100).toFixed(2) : 0,
            productToCart: productViews ? ((addToCarts / productViews) * 100).toFixed(2) : 0,
            cartToCheckout: addToCarts ? ((checkouts / addToCarts) * 100).toFixed(2) : 0,
            checkoutToPurchase: checkouts ? ((purchases / checkouts) * 100).toFixed(2) : 0,
            overallConversion: pageViews ? ((purchases / pageViews) * 100).toFixed(2) : 0
        }
    };
}

/**
 * Get conversion by traffic source
 */
async function getConversionBySource(dateRange = {}) {
    const { startDate, endDate } = dateRange;

    let dateFilter = '';
    const params = [];

    if (startDate) {
        params.push(startDate);
        dateFilter += ` AND created_at >= $${params.length}`;
    }
    if (endDate) {
        params.push(endDate);
        dateFilter += ` AND created_at <= $${params.length}`;
    }

    const result = await pool.query(`
        WITH source_stats AS (
            SELECT
                COALESCE(source, 'direct') AS source,
                COALESCE(medium, 'none') AS medium,
                COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
                COUNT(*) FILTER (WHERE event_type = 'purchase') AS purchases,
                SUM(value) FILTER (WHERE event_type = 'purchase') AS revenue
            FROM cyberspace.conversion_events
            WHERE 1=1 ${dateFilter}
            GROUP BY source, medium
        )
        SELECT
            source,
            medium,
            page_views,
            purchases,
            revenue,
            CASE WHEN page_views > 0
                THEN ROUND((purchases::DECIMAL / page_views) * 100, 2)
                ELSE 0
            END AS conversion_rate,
            CASE WHEN purchases > 0
                THEN ROUND(revenue::DECIMAL / purchases, 2)
                ELSE 0
            END AS avg_order_value
        FROM source_stats
        WHERE page_views > 0
        ORDER BY revenue DESC NULLS LAST
    `, params);

    return result.rows;
}

// ═══════════════════════════════════════════════════════════════
// ROI CALCULATION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate ROI for marketing campaigns
 */
async function calculateCampaignROI(campaignId, dateRange = {}) {
    const { startDate, endDate } = dateRange;

    let dateFilter = '';
    const params = [campaignId];

    if (startDate) {
        params.push(startDate);
        dateFilter += ` AND ce.created_at >= $${params.length}`;
    }
    if (endDate) {
        params.push(endDate);
        dateFilter += ` AND ce.created_at <= $${params.length}`;
    }

    // Get campaign performance
    const performanceResult = await pool.query(`
        SELECT
            COUNT(*) FILTER (WHERE event_type = 'page_view') AS impressions,
            COUNT(DISTINCT session_id) AS unique_visitors,
            COUNT(*) FILTER (WHERE event_type = 'purchase') AS conversions,
            SUM(value) FILTER (WHERE event_type = 'purchase') AS revenue
        FROM cyberspace.conversion_events ce
        WHERE campaign = $1 ${dateFilter}
    `, params);

    const performance = performanceResult.rows[0];

    // Get campaign cost (from marketing_campaigns table if exists)
    const costResult = await pool.query(`
        SELECT budget, spent FROM cyberspace.marketing_campaigns WHERE id = $1
    `, [campaignId]);

    const campaignCost = costResult.rows[0]?.spent || 0;
    const revenue = parseInt(performance.revenue || 0);

    // Calculate metrics
    const roi = campaignCost > 0
        ? ((revenue - campaignCost) / campaignCost * 100).toFixed(2)
        : 0;

    const cpa = performance.conversions > 0
        ? (campaignCost / performance.conversions / 100).toFixed(2)
        : 0;

    const roas = campaignCost > 0
        ? (revenue / campaignCost).toFixed(2)
        : 0;

    return {
        campaignId,
        performance: {
            impressions: parseInt(performance.impressions),
            uniqueVisitors: parseInt(performance.unique_visitors),
            conversions: parseInt(performance.conversions),
            revenue: revenue / 100  // Convert to EUR
        },
        costs: {
            total: campaignCost / 100,
            perAcquisition: parseFloat(cpa)
        },
        metrics: {
            roi: parseFloat(roi),           // Return on Investment %
            roas: parseFloat(roas),         // Return on Ad Spend
            conversionRate: performance.unique_visitors > 0
                ? ((performance.conversions / performance.unique_visitors) * 100).toFixed(2)
                : 0
        }
    };
}

/**
 * Calculate Customer Lifetime Value
 */
async function calculateCLV(customerId) {
    const result = await pool.query(`
        SELECT
            COUNT(*) AS total_orders,
            SUM(total_amount) AS total_revenue,
            AVG(total_amount) AS avg_order_value,
            MIN(created_at) AS first_order,
            MAX(created_at) AS last_order,
            EXTRACT(DAY FROM MAX(created_at) - MIN(created_at)) AS customer_lifespan_days
        FROM cyberspace.orders
        WHERE customer_id = $1 AND status NOT IN ('cancelled', 'refunded')
    `, [customerId]);

    const stats = result.rows[0];

    // Calculate average purchase frequency (orders per month)
    const lifespanMonths = Math.max(stats.customer_lifespan_days / 30, 1);
    const purchaseFrequency = stats.total_orders / lifespanMonths;

    // Estimate CLV (simple model: AOV * Frequency * Projected Lifespan)
    const avgOrderValue = parseInt(stats.avg_order_value || 0) / 100;
    const projectedLifespan = 24; // 24 months projected customer lifespan
    const estimatedCLV = avgOrderValue * purchaseFrequency * projectedLifespan;

    return {
        customerId,
        historicalValue: parseInt(stats.total_revenue || 0) / 100,
        totalOrders: parseInt(stats.total_orders),
        avgOrderValue,
        purchaseFrequency: purchaseFrequency.toFixed(2),
        customerSince: stats.first_order,
        lastOrder: stats.last_order,
        estimatedCLV: estimatedCLV.toFixed(2)
    };
}

/**
 * Get ROI overview dashboard
 */
async function getROIDashboard(dateRange = {}) {
    const { startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate = new Date() } = dateRange;

    // Total revenue & costs
    const revenueResult = await pool.query(`
        SELECT
            SUM(total_amount) AS total_revenue,
            SUM(platform_commission) AS platform_revenue,
            COUNT(*) AS total_orders,
            AVG(total_amount) AS aov
        FROM cyberspace.orders
        WHERE created_at BETWEEN $1 AND $2
          AND status NOT IN ('cancelled', 'refunded')
    `, [startDate, endDate]);

    // Marketing costs
    const costsResult = await pool.query(`
        SELECT SUM(spent) AS marketing_spend
        FROM cyberspace.marketing_campaigns
        WHERE created_at BETWEEN $1 AND $2
    `, [startDate, endDate]);

    // Conversion funnel
    const funnel = await getConversionFunnel({ startDate, endDate });

    // Source performance
    const sources = await getConversionBySource({ startDate, endDate });

    const revenue = parseInt(revenueResult.rows[0].total_revenue || 0);
    const platformRevenue = parseInt(revenueResult.rows[0].platform_revenue || 0);
    const marketingSpend = parseInt(costsResult.rows[0].marketing_spend || 0);

    return {
        period: { startDate, endDate },
        revenue: {
            total: revenue / 100,
            platform: platformRevenue / 100,
            orders: parseInt(revenueResult.rows[0].total_orders || 0),
            aov: (parseInt(revenueResult.rows[0].aov || 0) / 100).toFixed(2)
        },
        costs: {
            marketing: marketingSpend / 100
        },
        roi: {
            overall: marketingSpend > 0
                ? (((platformRevenue - marketingSpend) / marketingSpend) * 100).toFixed(2)
                : 'N/A',
            roas: marketingSpend > 0
                ? (revenue / marketingSpend).toFixed(2)
                : 'N/A'
        },
        funnel,
        topSources: sources.slice(0, 5)
    };
}

// ═══════════════════════════════════════════════════════════════
// A/B TESTING FRAMEWORK
// ═══════════════════════════════════════════════════════════════

/**
 * Create A/B test experiment
 */
async function createExperiment(experimentData) {
    const {
        name,
        description,
        type,           // landing_page, cta, pricing, layout
        variants,       // [{name: 'Control', weight: 50}, {name: 'Variant A', weight: 50}]
        targetPage,
        startDate,
        endDate,
        goalMetric      // conversion, revenue, engagement
    } = experimentData;

    const result = await pool.query(`
        INSERT INTO cyberspace.ab_experiments
        (name, description, type, variants, target_page, start_date, end_date, goal_metric)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
    `, [name, description, type, JSON.stringify(variants), targetPage, startDate, endDate, goalMetric]);

    return result.rows[0];
}

/**
 * Assign user to experiment variant
 */
async function assignVariant(experimentId, sessionId) {
    // Check if already assigned
    const existingResult = await pool.query(`
        SELECT variant FROM cyberspace.ab_assignments
        WHERE experiment_id = $1 AND session_id = $2
    `, [experimentId, sessionId]);

    if (existingResult.rows.length > 0) {
        return existingResult.rows[0].variant;
    }

    // Get experiment variants
    const experimentResult = await pool.query(`
        SELECT variants FROM cyberspace.ab_experiments
        WHERE id = $1 AND status = 'active'
          AND (start_date IS NULL OR start_date <= CURRENT_TIMESTAMP)
          AND (end_date IS NULL OR end_date >= CURRENT_TIMESTAMP)
    `, [experimentId]);

    if (experimentResult.rows.length === 0) {
        return null;
    }

    const variants = experimentResult.rows[0].variants;

    // Weighted random selection
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedVariant = variants[0].name;

    for (const variant of variants) {
        random -= variant.weight;
        if (random <= 0) {
            selectedVariant = variant.name;
            break;
        }
    }

    // Record assignment
    await pool.query(`
        INSERT INTO cyberspace.ab_assignments (experiment_id, session_id, variant)
        VALUES ($1, $2, $3)
    `, [experimentId, sessionId, selectedVariant]);

    return selectedVariant;
}

/**
 * Record experiment conversion
 */
async function recordExperimentConversion(experimentId, sessionId, value = 0) {
    await pool.query(`
        UPDATE cyberspace.ab_assignments
        SET converted = TRUE, conversion_value = $3, converted_at = CURRENT_TIMESTAMP
        WHERE experiment_id = $1 AND session_id = $2
    `, [experimentId, sessionId, value]);
}

/**
 * Get experiment results
 */
async function getExperimentResults(experimentId) {
    const result = await pool.query(`
        SELECT
            variant,
            COUNT(*) AS participants,
            COUNT(*) FILTER (WHERE converted = TRUE) AS conversions,
            SUM(conversion_value) FILTER (WHERE converted = TRUE) AS total_value,
            ROUND(COUNT(*) FILTER (WHERE converted = TRUE)::DECIMAL / COUNT(*) * 100, 2) AS conversion_rate,
            ROUND(AVG(conversion_value) FILTER (WHERE converted = TRUE), 2) AS avg_value
        FROM cyberspace.ab_assignments
        WHERE experiment_id = $1
        GROUP BY variant
    `, [experimentId]);

    const variants = result.rows;

    // Calculate statistical significance (simplified)
    if (variants.length >= 2) {
        const control = variants.find(v => v.variant === 'Control') || variants[0];
        const challenger = variants.find(v => v.variant !== 'Control') || variants[1];

        const controlRate = parseFloat(control.conversion_rate);
        const challengerRate = parseFloat(challenger.conversion_rate);
        const lift = controlRate > 0 ? ((challengerRate - controlRate) / controlRate * 100).toFixed(2) : 0;

        return {
            experimentId,
            variants,
            comparison: {
                controlVariant: control.variant,
                challengerVariant: challenger.variant,
                lift: `${lift}%`,
                winner: challengerRate > controlRate ? challenger.variant : control.variant,
                confidence: calculateConfidence(control, challenger)
            }
        };
    }

    return { experimentId, variants };
}

/**
 * Simplified confidence calculation
 */
function calculateConfidence(control, challenger) {
    const n1 = parseInt(control.participants);
    const n2 = parseInt(challenger.participants);
    const p1 = parseInt(control.conversions) / n1;
    const p2 = parseInt(challenger.conversions) / n2;

    if (n1 < 30 || n2 < 30) return 'Insufficient data';

    const pooledP = (parseInt(control.conversions) + parseInt(challenger.conversions)) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));
    const z = Math.abs(p2 - p1) / se;

    if (z > 2.58) return '99%';
    if (z > 1.96) return '95%';
    if (z > 1.64) return '90%';
    return 'Not significant';
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // SEO
    generateProductMeta,
    generateProductSchema,
    generateOrganizationSchema,
    generateBreadcrumbSchema,
    generateKeywords,

    // Conversion Tracking
    trackConversion,
    getConversionFunnel,
    getConversionBySource,

    // ROI
    calculateCampaignROI,
    calculateCLV,
    getROIDashboard,

    // A/B Testing
    createExperiment,
    assignVariant,
    recordExperimentConversion,
    getExperimentResults
};
