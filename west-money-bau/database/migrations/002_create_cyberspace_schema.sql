-- Enterprise-Universe CYBERSPACE Marketplace Schema
-- Version: 1.0.0
-- Date: 2026-01-12
-- Description: E-Commerce marketplace with multi-vendor support, commission system, and product catalog

-- Create schema
CREATE SCHEMA IF NOT EXISTS cyberspace;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VENDORS (Sellers on the marketplace)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cyberspace.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,  -- Reference to main users table if exists

    -- Business Information
    vendor_name VARCHAR(255) NOT NULL,
    vendor_slug VARCHAR(100) UNIQUE NOT NULL,
    business_type VARCHAR(50) DEFAULT 'individual', -- individual, company, enterprise
    legal_name VARCHAR(255),
    tax_id VARCHAR(50),  -- USt-IdNr for Germany
    handelsregister VARCHAR(100),  -- HRB number

    -- Contact Information
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    website VARCHAR(500),

    -- Address
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_zip VARCHAR(20),
    address_country VARCHAR(100) DEFAULT 'DE',

    -- Branding
    logo_url VARCHAR(500),
    banner_url VARCHAR(500),
    description TEXT,
    short_description VARCHAR(500),

    -- Categories
    primary_category UUID,
    secondary_categories UUID[],

    -- Status & Verification
    status VARCHAR(50) DEFAULT 'pending', -- pending, active, suspended, rejected, banned
    verification_status VARCHAR(50) DEFAULT 'unverified', -- unverified, documents_submitted, verified, meisterbrief_verified
    verified_at TIMESTAMP,
    verification_documents JSONB DEFAULT '{}', -- {gewerbeschein, handwerksausweis, meisterbrief, insurance}

    -- Stripe Connect Integration
    stripe_connect_id VARCHAR(100),
    stripe_connect_status VARCHAR(50), -- pending, active, restricted
    stripe_charges_enabled BOOLEAN DEFAULT FALSE,
    stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
    stripe_onboarding_url VARCHAR(500),

    -- Commission Settings (individual override)
    commission_rate DECIMAL(5,2) DEFAULT 10.00, -- Default 10%
    commission_tier VARCHAR(50) DEFAULT 'standard', -- standard, silver, gold, platinum, enterprise

    -- Performance Metrics
    rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    total_revenue DECIMAL(14,2) DEFAULT 0,
    total_products INTEGER DEFAULT 0,

    -- HubSpot Integration
    hubspot_company_id VARCHAR(50),

    -- Settings
    settings JSONB DEFAULT '{}', -- notification_preferences, auto_accept_orders, etc.

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- CATEGORIES (Product/Service categories with hierarchical structure)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cyberspace.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES cyberspace.categories(id) ON DELETE SET NULL,

    -- Basic Info
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),  -- Icon name or emoji
    image_url VARCHAR(500),

    -- Commission Override (category-specific)
    commission_rate DECIMAL(5,2), -- NULL = use vendor rate

    -- Display Settings
    display_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- SEO
    seo_title VARCHAR(200),
    seo_description TEXT,

    -- Stats
    product_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PRODUCTS (All product types: physical, digital, service, subscription)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cyberspace.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES cyberspace.vendors(id) ON DELETE SET NULL,
    category_id UUID REFERENCES cyberspace.categories(id) ON DELETE SET NULL,

    -- Basic Information
    sku VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    short_description VARCHAR(500),
    description TEXT,

    -- Product Type
    product_type VARCHAR(50) NOT NULL, -- physical, digital, service, subscription

    -- Pricing
    price DECIMAL(12,2) NOT NULL,
    compare_at_price DECIMAL(12,2),  -- Original price for discounts
    cost_price DECIMAL(12,2),  -- Vendor's cost (for margin calculation)
    currency VARCHAR(3) DEFAULT 'EUR',

    -- Tax (German VAT)
    tax_rate DECIMAL(5,2) DEFAULT 19.00, -- 19% standard, 7% reduced
    tax_included BOOLEAN DEFAULT TRUE,
    tax_class VARCHAR(50) DEFAULT 'standard', -- standard, reduced, zero

    -- Inventory (for physical products)
    track_inventory BOOLEAN DEFAULT FALSE,
    inventory_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    allow_backorder BOOLEAN DEFAULT FALSE,

    -- Shipping (for physical products)
    requires_shipping BOOLEAN DEFAULT FALSE,
    weight_kg DECIMAL(10,3),
    dimensions_cm JSONB, -- {length, width, height}
    shipping_class VARCHAR(50), -- standard, bulky, fragile

    -- Digital Products
    download_url VARCHAR(500),
    download_limit INTEGER,
    download_expiry_days INTEGER,

    -- Services
    duration_minutes INTEGER,
    booking_required BOOLEAN DEFAULT FALSE,
    service_area_km INTEGER, -- Service radius in km

    -- Subscription
    subscription_interval VARCHAR(20), -- day, week, month, year
    subscription_interval_count INTEGER DEFAULT 1,
    trial_days INTEGER DEFAULT 0,

    -- Status & Visibility
    status VARCHAR(50) DEFAULT 'draft', -- draft, pending_review, active, archived, rejected
    visibility VARCHAR(50) DEFAULT 'visible', -- visible, hidden, catalog_only
    rejection_reason TEXT,

    -- Media
    featured_image_url VARCHAR(500),
    gallery_urls TEXT[],
    video_url VARCHAR(500),

    -- SEO
    seo_title VARCHAR(200),
    seo_description TEXT,

    -- Performance Metrics
    views_count INTEGER DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,

    -- Tags & Attributes
    tags TEXT[],
    attributes JSONB DEFAULT '{}', -- {brand, material, color, etc.}
    specifications JSONB DEFAULT '{}', -- Technical specs

    -- Commission Override (product-specific)
    commission_rate DECIMAL(5,2), -- NULL = use category/vendor rate

    -- Dates
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PRODUCT VARIANTS (Size, Color, etc.)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cyberspace.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES cyberspace.products(id) ON DELETE CASCADE,

    sku VARCHAR(100),
    name VARCHAR(255),

    -- Options (e.g., {color: 'Schwarz', size: 'L'})
    options JSONB NOT NULL,

    -- Pricing (NULL = use parent product price)
    price DECIMAL(12,2),
    compare_at_price DECIMAL(12,2),

    -- Inventory
    inventory_quantity INTEGER DEFAULT 0,

    -- Shipping
    weight_kg DECIMAL(10,3),

    -- Media
    image_url VARCHAR(500),

    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SHOPPING CARTS
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cyberspace.carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Owner (authenticated user OR anonymous session)
    user_id UUID,
    session_id VARCHAR(100),

    -- Totals (recalculated on changes)
    subtotal DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    shipping_amount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) DEFAULT 0,

    currency VARCHAR(3) DEFAULT 'EUR',

    -- Applied Discounts
    discount_code VARCHAR(50),
    discount_id UUID,

    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, abandoned, converted, merged

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- CART ITEMS
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cyberspace.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID REFERENCES cyberspace.carts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES cyberspace.products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES cyberspace.product_variants(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES cyberspace.vendors(id) ON DELETE SET NULL,

    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),

    -- Price snapshot at time of adding
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,

    -- Custom options/notes
    custom_options JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ORDERS
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cyberspace.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,

    -- Customer Information
    user_id UUID,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    customer_name VARCHAR(255),

    -- Billing Address
    billing_first_name VARCHAR(100),
    billing_last_name VARCHAR(100),
    billing_company VARCHAR(255),
    billing_street VARCHAR(255),
    billing_city VARCHAR(100),
    billing_zip VARCHAR(20),
    billing_country VARCHAR(100) DEFAULT 'DE',

    -- Shipping Address (if different)
    shipping_first_name VARCHAR(100),
    shipping_last_name VARCHAR(100),
    shipping_company VARCHAR(255),
    shipping_street VARCHAR(255),
    shipping_city VARCHAR(100),
    shipping_zip VARCHAR(20),
    shipping_country VARCHAR(100) DEFAULT 'DE',

    -- Totals
    subtotal DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    shipping_amount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,

    -- Platform Commission (total across all items)
    platform_commission DECIMAL(12,2) DEFAULT 0,

    currency VARCHAR(3) DEFAULT 'EUR',

    -- Order Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, processing, shipped, delivered, cancelled, refunded
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, authorized, paid, failed, refunded, partially_refunded
    fulfillment_status VARCHAR(50) DEFAULT 'unfulfilled', -- unfulfilled, partial, fulfilled

    -- Payment Information
    stripe_payment_intent_id VARCHAR(100),
    stripe_checkout_session_id VARCHAR(100),
    payment_method VARCHAR(50), -- card, sepa_debit, giropay, sofort, klarna, paypal
    paid_at TIMESTAMP,

    -- Discount
    discount_code VARCHAR(50),

    -- Notes
    customer_notes TEXT,
    internal_notes TEXT,

    -- Tracking
    ip_address VARCHAR(50),
    user_agent TEXT,
    source VARCHAR(100), -- website, app, api, partner
    affiliate_id UUID,

    -- HubSpot Integration
    hubspot_deal_id VARCHAR(50),

    -- Dates
    confirmed_at TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ORDER ITEMS (with per-vendor tracking)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cyberspace.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES cyberspace.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES cyberspace.products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES cyberspace.product_variants(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES cyberspace.vendors(id) ON DELETE SET NULL,

    -- Product Snapshot (immutable at order time)
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    product_type VARCHAR(50),
    variant_name VARCHAR(255),
    variant_options JSONB,

    -- Quantities & Pricing
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,

    -- Tax
    tax_rate DECIMAL(5,2),
    tax_amount DECIMAL(12,2),

    -- Commission (calculated at order time)
    commission_rate DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(12,2) NOT NULL,
    vendor_payout DECIMAL(12,2) NOT NULL, -- total_price - commission_amount

    -- Fulfillment (per-item, per-vendor)
    fulfillment_status VARCHAR(50) DEFAULT 'unfulfilled', -- unfulfilled, processing, shipped, delivered, returned
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    tracking_number VARCHAR(100),
    tracking_url VARCHAR(500),
    shipping_carrier VARCHAR(50), -- dhl, dpd, ups, hermes, gls

    -- Digital/Service Specific
    download_url VARCHAR(500),
    download_count INTEGER DEFAULT 0,
    access_expires_at TIMESTAMP,
    service_scheduled_at TIMESTAMP,
    service_completed_at TIMESTAMP,

    -- Refund Tracking
    refunded_quantity INTEGER DEFAULT 0,
    refund_amount DECIMAL(12,2) DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- VENDOR PAYOUTS
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cyberspace.vendor_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID REFERENCES cyberspace.vendors(id) ON DELETE SET NULL,

    -- Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Amounts
    gross_sales DECIMAL(14,2) NOT NULL,
    commission_amount DECIMAL(14,2) NOT NULL,
    refunds_amount DECIMAL(14,2) DEFAULT 0,
    adjustments DECIMAL(14,2) DEFAULT 0,
    net_payout DECIMAL(14,2) NOT NULL, -- gross_sales - commission - refunds + adjustments

    currency VARCHAR(3) DEFAULT 'EUR',

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, paid, failed, cancelled

    -- Stripe Transfer
    stripe_transfer_id VARCHAR(100),
    stripe_payout_id VARCHAR(100),

    -- Related Orders
    order_ids UUID[],
    order_item_ids UUID[],
    items_count INTEGER DEFAULT 0,

    -- Metadata
    notes TEXT,
    paid_at TIMESTAMP,
    failed_reason TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMMISSION RULES (Flexible commission configuration)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cyberspace.commission_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Scope
    scope_type VARCHAR(50) NOT NULL, -- global, category, vendor, product
    scope_id UUID, -- NULL for global

    -- Commission
    commission_type VARCHAR(20) NOT NULL, -- percentage, fixed
    commission_value DECIMAL(10,2) NOT NULL,

    -- Conditions
    min_order_value DECIMAL(12,2),
    max_order_value DECIMAL(12,2),
    product_types TEXT[], -- physical, digital, service, subscription

    -- Priority (higher = evaluated first)
    priority INTEGER DEFAULT 0,

    -- Validity
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AFFILIATES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cyberspace.affiliates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,

    affiliate_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    website VARCHAR(500),

    -- Commission
    commission_rate DECIMAL(5,2) DEFAULT 5.00, -- 5% default

    -- Stats
    total_clicks INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(14,2) DEFAULT 0,
    total_earnings DECIMAL(14,2) DEFAULT 0,
    pending_earnings DECIMAL(14,2) DEFAULT 0,

    -- Stripe Connect
    stripe_connect_id VARCHAR(100),

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, active, suspended, banned

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AFFILIATE CLICKS (Tracking)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cyberspace.affiliate_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES cyberspace.affiliates(id) ON DELETE SET NULL,

    ip_address VARCHAR(50),
    user_agent TEXT,
    referrer VARCHAR(500),
    landing_page VARCHAR(500),

    -- Conversion
    converted BOOLEAN DEFAULT FALSE,
    order_id UUID REFERENCES cyberspace.orders(id) ON DELETE SET NULL,

    -- Cookie tracking
    cookie_id VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AFFILIATE COMMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cyberspace.affiliate_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES cyberspace.affiliates(id) ON DELETE SET NULL,
    order_id UUID REFERENCES cyberspace.orders(id) ON DELETE SET NULL,
    click_id UUID REFERENCES cyberspace.affiliate_clicks(id) ON DELETE SET NULL,

    order_total DECIMAL(12,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(12,2) NOT NULL,

    -- Status (30-day hold for returns)
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, paid, cancelled

    -- Payment
    paid_at TIMESTAMP,
    stripe_transfer_id VARCHAR(100),
    payout_id UUID REFERENCES cyberspace.vendor_payouts(id),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PRODUCT REVIEWS
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cyberspace.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES cyberspace.products(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES cyberspace.order_items(id) ON DELETE SET NULL,
    user_id UUID,
    vendor_id UUID REFERENCES cyberspace.vendors(id) ON DELETE SET NULL,

    -- Rating
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    content TEXT,

    -- Aspects (optional detailed ratings)
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),

    -- Media
    image_urls TEXT[],

    -- Moderation
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, flagged
    moderator_notes TEXT,

    -- Verified Purchase
    verified_purchase BOOLEAN DEFAULT FALSE,

    -- Helpful Votes
    helpful_count INTEGER DEFAULT 0,
    unhelpful_count INTEGER DEFAULT 0,

    -- Vendor Response
    vendor_response TEXT,
    vendor_responded_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- DISCOUNT CODES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cyberspace.discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,

    -- Discount Type
    discount_type VARCHAR(20) NOT NULL, -- percentage, fixed, free_shipping
    discount_value DECIMAL(10,2) NOT NULL,

    -- Scope
    applies_to VARCHAR(50) DEFAULT 'all', -- all, products, categories, vendors
    applies_to_ids UUID[],
    excludes_ids UUID[], -- Excluded products/categories

    -- Limits
    min_order_value DECIMAL(12,2),
    max_discount_amount DECIMAL(12,2),
    usage_limit INTEGER, -- Total uses allowed
    usage_limit_per_user INTEGER DEFAULT 1,
    usage_count INTEGER DEFAULT 0,

    -- Customer Restrictions
    first_order_only BOOLEAN DEFAULT FALSE,
    customer_emails TEXT[], -- Specific customers only

    -- Validity
    starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- WISHLIST
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cyberspace.wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_id UUID REFERENCES cyberspace.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES cyberspace.product_variants(id) ON DELETE SET NULL,

    -- Price at time of adding (for price drop alerts)
    price_when_added DECIMAL(12,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, product_id, variant_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PLATFORM ENTERPRISE SERVICES (Direct sales by Enterprise-Universe)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cyberspace.enterprise_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Service Info
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    short_description VARCHAR(500),
    description TEXT,

    -- Category
    service_category VARCHAR(100) NOT NULL, -- smart_home, security, construction, ai_consulting, automation

    -- Pricing
    price_type VARCHAR(50) NOT NULL, -- fixed, hourly, daily, project, custom
    base_price DECIMAL(12,2),
    price_unit VARCHAR(50), -- hour, day, project, month

    -- Availability
    is_active BOOLEAN DEFAULT TRUE,
    availability_status VARCHAR(50) DEFAULT 'available', -- available, limited, unavailable

    -- Media
    image_url VARCHAR(500),
    gallery_urls TEXT[],

    -- Requirements
    requirements JSONB DEFAULT '{}', -- what customer needs to provide
    deliverables JSONB DEFAULT '{}', -- what they get

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Vendors
CREATE INDEX idx_vendors_status ON cyberspace.vendors(status);
CREATE INDEX idx_vendors_slug ON cyberspace.vendors(vendor_slug);
CREATE INDEX idx_vendors_category ON cyberspace.vendors(primary_category);
CREATE INDEX idx_vendors_stripe ON cyberspace.vendors(stripe_connect_id);
CREATE INDEX idx_vendors_email ON cyberspace.vendors(email);

-- Categories
CREATE INDEX idx_categories_parent ON cyberspace.categories(parent_id);
CREATE INDEX idx_categories_slug ON cyberspace.categories(slug);
CREATE INDEX idx_categories_active ON cyberspace.categories(is_active);

-- Products
CREATE INDEX idx_products_vendor ON cyberspace.products(vendor_id);
CREATE INDEX idx_products_category ON cyberspace.products(category_id);
CREATE INDEX idx_products_status ON cyberspace.products(status);
CREATE INDEX idx_products_type ON cyberspace.products(product_type);
CREATE INDEX idx_products_slug ON cyberspace.products(slug);
CREATE INDEX idx_products_price ON cyberspace.products(price);

-- Full-text search on products
CREATE INDEX idx_products_search ON cyberspace.products
    USING GIN (to_tsvector('german', name || ' ' || COALESCE(short_description, '') || ' ' || COALESCE(description, '')));

-- Product Variants
CREATE INDEX idx_variants_product ON cyberspace.product_variants(product_id);

-- Carts
CREATE INDEX idx_carts_user ON cyberspace.carts(user_id);
CREATE INDEX idx_carts_session ON cyberspace.carts(session_id);
CREATE INDEX idx_carts_status ON cyberspace.carts(status);
CREATE INDEX idx_cart_items_cart ON cyberspace.cart_items(cart_id);

-- Orders
CREATE INDEX idx_orders_user ON cyberspace.orders(user_id);
CREATE INDEX idx_orders_status ON cyberspace.orders(status);
CREATE INDEX idx_orders_payment_status ON cyberspace.orders(payment_status);
CREATE INDEX idx_orders_number ON cyberspace.orders(order_number);
CREATE INDEX idx_orders_email ON cyberspace.orders(customer_email);
CREATE INDEX idx_orders_created ON cyberspace.orders(created_at);

-- Order Items
CREATE INDEX idx_order_items_order ON cyberspace.order_items(order_id);
CREATE INDEX idx_order_items_vendor ON cyberspace.order_items(vendor_id);
CREATE INDEX idx_order_items_product ON cyberspace.order_items(product_id);
CREATE INDEX idx_order_items_fulfillment ON cyberspace.order_items(fulfillment_status);

-- Payouts
CREATE INDEX idx_payouts_vendor ON cyberspace.vendor_payouts(vendor_id);
CREATE INDEX idx_payouts_status ON cyberspace.vendor_payouts(status);
CREATE INDEX idx_payouts_period ON cyberspace.vendor_payouts(period_start, period_end);

-- Reviews
CREATE INDEX idx_reviews_product ON cyberspace.reviews(product_id);
CREATE INDEX idx_reviews_vendor ON cyberspace.reviews(vendor_id);
CREATE INDEX idx_reviews_status ON cyberspace.reviews(status);
CREATE INDEX idx_reviews_rating ON cyberspace.reviews(rating);

-- Affiliates
CREATE INDEX idx_affiliates_code ON cyberspace.affiliates(affiliate_code);
CREATE INDEX idx_affiliate_clicks_affiliate ON cyberspace.affiliate_clicks(affiliate_id);
CREATE INDEX idx_affiliate_commissions_affiliate ON cyberspace.affiliate_commissions(affiliate_id);

-- Discounts
CREATE INDEX idx_discounts_code ON cyberspace.discounts(code);
CREATE INDEX idx_discounts_active ON cyberspace.discounts(is_active);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEQUENCES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Order number sequence
CREATE SEQUENCE IF NOT EXISTS cyberspace.order_number_seq START 10000;

-- Payout number sequence
CREATE SEQUENCE IF NOT EXISTS cyberspace.payout_number_seq START 1000;

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Generate order number (EU-YYMM-XXXXX format)
CREATE OR REPLACE FUNCTION cyberspace.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number = 'EU-' || TO_CHAR(CURRENT_DATE, 'YYMM') || '-' || LPAD(nextval('cyberspace.order_number_seq')::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_order_number
    BEFORE INSERT ON cyberspace.orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL)
    EXECUTE FUNCTION cyberspace.generate_order_number();

-- Generate payout number (PO-YYMM-XXXX format)
CREATE OR REPLACE FUNCTION cyberspace.generate_payout_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.payout_number = 'PO-' || TO_CHAR(CURRENT_DATE, 'YYMM') || '-' || LPAD(nextval('cyberspace.payout_number_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_payout_number
    BEFORE INSERT ON cyberspace.vendor_payouts
    FOR EACH ROW
    WHEN (NEW.payout_number IS NULL)
    EXECUTE FUNCTION cyberspace.generate_payout_number();

-- Update product stats when review is added
CREATE OR REPLACE FUNCTION cyberspace.update_product_review_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
        UPDATE cyberspace.products
        SET
            rating = (
                SELECT ROUND(AVG(rating)::numeric, 2)
                FROM cyberspace.reviews
                WHERE product_id = NEW.product_id AND status = 'approved'
            ),
            reviews_count = (
                SELECT COUNT(*)
                FROM cyberspace.reviews
                WHERE product_id = NEW.product_id AND status = 'approved'
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_review_stats
    AFTER INSERT OR UPDATE ON cyberspace.reviews
    FOR EACH ROW
    EXECUTE FUNCTION cyberspace.update_product_review_stats();

-- Update vendor stats when order is placed
CREATE OR REPLACE FUNCTION cyberspace.update_vendor_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.fulfillment_status = 'delivered' AND (OLD IS NULL OR OLD.fulfillment_status != 'delivered') THEN
        UPDATE cyberspace.vendors
        SET
            total_sales = total_sales + 1,
            total_revenue = total_revenue + NEW.vendor_payout,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.vendor_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vendor_stats
    AFTER INSERT OR UPDATE ON cyberspace.order_items
    FOR EACH ROW
    EXECUTE FUNCTION cyberspace.update_vendor_stats();

-- Update category product count
CREATE OR REPLACE FUNCTION cyberspace.update_category_product_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE cyberspace.categories
        SET product_count = product_count + 1
        WHERE id = NEW.category_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE cyberspace.categories
        SET product_count = product_count - 1
        WHERE id = OLD.category_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.category_id != OLD.category_id THEN
        UPDATE cyberspace.categories
        SET product_count = product_count - 1
        WHERE id = OLD.category_id;
        UPDATE cyberspace.categories
        SET product_count = product_count + 1
        WHERE id = NEW.category_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_category_product_count
    AFTER INSERT OR UPDATE OR DELETE ON cyberspace.products
    FOR EACH ROW
    EXECUTE FUNCTION cyberspace.update_category_product_count();

-- ═══════════════════════════════════════════════════════════════════════════════
-- GRANT PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Grant to westmoney user (same as bau schema)
GRANT ALL PRIVILEGES ON SCHEMA cyberspace TO westmoney;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cyberspace TO westmoney;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA cyberspace TO westmoney;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA: Categories
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO cyberspace.categories (name, name_en, slug, description, icon, commission_rate, display_order, is_featured) VALUES
-- Main Categories
('Smart Home', 'Smart Home', 'smart-home', 'Intelligente Hausautomation und Steuerungssysteme', '🏠', 12.00, 1, TRUE),
('Sicherheitssysteme', 'Security Systems', 'security', 'Alarmanlagen, Videoüberwachung und Zutrittskontrolle', '🔐', 15.00, 2, TRUE),
('Barrierefreies Bauen', 'Barrier-Free Construction', 'barrier-free', 'Barrierefreie Umbauten und Anpassungen', '♿', 10.00, 3, TRUE),
('Elektroinstallation', 'Electrical Installation', 'electrical', 'Elektrik, Beleuchtung und Verkabelung', '⚡', 10.00, 4, FALSE),
('Sanitär & Heizung', 'Plumbing & Heating', 'plumbing-heating', 'Sanitär, Heizung und Klimaanlagen', '🔧', 10.00, 5, FALSE),
('Renovierung', 'Renovation', 'renovation', 'Komplettrenovierung und Modernisierung', '🔨', 8.00, 6, FALSE),
('Digitale Produkte', 'Digital Products', 'digital', 'Software, Lizenzen und digitale Services', '💻', 25.00, 7, FALSE),
('Beratung & Planung', 'Consulting & Planning', 'consulting', 'Professionelle Beratung und Projektplanung', '📋', 20.00, 8, TRUE),
('Wartung & Service', 'Maintenance & Service', 'maintenance', 'Wartungsverträge und Serviceabonnements', '🛠️', 15.00, 9, FALSE),
('Zubehör', 'Accessories', 'accessories', 'Zubehör und Ergänzungsprodukte', '🧰', 12.00, 10, FALSE);

-- Smart Home Subcategories
INSERT INTO cyberspace.categories (name, name_en, slug, description, icon, parent_id, commission_rate, display_order)
SELECT 'LOXONE Systeme', 'LOXONE Systems', 'loxone', 'LOXONE Miniserver und Komponenten', '🟢', id, 12.00, 1 FROM cyberspace.categories WHERE slug = 'smart-home';

INSERT INTO cyberspace.categories (name, name_en, slug, description, icon, parent_id, commission_rate, display_order)
SELECT 'Lichtsteuerung', 'Lighting Control', 'lighting', 'Intelligente Beleuchtungssysteme', '💡', id, 12.00, 2 FROM cyberspace.categories WHERE slug = 'smart-home';

INSERT INTO cyberspace.categories (name, name_en, slug, description, icon, parent_id, commission_rate, display_order)
SELECT 'Klimaautomation', 'Climate Automation', 'climate', 'Heizung, Klima und Beschattung', '🌡️', id, 12.00, 3 FROM cyberspace.categories WHERE slug = 'smart-home';

INSERT INTO cyberspace.categories (name, name_en, slug, description, icon, parent_id, commission_rate, display_order)
SELECT 'Multiroom Audio', 'Multiroom Audio', 'audio', 'Verteiltes Audio und Entertainment', '🔊', id, 12.00, 4 FROM cyberspace.categories WHERE slug = 'smart-home';

-- Security Subcategories
INSERT INTO cyberspace.categories (name, name_en, slug, description, icon, parent_id, commission_rate, display_order)
SELECT 'Alarmanlagen', 'Alarm Systems', 'alarms', 'Einbruchmeldeanlagen und Sensoren', '🚨', id, 15.00, 1 FROM cyberspace.categories WHERE slug = 'security';

INSERT INTO cyberspace.categories (name, name_en, slug, description, icon, parent_id, commission_rate, display_order)
SELECT 'Videoüberwachung', 'Video Surveillance', 'cctv', 'Kameras und Aufzeichnungssysteme', '📹', id, 15.00, 2 FROM cyberspace.categories WHERE slug = 'security';

INSERT INTO cyberspace.categories (name, name_en, slug, description, icon, parent_id, commission_rate, display_order)
SELECT 'Zutrittskontrolle', 'Access Control', 'access-control', 'Türschlösser, Fingerprint und RFID', '🚪', id, 15.00, 3 FROM cyberspace.categories WHERE slug = 'security';

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA: Default Commission Rules
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO cyberspace.commission_rules (name, description, scope_type, commission_type, commission_value, priority, is_active) VALUES
('Global Default', 'Standard-Provision für alle Transaktionen', 'global', 'percentage', 10.00, 0, TRUE),
('Digital Products Bonus', 'Höhere Provision für digitale Produkte', 'global', 'percentage', 25.00, 10, TRUE),
('High Value Order Discount', 'Reduzierte Provision für Großbestellungen über 10.000€', 'global', 'percentage', 7.00, 20, TRUE);

UPDATE cyberspace.commission_rules SET min_order_value = 10000.00 WHERE name = 'High Value Order Discount';
UPDATE cyberspace.commission_rules SET product_types = ARRAY['digital'] WHERE name = 'Digital Products Bonus';

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA: Enterprise Services (Own services by Enterprise-Universe)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO cyberspace.enterprise_services (name, slug, short_description, description, service_category, price_type, base_price, price_unit) VALUES
('Smart Home Beratung', 'smart-home-consultation', 'Professionelle Beratung für Ihr Smart Home Projekt', 'Umfassende Beratung inkl. Bedarfsanalyse, Systemempfehlung und Kostenaufstellung. Vor-Ort oder per Video-Call möglich.', 'smart_home', 'fixed', 199.00, NULL),
('LOXONE Installation', 'loxone-installation', 'Komplette LOXONE Smart Home Installation', 'Planung, Installation und Inbetriebnahme Ihres LOXONE Miniservers inkl. Grundfunktionen. Preis pro Quadratmeter.', 'smart_home', 'project', 25.00, 'sqm'),
('Sicherheitsanalyse', 'security-analysis', 'Professionelle Sicherheitsbewertung Ihrer Immobilie', 'Vor-Ort-Analyse der Sicherheitslage mit Schwachstellenidentifikation und Maßnahmenempfehlung.', 'security', 'fixed', 299.00, NULL),
('AI Bot Setup', 'ai-bot-setup', 'Einrichtung eines individuellen AI Genius Bots', 'Konfiguration und Training eines maßgeschneiderten AI Bots für Ihr Unternehmen.', 'ai_consulting', 'fixed', 1999.00, NULL),
('Prozessautomatisierung', 'process-automation', 'Automatisierung Ihrer Geschäftsprozesse', 'Analyse, Konzeption und Implementierung automatisierter Workflows.', 'automation', 'hourly', 150.00, 'hour'),
('Wartungsvertrag Smart Home', 'smart-home-maintenance', 'Jährlicher Wartungsvertrag für Smart Home Systeme', 'Regelmäßige Systemwartung, Updates und Priority-Support.', 'smart_home', 'fixed', 49.00, 'month');

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add comment
COMMENT ON SCHEMA cyberspace IS 'Enterprise-Universe CYBERSPACE Marketplace - E-Commerce platform with multi-vendor support';
