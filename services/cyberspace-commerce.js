/**
 * CYBERSPACE COMMERCE SERVICE
 * Core marketplace functionality for products, carts, orders
 *
 * Enterprise Universe - West Money Bau GmbH
 */

const { Pool } = require('pg');
const crypto = require('crypto');
const commissionCalculator = require('./commission-calculator');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// ═══════════════════════════════════════════════════════════════
// PRODUCT MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new product
 */
async function createProduct(productData) {
    const {
        vendorId,
        categoryId,
        name,
        slug,
        description,
        shortDescription,
        productType = 'physical',
        price,
        compareAtPrice,
        costPrice,
        sku,
        barcode,
        stockQuantity = 0,
        lowStockThreshold = 5,
        trackInventory = true,
        allowBackorder = false,
        weight,
        dimensions,
        images = [],
        attributes = {},
        seoTitle,
        seoDescription,
        seoKeywords
    } = productData;

    // Generate slug if not provided
    const finalSlug = slug || generateSlug(name);

    const result = await pool.query(`
        INSERT INTO cyberspace.products (
            vendor_id, category_id, name, slug, description, short_description,
            product_type, price, compare_at_price, cost_price, sku, barcode,
            stock_quantity, low_stock_threshold, track_inventory, allow_backorder,
            weight, dimensions, images, attributes,
            seo_title, seo_description, seo_keywords
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        )
        RETURNING *
    `, [
        vendorId, categoryId, name, finalSlug, description, shortDescription,
        productType, price, compareAtPrice, costPrice, sku, barcode,
        stockQuantity, lowStockThreshold, trackInventory, allowBackorder,
        weight, JSON.stringify(dimensions), JSON.stringify(images), JSON.stringify(attributes),
        seoTitle, seoDescription, seoKeywords ? JSON.stringify(seoKeywords) : null
    ]);

    // Update category product count
    await pool.query(`
        UPDATE cyberspace.categories
        SET product_count = product_count + 1
        WHERE id = $1
    `, [categoryId]);

    return result.rows[0];
}

/**
 * Get product by ID or slug
 */
async function getProduct(identifier, options = {}) {
    const { includeVariants = true, includeReviews = false, includeVendor = true } = options;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    let query = `
        SELECT
            p.*,
            c.name AS category_name,
            c.slug AS category_slug
            ${includeVendor ? `, v.company_name AS vendor_name, v.logo_url AS vendor_logo, v.rating AS vendor_rating` : ''}
        FROM cyberspace.products p
        LEFT JOIN cyberspace.categories c ON p.category_id = c.id
        ${includeVendor ? 'LEFT JOIN cyberspace.vendors v ON p.vendor_id = v.id' : ''}
        WHERE ${isUuid ? 'p.id = $1' : 'p.slug = $1'}
    `;

    const result = await pool.query(query, [identifier]);

    if (result.rows.length === 0) {
        return null;
    }

    const product = result.rows[0];

    // Get variants if requested
    if (includeVariants) {
        const variantsResult = await pool.query(`
            SELECT * FROM cyberspace.product_variants
            WHERE product_id = $1
            ORDER BY sort_order, created_at
        `, [product.id]);
        product.variants = variantsResult.rows;
    }

    // Get reviews if requested
    if (includeReviews) {
        const reviewsResult = await pool.query(`
            SELECT
                r.*,
                cu.first_name, cu.last_name
            FROM cyberspace.reviews r
            LEFT JOIN bau.customers cu ON r.customer_id = cu.id
            WHERE r.product_id = $1 AND r.status = 'approved'
            ORDER BY r.created_at DESC
            LIMIT 10
        `, [product.id]);
        product.reviews = reviewsResult.rows;
    }

    return product;
}

/**
 * Search and list products with filters
 */
async function searchProducts(filters = {}) {
    const {
        query,
        categoryId,
        categorySlug,
        vendorId,
        productType,
        minPrice,
        maxPrice,
        inStock = null,
        featured = null,
        status = 'active',
        sortBy = 'created_at',
        sortOrder = 'DESC',
        page = 1,
        limit = 20
    } = filters;

    let whereClause = ['1=1'];
    const params = [];

    if (status) {
        params.push(status);
        whereClause.push(`p.status = $${params.length}`);
    }

    if (query) {
        params.push(`%${query}%`);
        whereClause.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
    }

    if (categoryId) {
        params.push(categoryId);
        whereClause.push(`p.category_id = $${params.length}`);
    }

    if (categorySlug) {
        params.push(categorySlug);
        whereClause.push(`c.slug = $${params.length}`);
    }

    if (vendorId) {
        params.push(vendorId);
        whereClause.push(`p.vendor_id = $${params.length}`);
    }

    if (productType) {
        params.push(productType);
        whereClause.push(`p.product_type = $${params.length}`);
    }

    if (minPrice !== undefined) {
        params.push(minPrice);
        whereClause.push(`p.price >= $${params.length}`);
    }

    if (maxPrice !== undefined) {
        params.push(maxPrice);
        whereClause.push(`p.price <= $${params.length}`);
    }

    if (inStock === true) {
        whereClause.push(`(p.track_inventory = FALSE OR p.stock_quantity > 0 OR p.allow_backorder = TRUE)`);
    }

    if (featured !== null) {
        params.push(featured);
        whereClause.push(`p.is_featured = $${params.length}`);
    }

    // Validate sort column
    const allowedSorts = ['created_at', 'price', 'name', 'rating', 'total_sales'];
    const finalSort = allowedSorts.includes(sortBy) ? sortBy : 'created_at';
    const finalOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await pool.query(`
        SELECT COUNT(*) as total
        FROM cyberspace.products p
        LEFT JOIN cyberspace.categories c ON p.category_id = c.id
        WHERE ${whereClause.join(' AND ')}
    `, params);

    // Get products
    const productsResult = await pool.query(`
        SELECT
            p.id, p.name, p.slug, p.short_description, p.product_type,
            p.price, p.compare_at_price, p.images, p.rating, p.review_count,
            p.stock_quantity, p.track_inventory, p.is_featured,
            c.name AS category_name, c.slug AS category_slug,
            v.company_name AS vendor_name
        FROM cyberspace.products p
        LEFT JOIN cyberspace.categories c ON p.category_id = c.id
        LEFT JOIN cyberspace.vendors v ON p.vendor_id = v.id
        WHERE ${whereClause.join(' AND ')}
        ORDER BY p.${finalSort} ${finalOrder}
        LIMIT ${limit} OFFSET ${offset}
    `, params);

    return {
        products: productsResult.rows,
        pagination: {
            page,
            limit,
            total: parseInt(countResult.rows[0].total),
            totalPages: Math.ceil(countResult.rows[0].total / limit)
        }
    };
}

/**
 * Update product
 */
async function updateProduct(productId, updates) {
    const allowedFields = [
        'name', 'slug', 'description', 'short_description', 'category_id',
        'product_type', 'price', 'compare_at_price', 'cost_price',
        'sku', 'barcode', 'stock_quantity', 'low_stock_threshold',
        'track_inventory', 'allow_backorder', 'weight', 'dimensions',
        'images', 'attributes', 'seo_title', 'seo_description', 'seo_keywords',
        'status', 'is_featured', 'commission_override'
    ];

    const setClauses = [];
    const params = [productId];

    for (const [key, value] of Object.entries(updates)) {
        const snakeKey = camelToSnake(key);
        if (allowedFields.includes(snakeKey)) {
            params.push(typeof value === 'object' ? JSON.stringify(value) : value);
            setClauses.push(`${snakeKey} = $${params.length}`);
        }
    }

    if (setClauses.length === 0) {
        throw new Error('No valid fields to update');
    }

    const result = await pool.query(`
        UPDATE cyberspace.products
        SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
    `, params);

    return result.rows[0];
}

// ═══════════════════════════════════════════════════════════════
// CART MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get or create cart for customer/session
 */
async function getOrCreateCart(customerId = null, sessionId = null) {
    if (!customerId && !sessionId) {
        sessionId = crypto.randomUUID();
    }

    // Try to find existing cart
    let query = customerId
        ? `SELECT * FROM cyberspace.carts WHERE customer_id = $1 AND status = 'active' ORDER BY updated_at DESC LIMIT 1`
        : `SELECT * FROM cyberspace.carts WHERE session_id = $1 AND status = 'active' ORDER BY updated_at DESC LIMIT 1`;

    let result = await pool.query(query, [customerId || sessionId]);

    if (result.rows.length > 0) {
        return result.rows[0];
    }

    // Create new cart
    result = await pool.query(`
        INSERT INTO cyberspace.carts (customer_id, session_id)
        VALUES ($1, $2)
        RETURNING *
    `, [customerId, sessionId]);

    return result.rows[0];
}

/**
 * Add item to cart
 */
async function addToCart(cartId, productId, quantity = 1, variantId = null) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get product info
        const productResult = await client.query(`
            SELECT id, name, price, stock_quantity, track_inventory, allow_backorder, vendor_id
            FROM cyberspace.products
            WHERE id = $1 AND status = 'active'
        `, [productId]);

        if (productResult.rows.length === 0) {
            throw new Error('Product not found or not available');
        }

        const product = productResult.rows[0];

        // Check variant if specified
        let variantPrice = null;
        if (variantId) {
            const variantResult = await client.query(`
                SELECT id, price, stock_quantity, track_inventory
                FROM cyberspace.product_variants
                WHERE id = $1 AND product_id = $2
            `, [variantId, productId]);

            if (variantResult.rows.length === 0) {
                throw new Error('Variant not found');
            }

            const variant = variantResult.rows[0];
            if (variant.price) variantPrice = variant.price;

            // Check variant stock
            if (variant.track_inventory && variant.stock_quantity < quantity) {
                throw new Error(`Insufficient stock for variant. Available: ${variant.stock_quantity}`);
            }
        } else {
            // Check product stock
            if (product.track_inventory && product.stock_quantity < quantity && !product.allow_backorder) {
                throw new Error(`Insufficient stock. Available: ${product.stock_quantity}`);
            }
        }

        const unitPrice = variantPrice || product.price;

        // Check if item already in cart
        const existingItem = await client.query(`
            SELECT id, quantity FROM cyberspace.cart_items
            WHERE cart_id = $1 AND product_id = $2 AND COALESCE(variant_id, '00000000-0000-0000-0000-000000000000') = COALESCE($3, '00000000-0000-0000-0000-000000000000')
        `, [cartId, productId, variantId]);

        let cartItem;

        if (existingItem.rows.length > 0) {
            // Update quantity
            const newQuantity = existingItem.rows[0].quantity + quantity;
            const itemResult = await client.query(`
                UPDATE cyberspace.cart_items
                SET quantity = $1, unit_price = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *
            `, [newQuantity, unitPrice, existingItem.rows[0].id]);
            cartItem = itemResult.rows[0];
        } else {
            // Insert new item
            const itemResult = await client.query(`
                INSERT INTO cyberspace.cart_items (cart_id, product_id, variant_id, vendor_id, quantity, unit_price)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [cartId, productId, variantId, product.vendor_id, quantity, unitPrice]);
            cartItem = itemResult.rows[0];
        }

        // Update cart totals
        await updateCartTotals(client, cartId);

        await client.query('COMMIT');

        return cartItem;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Update cart item quantity
 */
async function updateCartItem(cartId, itemId, quantity) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        if (quantity <= 0) {
            // Remove item
            await client.query(`
                DELETE FROM cyberspace.cart_items WHERE id = $1 AND cart_id = $2
            `, [itemId, cartId]);
        } else {
            await client.query(`
                UPDATE cyberspace.cart_items
                SET quantity = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2 AND cart_id = $3
            `, [quantity, itemId, cartId]);
        }

        await updateCartTotals(client, cartId);
        await client.query('COMMIT');

        return await getCartWithItems(cartId);

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Remove item from cart
 */
async function removeFromCart(cartId, itemId) {
    return updateCartItem(cartId, itemId, 0);
}

/**
 * Get cart with all items
 */
async function getCartWithItems(cartId) {
    const cartResult = await pool.query(`
        SELECT * FROM cyberspace.carts WHERE id = $1
    `, [cartId]);

    if (cartResult.rows.length === 0) {
        return null;
    }

    const cart = cartResult.rows[0];

    const itemsResult = await pool.query(`
        SELECT
            ci.*,
            p.name AS product_name,
            p.slug AS product_slug,
            p.images AS product_images,
            p.stock_quantity AS available_stock,
            pv.name AS variant_name,
            pv.attributes AS variant_attributes,
            v.company_name AS vendor_name
        FROM cyberspace.cart_items ci
        JOIN cyberspace.products p ON ci.product_id = p.id
        LEFT JOIN cyberspace.product_variants pv ON ci.variant_id = pv.id
        LEFT JOIN cyberspace.vendors v ON ci.vendor_id = v.id
        WHERE ci.cart_id = $1
        ORDER BY ci.created_at
    `, [cartId]);

    cart.items = itemsResult.rows;
    return cart;
}

/**
 * Apply discount code to cart
 */
async function applyDiscount(cartId, discountCode) {
    const client = await pool.connect();

    try {
        // Find discount
        const discountResult = await client.query(`
            SELECT * FROM cyberspace.discounts
            WHERE code = $1
              AND is_active = TRUE
              AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP)
              AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)
              AND (usage_limit IS NULL OR usage_count < usage_limit)
        `, [discountCode.toUpperCase()]);

        if (discountResult.rows.length === 0) {
            throw new Error('Invalid or expired discount code');
        }

        const discount = discountResult.rows[0];

        // Get cart
        const cart = await getCartWithItems(cartId);
        if (!cart) {
            throw new Error('Cart not found');
        }

        // Check minimum purchase
        if (discount.minimum_purchase && cart.subtotal < discount.minimum_purchase) {
            throw new Error(`Minimum purchase of €${(discount.minimum_purchase / 100).toFixed(2)} required`);
        }

        // Apply discount
        await client.query(`
            UPDATE cyberspace.carts
            SET discount_code = $1, discount_id = $2
            WHERE id = $3
        `, [discountCode.toUpperCase(), discount.id, cartId]);

        await updateCartTotals(client, cartId);

        return await getCartWithItems(cartId);

    } finally {
        client.release();
    }
}

/**
 * Update cart totals (internal helper)
 */
async function updateCartTotals(client, cartId) {
    // Calculate subtotal
    const subtotalResult = await client.query(`
        SELECT COALESCE(SUM(quantity * unit_price), 0) AS subtotal
        FROM cyberspace.cart_items
        WHERE cart_id = $1
    `, [cartId]);

    const subtotal = parseInt(subtotalResult.rows[0].subtotal);

    // Get discount if any
    const cartResult = await client.query(`
        SELECT discount_id FROM cyberspace.carts WHERE id = $1
    `, [cartId]);

    let discountAmount = 0;

    if (cartResult.rows[0]?.discount_id) {
        const discountResult = await client.query(`
            SELECT discount_type, discount_value, max_discount
            FROM cyberspace.discounts
            WHERE id = $1
        `, [cartResult.rows[0].discount_id]);

        if (discountResult.rows.length > 0) {
            const discount = discountResult.rows[0];
            if (discount.discount_type === 'percentage') {
                discountAmount = Math.round(subtotal * discount.discount_value / 100);
                if (discount.max_discount) {
                    discountAmount = Math.min(discountAmount, discount.max_discount);
                }
            } else if (discount.discount_type === 'fixed') {
                discountAmount = discount.discount_value;
            }
        }
    }

    // Calculate total (shipping calculated at checkout)
    const total = subtotal - discountAmount;

    await client.query(`
        UPDATE cyberspace.carts
        SET subtotal = $1, discount_amount = $2, total = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
    `, [subtotal, discountAmount, total, cartId]);
}

// ═══════════════════════════════════════════════════════════════
// ORDER MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Create order from cart
 */
async function createOrder(cartId, orderData) {
    const {
        customerId,
        shippingAddress,
        billingAddress,
        shippingMethod,
        shippingCost = 0,
        paymentMethod,
        notes,
        affiliateCode
    } = orderData;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get cart with items
        const cart = await getCartWithItems(cartId);
        if (!cart || cart.items.length === 0) {
            throw new Error('Cart is empty');
        }

        // Calculate commissions
        const items = cart.items.map(item => ({
            productId: item.product_id,
            vendorId: item.vendor_id,
            quantity: item.quantity,
            unitPrice: item.unit_price
        }));

        const commissionResult = await commissionCalculator.calculateOrderCommission(items, affiliateCode);

        // Create order
        const orderResult = await client.query(`
            INSERT INTO cyberspace.orders (
                customer_id, subtotal, discount_code, discount_amount,
                shipping_cost, tax_amount, total_amount, platform_commission,
                shipping_address, billing_address, shipping_method,
                payment_method, affiliate_id, affiliate_commission, notes
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
            )
            RETURNING *
        `, [
            customerId,
            cart.subtotal,
            cart.discount_code,
            cart.discount_amount,
            shippingCost,
            0, // Tax calculated separately if needed
            cart.total + shippingCost,
            commissionResult.summary.platformCommissionCents,
            JSON.stringify(shippingAddress),
            JSON.stringify(billingAddress || shippingAddress),
            shippingMethod,
            paymentMethod,
            commissionResult.items[0]?.affiliate?.id || null,
            commissionResult.summary.affiliateCommissionCents,
            notes
        ]);

        const order = orderResult.rows[0];

        // Create order items with commission breakdown
        for (const item of commissionResult.items) {
            await client.query(`
                INSERT INTO cyberspace.order_items (
                    order_id, product_id, variant_id, vendor_id,
                    product_name, variant_name, quantity, unit_price,
                    subtotal, platform_commission, vendor_payout
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
                order.id,
                item.product.id,
                null, // variant_id from cart item
                item.vendor.id,
                item.product.name,
                null, // variant_name
                item.quantity,
                item.unitPrice,
                item.quantity * item.unitPrice,
                item.amounts.platformCommissionCents,
                item.amounts.vendorPayoutCents
            ]);

            // Update product sales count and stock
            await client.query(`
                UPDATE cyberspace.products
                SET total_sales = total_sales + $1,
                    stock_quantity = CASE WHEN track_inventory THEN stock_quantity - $1 ELSE stock_quantity END
                WHERE id = $2
            `, [item.quantity, item.product.id]);
        }

        // Mark cart as converted
        await client.query(`
            UPDATE cyberspace.carts
            SET status = 'converted', order_id = $1
            WHERE id = $2
        `, [order.id, cartId]);

        // Update vendor total sales
        for (const payout of commissionResult.vendorPayouts) {
            await client.query(`
                UPDATE cyberspace.vendors
                SET total_sales = total_sales + $1, total_orders = total_orders + 1
                WHERE id = $2
            `, [payout.totalPayout, payout.vendorId]);
        }

        // Track affiliate click if applicable
        if (affiliateCode && commissionResult.items[0]?.affiliate) {
            await client.query(`
                UPDATE cyberspace.affiliate_clicks
                SET converted = TRUE, conversion_order_id = $1
                WHERE affiliate_id = $2 AND converted = FALSE
                ORDER BY clicked_at DESC LIMIT 1
            `, [order.id, commissionResult.items[0].affiliate.id]);
        }

        await client.query('COMMIT');

        return {
            order,
            commission: commissionResult.summary,
            vendorPayouts: commissionResult.vendorPayouts
        };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Get order by ID
 */
async function getOrder(orderId, options = {}) {
    const { includeItems = true, includeCustomer = false } = options;

    let query = `
        SELECT o.*
        ${includeCustomer ? `, c.email, c.first_name, c.last_name, c.phone` : ''}
        FROM cyberspace.orders o
        ${includeCustomer ? 'LEFT JOIN bau.customers c ON o.customer_id = c.id' : ''}
        WHERE o.id = $1
    `;

    const result = await pool.query(query, [orderId]);

    if (result.rows.length === 0) {
        return null;
    }

    const order = result.rows[0];

    if (includeItems) {
        const itemsResult = await pool.query(`
            SELECT
                oi.*,
                p.slug AS product_slug,
                p.images AS product_images,
                v.company_name AS vendor_name
            FROM cyberspace.order_items oi
            LEFT JOIN cyberspace.products p ON oi.product_id = p.id
            LEFT JOIN cyberspace.vendors v ON oi.vendor_id = v.id
            WHERE oi.order_id = $1
        `, [orderId]);

        order.items = itemsResult.rows;
    }

    return order;
}

/**
 * Update order status
 */
async function updateOrderStatus(orderId, status, metadata = {}) {
    const validStatuses = [
        'pending', 'confirmed', 'processing', 'shipped',
        'delivered', 'completed', 'cancelled', 'refunded'
    ];

    if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
    }

    const updates = { status };

    // Add timestamps for specific statuses
    if (status === 'confirmed') updates.confirmed_at = new Date();
    if (status === 'shipped') {
        updates.shipped_at = new Date();
        if (metadata.trackingNumber) updates.tracking_number = metadata.trackingNumber;
        if (metadata.trackingUrl) updates.tracking_url = metadata.trackingUrl;
    }
    if (status === 'delivered') updates.delivered_at = new Date();
    if (status === 'completed') updates.completed_at = new Date();
    if (status === 'cancelled') updates.cancelled_at = new Date();
    if (status === 'refunded') updates.refunded_at = new Date();

    const setClauses = Object.keys(updates).map((key, i) => `${camelToSnake(key)} = $${i + 2}`);
    const values = Object.values(updates);

    const result = await pool.query(`
        UPDATE cyberspace.orders
        SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
    `, [orderId, ...values]);

    return result.rows[0];
}

/**
 * List orders with filters
 */
async function listOrders(filters = {}) {
    const {
        customerId,
        vendorId,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20
    } = filters;

    let whereClause = ['1=1'];
    const params = [];

    if (customerId) {
        params.push(customerId);
        whereClause.push(`o.customer_id = $${params.length}`);
    }

    if (vendorId) {
        params.push(vendorId);
        whereClause.push(`EXISTS (SELECT 1 FROM cyberspace.order_items oi WHERE oi.order_id = o.id AND oi.vendor_id = $${params.length})`);
    }

    if (status) {
        params.push(status);
        whereClause.push(`o.status = $${params.length}`);
    }

    if (startDate) {
        params.push(startDate);
        whereClause.push(`o.created_at >= $${params.length}`);
    }

    if (endDate) {
        params.push(endDate);
        whereClause.push(`o.created_at <= $${params.length}`);
    }

    const offset = (page - 1) * limit;

    const countResult = await pool.query(`
        SELECT COUNT(*) AS total
        FROM cyberspace.orders o
        WHERE ${whereClause.join(' AND ')}
    `, params);

    const ordersResult = await pool.query(`
        SELECT
            o.*,
            c.email AS customer_email,
            c.first_name AS customer_first_name,
            c.last_name AS customer_last_name
        FROM cyberspace.orders o
        LEFT JOIN bau.customers c ON o.customer_id = c.id
        WHERE ${whereClause.join(' AND ')}
        ORDER BY o.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
    `, params);

    return {
        orders: ordersResult.rows,
        pagination: {
            page,
            limit,
            total: parseInt(countResult.rows[0].total),
            totalPages: Math.ceil(countResult.rows[0].total / limit)
        }
    };
}

// ═══════════════════════════════════════════════════════════════
// VENDOR MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Register new vendor
 */
async function registerVendor(vendorData) {
    const {
        email,
        companyName,
        companyType,
        taxId,
        contactName,
        contactPhone,
        description,
        logoUrl,
        bannerUrl,
        categories = []
    } = vendorData;

    // Check if email already registered
    const existingResult = await pool.query(
        'SELECT id FROM cyberspace.vendors WHERE email = $1',
        [email]
    );

    if (existingResult.rows.length > 0) {
        throw new Error('Email already registered as vendor');
    }

    const result = await pool.query(`
        INSERT INTO cyberspace.vendors (
            email, company_name, company_type, tax_id,
            contact_name, contact_phone, description,
            logo_url, banner_url, categories
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
    `, [
        email, companyName, companyType, taxId,
        contactName, contactPhone, description,
        logoUrl, bannerUrl, JSON.stringify(categories)
    ]);

    return result.rows[0];
}

/**
 * Get vendor by ID
 */
async function getVendor(vendorId) {
    const result = await pool.query(`
        SELECT
            v.*,
            (SELECT COUNT(*) FROM cyberspace.products p WHERE p.vendor_id = v.id AND p.status = 'active') AS active_products
        FROM cyberspace.vendors v
        WHERE v.id = $1
    `, [vendorId]);

    return result.rows[0] || null;
}

/**
 * Update vendor status
 */
async function updateVendorStatus(vendorId, status, reason = null) {
    const validStatuses = ['pending', 'approved', 'active', 'suspended', 'rejected'];

    if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
    }

    const result = await pool.query(`
        UPDATE cyberspace.vendors
        SET status = $1,
            verified_at = CASE WHEN $1 = 'approved' THEN CURRENT_TIMESTAMP ELSE verified_at END,
            rejection_reason = CASE WHEN $1 = 'rejected' THEN $2 ELSE NULL END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
    `, [status, reason, vendorId]);

    return result.rows[0];
}

// ═══════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get all categories
 */
async function getCategories(parentId = null) {
    const result = await pool.query(`
        SELECT *
        FROM cyberspace.categories
        WHERE parent_id ${parentId ? '= $1' : 'IS NULL'} AND is_active = TRUE
        ORDER BY sort_order, name
    `, parentId ? [parentId] : []);

    return result.rows;
}

/**
 * Get category tree
 */
async function getCategoryTree() {
    const result = await pool.query(`
        SELECT * FROM cyberspace.categories WHERE is_active = TRUE ORDER BY sort_order, name
    `);

    const categories = result.rows;
    const tree = [];
    const map = {};

    // Create map
    categories.forEach(cat => {
        map[cat.id] = { ...cat, children: [] };
    });

    // Build tree
    categories.forEach(cat => {
        if (cat.parent_id && map[cat.parent_id]) {
            map[cat.parent_id].children.push(map[cat.id]);
        } else if (!cat.parent_id) {
            tree.push(map[cat.id]);
        }
    });

    return tree;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function generateSlug(text) {
    return text
        .toLowerCase()
        .replace(/[äöüß]/g, match => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[match]))
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + crypto.randomBytes(3).toString('hex');
}

function camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Products
    createProduct,
    getProduct,
    searchProducts,
    updateProduct,

    // Cart
    getOrCreateCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    getCartWithItems,
    applyDiscount,

    // Orders
    createOrder,
    getOrder,
    updateOrderStatus,
    listOrders,

    // Vendors
    registerVendor,
    getVendor,
    updateVendorStatus,

    // Categories
    getCategories,
    getCategoryTree
};
