/**
 * CYBERSPACE MARKETPLACE API
 * E-Commerce endpoints for products, vendors, orders
 *
 * Mount at: /api/v1/cyberspace
 * Port: 3017 (standalone) or mounted on bau-server
 *
 * Enterprise Universe - West Money Bau GmbH
 */

const express = require('express');
const Joi = require('joi');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Services
const commerce = require('../../services/cyberspace-commerce');
const commissions = require('../../services/commission-calculator');
const stripeCommerce = require('../../services/stripe-commerce');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

/**
 * Request validation middleware
 */
function validate(schema, property = 'body') {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], { abortEarly: false });
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.details.map(d => d.message)
            });
        }
        req[property] = value;
        next();
    };
}

/**
 * Async handler wrapper
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Auth middleware placeholder - integrate with your auth system
 */
function requireAuth(role = null) {
    return (req, res, next) => {
        // TODO: Implement actual auth check
        // For now, check for API key or session
        const apiKey = req.headers['x-api-key'];
        const session = req.headers['authorization'];

        if (!apiKey && !session) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        // Mock user for development
        req.user = {
            id: req.headers['x-user-id'] || 'dev-user',
            role: req.headers['x-user-role'] || 'customer',
            vendorId: req.headers['x-vendor-id'] || null
        };

        if (role && req.user.role !== role && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions'
            });
        }

        next();
    };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

const schemas = {
    // Products
    createProduct: Joi.object({
        vendorId: Joi.string().uuid().required(),
        categoryId: Joi.string().uuid().required(),
        name: Joi.string().min(3).max(255).required(),
        slug: Joi.string().max(255),
        description: Joi.string().max(10000),
        shortDescription: Joi.string().max(500),
        productType: Joi.string().valid('physical', 'digital', 'service', 'subscription'),
        price: Joi.number().integer().min(0).required(), // in cents
        compareAtPrice: Joi.number().integer().min(0),
        costPrice: Joi.number().integer().min(0),
        sku: Joi.string().max(100),
        stockQuantity: Joi.number().integer().min(0),
        images: Joi.array().items(Joi.string().uri()),
        attributes: Joi.object()
    }),

    updateProduct: Joi.object({
        name: Joi.string().min(3).max(255),
        description: Joi.string().max(10000),
        price: Joi.number().integer().min(0),
        stockQuantity: Joi.number().integer().min(0),
        status: Joi.string().valid('draft', 'active', 'archived'),
        isFeatured: Joi.boolean()
    }),

    searchProducts: Joi.object({
        query: Joi.string().max(200),
        categoryId: Joi.string().uuid(),
        categorySlug: Joi.string(),
        vendorId: Joi.string().uuid(),
        productType: Joi.string(),
        minPrice: Joi.number().integer().min(0),
        maxPrice: Joi.number().integer().min(0),
        inStock: Joi.boolean(),
        featured: Joi.boolean(),
        sortBy: Joi.string().valid('created_at', 'price', 'name', 'rating', 'total_sales'),
        sortOrder: Joi.string().valid('ASC', 'DESC'),
        page: Joi.number().integer().min(1),
        limit: Joi.number().integer().min(1).max(100)
    }),

    // Cart
    addToCart: Joi.object({
        productId: Joi.string().uuid().required(),
        quantity: Joi.number().integer().min(1).default(1),
        variantId: Joi.string().uuid()
    }),

    updateCartItem: Joi.object({
        quantity: Joi.number().integer().min(0).required()
    }),

    applyDiscount: Joi.object({
        code: Joi.string().max(50).required()
    }),

    // Checkout
    checkout: Joi.object({
        shippingAddress: Joi.object({
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
            street: Joi.string().required(),
            city: Joi.string().required(),
            postalCode: Joi.string().required(),
            country: Joi.string().default('DE'),
            phone: Joi.string()
        }).required(),
        billingAddress: Joi.object(),
        shippingMethod: Joi.string(),
        shippingCost: Joi.number().integer().min(0).default(0),
        notes: Joi.string().max(1000),
        affiliateCode: Joi.string().max(50)
    }),

    // Vendors
    registerVendor: Joi.object({
        email: Joi.string().email().required(),
        companyName: Joi.string().min(2).max(255).required(),
        companyType: Joi.string().valid('individual', 'company').default('company'),
        taxId: Joi.string().max(50),
        contactName: Joi.string().max(200),
        contactPhone: Joi.string().max(50),
        description: Joi.string().max(2000),
        categories: Joi.array().items(Joi.string().uuid())
    }),

    // Reviews
    createReview: Joi.object({
        productId: Joi.string().uuid().required(),
        rating: Joi.number().integer().min(1).max(5).required(),
        title: Joi.string().max(200),
        content: Joi.string().max(2000),
        images: Joi.array().items(Joi.string().uri()).max(5)
    }),

    // Commission Rules
    createCommissionRule: Joi.object({
        name: Joi.string().max(200).required(),
        appliesTo: Joi.string().valid('product', 'category', 'vendor', 'global').required(),
        targetId: Joi.string().uuid().when('appliesTo', {
            is: 'global',
            then: Joi.forbidden(),
            otherwise: Joi.required()
        }),
        rate: Joi.number().min(0).max(100).required(),
        priority: Joi.number().integer().default(0),
        reason: Joi.string().max(500),
        validFrom: Joi.date(),
        validUntil: Joi.date()
    })
};

// ═══════════════════════════════════════════════════════════════
// PRODUCTS ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /products
 * Search and list products
 */
router.get('/products', validate(schemas.searchProducts, 'query'), asyncHandler(async (req, res) => {
    const result = await commerce.searchProducts(req.query);

    res.json({
        success: true,
        ...result
    });
}));

/**
 * GET /products/:id
 * Get single product
 */
router.get('/products/:id', asyncHandler(async (req, res) => {
    const product = await commerce.getProduct(req.params.id, {
        includeVariants: req.query.variants !== 'false',
        includeReviews: req.query.reviews === 'true',
        includeVendor: req.query.vendor !== 'false'
    });

    if (!product) {
        return res.status(404).json({
            success: false,
            error: 'Product not found'
        });
    }

    res.json({
        success: true,
        product
    });
}));

/**
 * POST /products
 * Create new product (vendor only)
 */
router.post('/products',
    requireAuth('vendor'),
    validate(schemas.createProduct),
    asyncHandler(async (req, res) => {
        // Ensure vendor can only create for themselves
        if (req.user.vendorId && req.body.vendorId !== req.user.vendorId) {
            return res.status(403).json({
                success: false,
                error: 'Cannot create product for another vendor'
            });
        }

        const product = await commerce.createProduct(req.body);

        res.status(201).json({
            success: true,
            product
        });
    })
);

/**
 * PUT /products/:id
 * Update product (vendor only)
 */
router.put('/products/:id',
    requireAuth('vendor'),
    validate(schemas.updateProduct),
    asyncHandler(async (req, res) => {
        const product = await commerce.updateProduct(req.params.id, req.body);

        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        res.json({
            success: true,
            product
        });
    })
);

// ═══════════════════════════════════════════════════════════════
// CATEGORIES ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /categories
 * List all categories
 */
router.get('/categories', asyncHandler(async (req, res) => {
    const categories = req.query.tree === 'true'
        ? await commerce.getCategoryTree()
        : await commerce.getCategories(req.query.parentId);

    res.json({
        success: true,
        categories
    });
}));

// ═══════════════════════════════════════════════════════════════
// CART ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /cart
 * Get current cart
 */
router.get('/cart', asyncHandler(async (req, res) => {
    const customerId = req.headers['x-customer-id'];
    const sessionId = req.headers['x-session-id'];

    const cart = await commerce.getOrCreateCart(customerId, sessionId);
    const cartWithItems = await commerce.getCartWithItems(cart.id);

    res.json({
        success: true,
        cart: cartWithItems
    });
}));

/**
 * POST /cart/items
 * Add item to cart
 */
router.post('/cart/items',
    validate(schemas.addToCart),
    asyncHandler(async (req, res) => {
        const customerId = req.headers['x-customer-id'];
        const sessionId = req.headers['x-session-id'];

        const cart = await commerce.getOrCreateCart(customerId, sessionId);
        const item = await commerce.addToCart(
            cart.id,
            req.body.productId,
            req.body.quantity,
            req.body.variantId
        );

        const updatedCart = await commerce.getCartWithItems(cart.id);

        res.json({
            success: true,
            item,
            cart: updatedCart
        });
    })
);

/**
 * PUT /cart/items/:itemId
 * Update cart item quantity
 */
router.put('/cart/items/:itemId',
    validate(schemas.updateCartItem),
    asyncHandler(async (req, res) => {
        const customerId = req.headers['x-customer-id'];
        const sessionId = req.headers['x-session-id'];

        const cart = await commerce.getOrCreateCart(customerId, sessionId);
        const updatedCart = await commerce.updateCartItem(
            cart.id,
            req.params.itemId,
            req.body.quantity
        );

        res.json({
            success: true,
            cart: updatedCart
        });
    })
);

/**
 * DELETE /cart/items/:itemId
 * Remove item from cart
 */
router.delete('/cart/items/:itemId', asyncHandler(async (req, res) => {
    const customerId = req.headers['x-customer-id'];
    const sessionId = req.headers['x-session-id'];

    const cart = await commerce.getOrCreateCart(customerId, sessionId);
    const updatedCart = await commerce.removeFromCart(cart.id, req.params.itemId);

    res.json({
        success: true,
        cart: updatedCart
    });
}));

/**
 * POST /cart/discount
 * Apply discount code
 */
router.post('/cart/discount',
    validate(schemas.applyDiscount),
    asyncHandler(async (req, res) => {
        const customerId = req.headers['x-customer-id'];
        const sessionId = req.headers['x-session-id'];

        const cart = await commerce.getOrCreateCart(customerId, sessionId);
        const updatedCart = await commerce.applyDiscount(cart.id, req.body.code);

        res.json({
            success: true,
            cart: updatedCart
        });
    })
);

// ═══════════════════════════════════════════════════════════════
// CHECKOUT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /checkout
 * Create order and payment session
 */
router.post('/checkout',
    validate(schemas.checkout),
    asyncHandler(async (req, res) => {
        const customerId = req.headers['x-customer-id'];
        const sessionId = req.headers['x-session-id'];

        const cart = await commerce.getOrCreateCart(customerId, sessionId);
        const cartWithItems = await commerce.getCartWithItems(cart.id);

        if (!cartWithItems.items || cartWithItems.items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Cart is empty'
            });
        }

        // Create order
        const orderResult = await commerce.createOrder(cart.id, {
            customerId,
            shippingAddress: req.body.shippingAddress,
            billingAddress: req.body.billingAddress,
            shippingMethod: req.body.shippingMethod,
            shippingCost: req.body.shippingCost,
            notes: req.body.notes,
            affiliateCode: req.body.affiliateCode
        });

        // Create Stripe checkout session
        const checkoutItems = cartWithItems.items.map(item => ({
            productId: item.product_id,
            productName: item.product_name,
            unitPrice: item.unit_price,
            quantity: item.quantity,
            vendorId: item.vendor_id
        }));

        const checkoutSession = await stripeCommerce.createMarketplaceCheckout({
            orderId: orderResult.order.id,
            customerId,
            customerEmail: req.body.shippingAddress.email,
            items: checkoutItems,
            platformCommission: orderResult.commission.platformCommissionCents,
            affiliateCommission: orderResult.commission.affiliateCommissionCents || 0,
            shippingCost: req.body.shippingCost,
            discountAmount: cartWithItems.discount_amount || 0
        });

        res.json({
            success: true,
            order: orderResult.order,
            checkoutUrl: checkoutSession.url,
            sessionId: checkoutSession.id
        });
    })
);

// ═══════════════════════════════════════════════════════════════
// ORDERS ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /orders
 * List orders (filtered by user type)
 */
router.get('/orders',
    requireAuth(),
    asyncHandler(async (req, res) => {
        const filters = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            status: req.query.status,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        // Filter by role
        if (req.user.role === 'customer') {
            filters.customerId = req.user.id;
        } else if (req.user.role === 'vendor') {
            filters.vendorId = req.user.vendorId;
        }

        const result = await commerce.listOrders(filters);

        res.json({
            success: true,
            ...result
        });
    })
);

/**
 * GET /orders/:id
 * Get order details
 */
router.get('/orders/:id',
    requireAuth(),
    asyncHandler(async (req, res) => {
        const order = await commerce.getOrder(req.params.id, {
            includeItems: true,
            includeCustomer: req.user.role === 'admin' || req.user.role === 'vendor'
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Authorization check
        if (req.user.role === 'customer' && order.customer_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        res.json({
            success: true,
            order
        });
    })
);

/**
 * PUT /orders/:id/status
 * Update order status (admin/vendor only)
 */
router.put('/orders/:id/status',
    requireAuth('vendor'),
    asyncHandler(async (req, res) => {
        const { status, trackingNumber, trackingUrl } = req.body;

        const order = await commerce.updateOrderStatus(req.params.id, status, {
            trackingNumber,
            trackingUrl
        });

        res.json({
            success: true,
            order
        });
    })
);

// ═══════════════════════════════════════════════════════════════
// VENDOR ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /vendors/register
 * Register as a vendor
 */
router.post('/vendors/register',
    validate(schemas.registerVendor),
    asyncHandler(async (req, res) => {
        const vendor = await commerce.registerVendor(req.body);

        res.status(201).json({
            success: true,
            vendor,
            message: 'Registration submitted. Pending verification.'
        });
    })
);

/**
 * GET /vendors/:id
 * Get vendor profile
 */
router.get('/vendors/:id', asyncHandler(async (req, res) => {
    const vendor = await commerce.getVendor(req.params.id);

    if (!vendor) {
        return res.status(404).json({
            success: false,
            error: 'Vendor not found'
        });
    }

    // Remove sensitive info for public view
    if (!req.headers['x-vendor-id'] || req.headers['x-vendor-id'] !== req.params.id) {
        delete vendor.stripe_account_id;
        delete vendor.tax_id;
        delete vendor.payout_details;
    }

    res.json({
        success: true,
        vendor
    });
}));

/**
 * POST /vendors/:id/stripe-connect
 * Start Stripe Connect onboarding
 */
router.post('/vendors/:id/stripe-connect',
    requireAuth('vendor'),
    asyncHandler(async (req, res) => {
        // Create or get Stripe Connect account
        const vendor = await commerce.getVendor(req.params.id);

        if (!vendor) {
            return res.status(404).json({
                success: false,
                error: 'Vendor not found'
            });
        }

        let accountLink;

        if (!vendor.stripe_account_id) {
            // Create new Connect account
            await stripeCommerce.createVendorConnectAccount({
                vendorId: vendor.id,
                email: vendor.email,
                companyName: vendor.company_name,
                companyType: vendor.company_type
            });
        }

        // Generate onboarding link
        accountLink = await stripeCommerce.createVendorOnboardingLink(vendor.id);

        res.json({
            success: true,
            onboardingUrl: accountLink.url,
            expiresAt: new Date(accountLink.expires_at * 1000)
        });
    })
);

/**
 * GET /vendors/:id/stripe-status
 * Get Stripe Connect status
 */
router.get('/vendors/:id/stripe-status',
    requireAuth('vendor'),
    asyncHandler(async (req, res) => {
        const status = await stripeCommerce.getVendorAccountStatus(req.params.id);

        res.json({
            success: true,
            status
        });
    })
);

/**
 * GET /vendors/:id/payouts
 * Get vendor payout history
 */
router.get('/vendors/:id/payouts',
    requireAuth('vendor'),
    asyncHandler(async (req, res) => {
        const result = await stripeCommerce.getVendorPayouts(req.params.id, {
            status: req.query.status,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20
        });

        res.json({
            success: true,
            ...result
        });
    })
);

/**
 * GET /vendors/:id/dashboard
 * Get vendor dashboard stats
 */
router.get('/vendors/:id/dashboard',
    requireAuth('vendor'),
    asyncHandler(async (req, res) => {
        const vendorId = req.params.id;

        // Get various stats
        const [orders, payouts, products] = await Promise.all([
            commerce.listOrders({ vendorId, limit: 5 }),
            stripeCommerce.getVendorPayouts(vendorId, { limit: 5 }),
            commerce.searchProducts({ vendorId, limit: 100 })
        ]);

        res.json({
            success: true,
            dashboard: {
                recentOrders: orders.orders,
                totalOrders: orders.pagination.total,
                recentPayouts: payouts.payouts,
                payoutTotals: payouts.totals,
                totalProducts: products.pagination.total,
                activeProducts: products.products.filter(p => p.status === 'active').length
            }
        });
    })
);

// ═══════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /admin/stats
 * Platform statistics
 */
router.get('/admin/stats',
    requireAuth('admin'),
    asyncHandler(async (req, res) => {
        const dateRange = {
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const [commissionStats, paymentStats, categoryStats, topVendors] = await Promise.all([
            commissions.getCommissionStats(dateRange),
            stripeCommerce.getPaymentAnalytics(dateRange),
            commissions.getCommissionByCategory(dateRange),
            commissions.getTopVendorsByCommission(10, dateRange)
        ]);

        res.json({
            success: true,
            stats: {
                commissions: commissionStats,
                payments: paymentStats,
                categories: categoryStats,
                topVendors
            }
        });
    })
);

/**
 * PUT /admin/vendors/:id/status
 * Update vendor status (approve/reject)
 */
router.put('/admin/vendors/:id/status',
    requireAuth('admin'),
    asyncHandler(async (req, res) => {
        const { status, reason } = req.body;

        const vendor = await commerce.updateVendorStatus(req.params.id, status, reason);

        res.json({
            success: true,
            vendor
        });
    })
);

/**
 * POST /admin/commission-rules
 * Create commission rule
 */
router.post('/admin/commission-rules',
    requireAuth('admin'),
    validate(schemas.createCommissionRule),
    asyncHandler(async (req, res) => {
        const rule = await commissions.createCommissionRule({
            ...req.body,
            createdBy: req.user.id
        });

        res.status(201).json({
            success: true,
            rule
        });
    })
);

/**
 * GET /admin/commission-rules
 * List commission rules
 */
router.get('/admin/commission-rules',
    requireAuth('admin'),
    asyncHandler(async (req, res) => {
        const rules = await commissions.getCommissionRules({
            isActive: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
            appliesTo: req.query.appliesTo
        });

        res.json({
            success: true,
            rules
        });
    })
);

/**
 * POST /admin/payouts/process
 * Trigger pending payouts processing
 */
router.post('/admin/payouts/process',
    requireAuth('admin'),
    asyncHandler(async (req, res) => {
        const result = await stripeCommerce.processPendingPayouts();

        res.json({
            success: true,
            ...result
        });
    })
);

// ═══════════════════════════════════════════════════════════════
// WEBHOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /webhooks/stripe
 * Handle Stripe webhooks
 */
router.post('/webhooks/stripe',
    express.raw({ type: 'application/json' }),
    asyncHandler(async (req, res) => {
        const signature = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_CYBERSPACE_WEBHOOK_SECRET;

        try {
            const result = await stripeCommerce.handleMarketplaceWebhook(
                req.body,
                signature,
                webhookSecret
            );

            console.log('[Stripe Webhook]', result.type, result.id || '');

            res.json({ received: true });
        } catch (error) {
            console.error('[Stripe Webhook Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    })
);

// ═══════════════════════════════════════════════════════════════
// AFFILIATES ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /affiliates/register
 * Register as affiliate
 */
router.post('/affiliates/register', asyncHandler(async (req, res) => {
    const { email, name, websiteUrl, payoutMethod, payoutDetails } = req.body;
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    // Generate unique tracking code
    const trackingCode = require('crypto').randomBytes(6).toString('hex').toUpperCase();

    const result = await pool.query(`
        INSERT INTO cyberspace.affiliates
        (email, name, website_url, tracking_code, payout_method, payout_details)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, name, tracking_code, status
    `, [email, name, websiteUrl, trackingCode, payoutMethod, JSON.stringify(payoutDetails)]);

    res.status(201).json({
        success: true,
        affiliate: result.rows[0]
    });
}));

/**
 * POST /affiliates/track
 * Track affiliate click
 */
router.post('/affiliates/track', asyncHandler(async (req, res) => {
    const { code, referrerUrl, landingUrl } = req.body;
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    // Find affiliate
    const affiliateResult = await pool.query(
        'SELECT id FROM cyberspace.affiliates WHERE tracking_code = $1 AND status = $2',
        [code, 'active']
    );

    if (affiliateResult.rows.length === 0) {
        return res.status(404).json({
            success: false,
            error: 'Invalid affiliate code'
        });
    }

    // Record click
    await pool.query(`
        INSERT INTO cyberspace.affiliate_clicks
        (affiliate_id, referrer_url, landing_url, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5)
    `, [
        affiliateResult.rows[0].id,
        referrerUrl,
        landingUrl,
        req.ip,
        req.headers['user-agent']
    ]);

    // Update total clicks
    await pool.query(
        'UPDATE cyberspace.affiliates SET total_clicks = total_clicks + 1 WHERE id = $1',
        [affiliateResult.rows[0].id]
    );

    res.json({
        success: true,
        affiliateId: affiliateResult.rows[0].id
    });
}));

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════

router.use((err, req, res, next) => {
    console.error('[Cyberspace API Error]', err.message);
    console.error(err.stack);

    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = router;

// Standalone server option
if (require.main === module) {
    const app = express();
    const PORT = process.env.CYBERSPACE_PORT || 3017;

    app.use(express.json());
    app.use('/api/v1/cyberspace', router);

    app.listen(PORT, () => {
        console.log(`[CYBERSPACE API] Running on port ${PORT}`);
    });
}
