-- CYBERSPACE Analytics & Conversion Tracking Schema
-- Version: 1.0.0
-- Date: 2026-01-12
-- Purpose: High-ROI Marketing Analytics, A/B Testing, Conversion Tracking

-- ═══════════════════════════════════════════════════════════════
-- CONVERSION TRACKING
-- ═══════════════════════════════════════════════════════════════

-- Conversion Events (page views, cart adds, purchases)
CREATE TABLE IF NOT EXISTS cyberspace.conversion_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL, -- page_view, product_view, add_to_cart, checkout_start, purchase, signup
    session_id VARCHAR(100),
    user_id UUID,
    product_id UUID REFERENCES cyberspace.products(id) ON DELETE SET NULL,
    order_id UUID REFERENCES cyberspace.orders(id) ON DELETE SET NULL,
    value INTEGER DEFAULT 0, -- in cents
    source VARCHAR(100), -- utm_source: google, facebook, instagram, organic
    medium VARCHAR(100), -- utm_medium: cpc, social, email, organic
    campaign VARCHAR(200), -- utm_campaign
    content VARCHAR(200), -- utm_content (ad variant)
    term VARCHAR(200), -- utm_term (keywords)
    referrer TEXT,
    landing_page TEXT,
    exit_page TEXT,
    device VARCHAR(50), -- desktop, mobile, tablet
    browser VARCHAR(100),
    os VARCHAR(100),
    country VARCHAR(10),
    region VARCHAR(100),
    city VARCHAR(100),
    ip_address VARCHAR(50),
    user_agent TEXT,
    page_load_time INTEGER, -- ms
    time_on_page INTEGER, -- seconds
    scroll_depth INTEGER, -- percentage
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast analytics queries
CREATE INDEX IF NOT EXISTS idx_events_type_date ON cyberspace.conversion_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_events_session ON cyberspace.conversion_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_source ON cyberspace.conversion_events(source, medium, campaign);
CREATE INDEX IF NOT EXISTS idx_events_product ON cyberspace.conversion_events(product_id);

-- ═══════════════════════════════════════════════════════════════
-- MARKETING CAMPAIGNS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cyberspace.marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50), -- paid_search, paid_social, email, affiliate, influencer, organic
    platform VARCHAR(50), -- google, facebook, instagram, linkedin, tiktok, email
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, paused, completed
    budget INTEGER DEFAULT 0, -- in cents
    spent INTEGER DEFAULT 0, -- in cents
    target_audience JSONB DEFAULT '{}', -- {demographics, interests, locations}
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(200),
    landing_page_url TEXT,
    creative_assets JSONB DEFAULT '[]', -- [{type, url, name}]
    start_date DATE,
    end_date DATE,
    goals JSONB DEFAULT '{}', -- {impressions, clicks, conversions, revenue}
    actual_results JSONB DEFAULT '{}', -- populated from conversion_events
    roi_percentage DECIMAL(10,2),
    roas DECIMAL(10,2),
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON cyberspace.marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON cyberspace.marketing_campaigns(start_date, end_date);

-- ═══════════════════════════════════════════════════════════════
-- A/B TESTING
-- ═══════════════════════════════════════════════════════════════

-- Experiments
CREATE TABLE IF NOT EXISTS cyberspace.ab_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50), -- landing_page, cta, pricing, layout, copy, image
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, paused, completed, archived
    variants JSONB NOT NULL, -- [{name: 'Control', weight: 50, config: {}}, ...]
    target_page TEXT, -- URL pattern
    target_audience JSONB DEFAULT '{}', -- {device, location, source}
    goal_metric VARCHAR(50), -- conversion, revenue, engagement, bounce_rate
    minimum_sample_size INTEGER DEFAULT 1000,
    confidence_level DECIMAL(5,2) DEFAULT 95.00,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    winner_variant VARCHAR(100),
    winner_declared_at TIMESTAMP,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Variant Assignments
CREATE TABLE IF NOT EXISTS cyberspace.ab_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID REFERENCES cyberspace.ab_experiments(id) ON DELETE CASCADE,
    session_id VARCHAR(100) NOT NULL,
    user_id UUID,
    variant VARCHAR(100) NOT NULL,
    converted BOOLEAN DEFAULT FALSE,
    conversion_value INTEGER DEFAULT 0, -- in cents
    converted_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ab_experiment ON cyberspace.ab_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_session ON cyberspace.ab_assignments(session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ab_unique_assignment ON cyberspace.ab_assignments(experiment_id, session_id);

-- ═══════════════════════════════════════════════════════════════
-- CUSTOMER ANALYTICS
-- ═══════════════════════════════════════════════════════════════

-- Customer Segments
CREATE TABLE IF NOT EXISTS cyberspace.customer_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL, -- {orders_min, orders_max, revenue_min, revenue_max, last_order_days, etc}
    is_dynamic BOOLEAN DEFAULT TRUE, -- auto-update membership
    member_count INTEGER DEFAULT 0,
    avg_order_value INTEGER DEFAULT 0,
    avg_lifetime_value INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Segment Membership
CREATE TABLE IF NOT EXISTS cyberspace.customer_segment_members (
    customer_id UUID NOT NULL,
    segment_id UUID REFERENCES cyberspace.customer_segments(id) ON DELETE CASCADE,
    score DECIMAL(10,2) DEFAULT 0, -- relevance score
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (customer_id, segment_id)
);

-- Customer Cohorts (for cohort analysis)
CREATE TABLE IF NOT EXISTS cyberspace.customer_cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_month DATE NOT NULL, -- First day of cohort month
    customer_id UUID NOT NULL,
    first_order_value INTEGER, -- in cents
    total_orders INTEGER DEFAULT 1,
    total_revenue INTEGER DEFAULT 0,
    last_order_date DATE,
    is_retained BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cohorts_month ON cyberspace.customer_cohorts(cohort_month);

-- ═══════════════════════════════════════════════════════════════
-- HEATMAPS & USER BEHAVIOR
-- ═══════════════════════════════════════════════════════════════

-- Click/Scroll Heatmap Data
CREATE TABLE IF NOT EXISTS cyberspace.heatmap_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100),
    page_url TEXT NOT NULL,
    event_type VARCHAR(20) NOT NULL, -- click, scroll, move, rage_click
    x_position INTEGER,
    y_position INTEGER,
    viewport_width INTEGER,
    viewport_height INTEGER,
    scroll_depth INTEGER,
    element_selector TEXT, -- CSS selector of clicked element
    element_text TEXT, -- Text content of element
    device VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_heatmap_page ON cyberspace.heatmap_data(page_url, created_at);
CREATE INDEX IF NOT EXISTS idx_heatmap_type ON cyberspace.heatmap_data(event_type);

-- Session Recordings Reference (actual recordings stored externally)
CREATE TABLE IF NOT EXISTS cyberspace.session_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID,
    recording_url TEXT,
    duration INTEGER, -- seconds
    page_count INTEGER DEFAULT 0,
    event_count INTEGER DEFAULT 0,
    has_conversion BOOLEAN DEFAULT FALSE,
    has_error BOOLEAN DEFAULT FALSE,
    has_rage_click BOOLEAN DEFAULT FALSE,
    device VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    country VARCHAR(10),
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recordings_conversion ON cyberspace.session_recordings(has_conversion);
CREATE INDEX IF NOT EXISTS idx_recordings_error ON cyberspace.session_recordings(has_error);

-- ═══════════════════════════════════════════════════════════════
-- FUNNEL DEFINITIONS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cyberspace.funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    steps JSONB NOT NULL, -- [{name, event_type, filters}]
    is_ordered BOOLEAN DEFAULT TRUE, -- must complete steps in order
    window_days INTEGER DEFAULT 7, -- max days to complete funnel
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════
-- REPORTS & DASHBOARDS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cyberspace.saved_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50), -- funnel, cohort, roi, conversion, custom
    query_config JSONB NOT NULL, -- saved query parameters
    visualization_config JSONB DEFAULT '{}', -- chart settings
    schedule VARCHAR(50), -- daily, weekly, monthly, none
    recipients TEXT[], -- email addresses
    last_run_at TIMESTAMP,
    last_run_result JSONB,
    created_by VARCHAR(100),
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA: DEFAULT SEGMENTS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO cyberspace.customer_segments (name, description, criteria) VALUES
('VIP Customers', 'High-value customers with 5+ orders and >€1000 lifetime value', '{"orders_min": 5, "lifetime_value_min": 100000}'),
('At Risk', 'Customers with no order in last 90 days', '{"last_order_days_min": 90, "orders_min": 1}'),
('New Customers', 'First purchase in last 30 days', '{"first_order_days_max": 30}'),
('Repeat Buyers', 'Customers with 2+ orders', '{"orders_min": 2}'),
('Cart Abandoners', 'Added to cart but no purchase in 7 days', '{"has_cart": true, "orders_max": 0, "cart_age_days_min": 7}'),
('Newsletter Engaged', 'Opened 3+ emails in last 30 days', '{"email_opens_min": 3, "email_period_days": 30}')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA: DEFAULT FUNNELS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO cyberspace.funnels (name, description, steps) VALUES
('Purchase Funnel', 'Standard e-commerce purchase funnel', '[
    {"name": "Page View", "event_type": "page_view"},
    {"name": "Product View", "event_type": "product_view"},
    {"name": "Add to Cart", "event_type": "add_to_cart"},
    {"name": "Checkout Start", "event_type": "checkout_start"},
    {"name": "Purchase", "event_type": "purchase"}
]'),
('Signup Funnel', 'User registration funnel', '[
    {"name": "Landing Page", "event_type": "page_view", "filters": {"landing_page": "/register"}},
    {"name": "Form Start", "event_type": "form_start"},
    {"name": "Form Submit", "event_type": "form_submit"},
    {"name": "Email Verified", "event_type": "email_verified"}
]'),
('Vendor Onboarding', 'Vendor registration and activation', '[
    {"name": "Registration Page", "event_type": "page_view", "filters": {"page": "/vendor/register"}},
    {"name": "Registration Submit", "event_type": "vendor_register"},
    {"name": "Stripe Connect", "event_type": "stripe_connect_start"},
    {"name": "First Product", "event_type": "product_created"},
    {"name": "First Sale", "event_type": "vendor_first_sale"}
]')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- MATERIALIZED VIEWS FOR FAST ANALYTICS
-- ═══════════════════════════════════════════════════════════════

-- Daily conversion summary
CREATE MATERIALIZED VIEW IF NOT EXISTS cyberspace.mv_daily_conversions AS
SELECT
    DATE(created_at) AS date,
    event_type,
    source,
    medium,
    campaign,
    device,
    COUNT(*) AS event_count,
    COUNT(DISTINCT session_id) AS unique_sessions,
    SUM(value) AS total_value
FROM cyberspace.conversion_events
GROUP BY DATE(created_at), event_type, source, medium, campaign, device;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_conversions
ON cyberspace.mv_daily_conversions(date, event_type, source, medium, campaign, device);

-- Hourly traffic patterns
CREATE MATERIALIZED VIEW IF NOT EXISTS cyberspace.mv_hourly_traffic AS
SELECT
    DATE(created_at) AS date,
    EXTRACT(HOUR FROM created_at) AS hour,
    COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
    COUNT(*) FILTER (WHERE event_type = 'purchase') AS purchases,
    SUM(value) FILTER (WHERE event_type = 'purchase') AS revenue
FROM cyberspace.conversion_events
GROUP BY DATE(created_at), EXTRACT(HOUR FROM created_at);

-- Refresh function
CREATE OR REPLACE FUNCTION cyberspace.refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY cyberspace.mv_daily_conversions;
    REFRESH MATERIALIZED VIEW CONCURRENTLY cyberspace.mv_hourly_traffic;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cyberspace TO westmoney;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA cyberspace TO westmoney;
