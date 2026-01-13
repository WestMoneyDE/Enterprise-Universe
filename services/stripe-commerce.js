/**
 * STRIPE COMMERCE SERVICE
 * Multi-party payments for CYBERSPACE Marketplace
 *
 * Handles:
 * - Vendor Connect onboarding
 * - Split payments to multiple vendors
 * - Platform commission collection
 * - Automatic scheduled payouts
 * - Affiliate payouts
 *
 * Enterprise Universe - West Money Bau GmbH
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Stripe = require('stripe');
const { Pool } = require('pg');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
    platformName: 'Enterprise Universe',
    platformUrl: 'https://enterprise-universe.de',
    supportEmail: 'support@enterprise-universe.de',
    currency: 'eur',
    minimumPayoutAmount: 1000, // €10 minimum payout (in cents)
    payoutSchedule: 'weekly', // weekly, daily, monthly
    mcc: '5999' // Miscellaneous retail stores
};

// ═══════════════════════════════════════════════════════════════
// VENDOR CONNECT ONBOARDING
// ═══════════════════════════════════════════════════════════════

/**
 * Create Stripe Connect Express account for vendor
 */
async function createVendorConnectAccount(vendorData) {
    const {
        vendorId,
        email,
        companyName,
        companyType, // individual, company
        country = 'DE'
    } = vendorData;

    const account = await stripe.accounts.create({
        type: 'express',
        country: country.toUpperCase(),
        email: email,
        capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true }
        },
        business_type: companyType === 'company' ? 'company' : 'individual',
        business_profile: {
            name: companyName,
            mcc: CONFIG.mcc,
            url: `${CONFIG.platformUrl}/vendors/${vendorId}`
        },
        settings: {
            payouts: {
                schedule: {
                    interval: CONFIG.payoutSchedule === 'weekly' ? 'weekly' : 'daily',
                    weekly_anchor: 'monday'
                }
            }
        },
        metadata: {
            platform: 'cyberspace',
            vendor_id: vendorId
        }
    });

    // Update vendor record with Stripe account ID
    await pool.query(`
        UPDATE cyberspace.vendors
        SET stripe_account_id = $1,
            stripe_account_status = 'pending',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
    `, [account.id, vendorId]);

    return account;
}

/**
 * Generate Connect account onboarding link
 */
async function createVendorOnboardingLink(vendorId) {
    // Get vendor's Stripe account ID
    const vendorResult = await pool.query(
        'SELECT stripe_account_id FROM cyberspace.vendors WHERE id = $1',
        [vendorId]
    );

    if (!vendorResult.rows[0]?.stripe_account_id) {
        throw new Error('Vendor does not have a Stripe account');
    }

    const accountId = vendorResult.rows[0].stripe_account_id;

    const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${CONFIG.platformUrl}/vendor/onboarding/refresh`,
        return_url: `${CONFIG.platformUrl}/vendor/onboarding/complete`,
        type: 'account_onboarding'
    });

    return accountLink;
}

/**
 * Get vendor's Stripe account status
 */
async function getVendorAccountStatus(vendorId) {
    const vendorResult = await pool.query(
        'SELECT stripe_account_id FROM cyberspace.vendors WHERE id = $1',
        [vendorId]
    );

    if (!vendorResult.rows[0]?.stripe_account_id) {
        return { status: 'not_connected' };
    }

    const account = await stripe.accounts.retrieve(vendorResult.rows[0].stripe_account_id);

    const status = {
        id: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pendingVerification: account.requirements?.pending_verification || [],
        disabledReason: account.requirements?.disabled_reason
    };

    // Determine overall status
    let overallStatus = 'pending';
    if (account.charges_enabled && account.payouts_enabled) {
        overallStatus = 'active';
    } else if (account.requirements?.disabled_reason) {
        overallStatus = 'restricted';
    } else if (account.details_submitted) {
        overallStatus = 'pending_verification';
    }

    // Update vendor status in database
    await pool.query(`
        UPDATE cyberspace.vendors
        SET stripe_account_status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
    `, [overallStatus, vendorId]);

    return { ...status, status: overallStatus };
}

// ═══════════════════════════════════════════════════════════════
// MARKETPLACE CHECKOUT
// ═══════════════════════════════════════════════════════════════

/**
 * Create marketplace checkout session with split payments
 * Payment goes to platform, then transferred to vendors
 */
async function createMarketplaceCheckout(checkoutData) {
    const {
        orderId,
        customerId,
        customerEmail,
        items, // [{productName, unitPrice, quantity, vendorId, vendorStripeId, vendorPayout}]
        platformCommission,
        affiliateCommission = 0,
        shippingCost = 0,
        discountAmount = 0,
        successUrl,
        cancelUrl,
        metadata = {}
    } = checkoutData;

    // Prepare line items for Stripe
    const lineItems = items.map(item => ({
        price_data: {
            currency: CONFIG.currency,
            product_data: {
                name: item.productName,
                metadata: {
                    vendor_id: item.vendorId,
                    product_id: item.productId
                }
            },
            unit_amount: item.unitPrice
        },
        quantity: item.quantity
    }));

    // Add shipping if applicable
    if (shippingCost > 0) {
        lineItems.push({
            price_data: {
                currency: CONFIG.currency,
                product_data: {
                    name: 'Versandkosten'
                },
                unit_amount: shippingCost
            },
            quantity: 1
        });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
        customer_email: customerEmail,
        payment_method_types: ['card', 'sepa_debit', 'klarna', 'sofort', 'giropay'],
        mode: 'payment',
        line_items: lineItems,
        discounts: discountAmount > 0 ? [{
            coupon: await getOrCreateCoupon(discountAmount)
        }] : undefined,
        success_url: successUrl || `${CONFIG.platformUrl}/checkout/success?order_id=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${CONFIG.platformUrl}/checkout/cancel?order_id=${orderId}`,
        metadata: {
            platform: 'cyberspace',
            order_id: orderId,
            platform_commission: platformCommission.toString(),
            affiliate_commission: affiliateCommission.toString(),
            ...metadata
        },
        payment_intent_data: {
            metadata: {
                order_id: orderId,
                platform: 'cyberspace'
            }
        }
    });

    // Store session info in order
    await pool.query(`
        UPDATE cyberspace.orders
        SET stripe_checkout_session_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
    `, [session.id, orderId]);

    return session;
}

/**
 * Helper to get or create discount coupon
 */
async function getOrCreateCoupon(amountOff) {
    const couponId = `discount_${amountOff}`;

    try {
        await stripe.coupons.retrieve(couponId);
        return couponId;
    } catch (e) {
        const coupon = await stripe.coupons.create({
            id: couponId,
            amount_off: amountOff,
            currency: CONFIG.currency,
            duration: 'once',
            name: `Rabatt €${(amountOff / 100).toFixed(2)}`
        });
        return coupon.id;
    }
}

/**
 * Process successful payment and create vendor transfers
 */
async function processSuccessfulPayment(sessionId) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get session details
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent']
        });

        if (session.payment_status !== 'paid') {
            throw new Error('Payment not completed');
        }

        const orderId = session.metadata.order_id;
        const paymentIntentId = session.payment_intent.id;

        // Get order and items
        const orderResult = await client.query(`
            SELECT o.*, oi.vendor_id, oi.vendor_payout,
                   v.stripe_account_id, v.company_name AS vendor_name
            FROM cyberspace.orders o
            JOIN cyberspace.order_items oi ON o.id = oi.order_id
            JOIN cyberspace.vendors v ON oi.vendor_id = v.id
            WHERE o.id = $1
        `, [orderId]);

        if (orderResult.rows.length === 0) {
            throw new Error('Order not found');
        }

        // Update order status
        await client.query(`
            UPDATE cyberspace.orders
            SET status = 'confirmed',
                payment_status = 'paid',
                stripe_payment_intent_id = $1,
                confirmed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [paymentIntentId, orderId]);

        // Aggregate payouts per vendor
        const vendorPayouts = {};
        for (const row of orderResult.rows) {
            if (!vendorPayouts[row.vendor_id]) {
                vendorPayouts[row.vendor_id] = {
                    vendorId: row.vendor_id,
                    vendorName: row.vendor_name,
                    stripeAccountId: row.stripe_account_id,
                    totalPayout: 0
                };
            }
            vendorPayouts[row.vendor_id].totalPayout += row.vendor_payout;
        }

        // Create transfers to each vendor
        const transfers = [];
        for (const payout of Object.values(vendorPayouts)) {
            if (!payout.stripeAccountId) {
                console.warn(`Vendor ${payout.vendorId} has no Stripe account - payout pending`);
                continue;
            }

            if (payout.totalPayout < CONFIG.minimumPayoutAmount) {
                console.log(`Vendor ${payout.vendorId} payout below minimum - will be batched`);
                // Store pending payout
                await client.query(`
                    INSERT INTO cyberspace.vendor_payouts
                    (vendor_id, order_id, amount, status)
                    VALUES ($1, $2, $3, 'pending')
                `, [payout.vendorId, orderId, payout.totalPayout]);
                continue;
            }

            try {
                const transfer = await stripe.transfers.create({
                    amount: payout.totalPayout,
                    currency: CONFIG.currency,
                    destination: payout.stripeAccountId,
                    source_transaction: session.payment_intent.latest_charge,
                    description: `Auszahlung Bestellung ${orderResult.rows[0].order_number}`,
                    metadata: {
                        platform: 'cyberspace',
                        order_id: orderId,
                        vendor_id: payout.vendorId
                    }
                });

                // Record payout
                await client.query(`
                    INSERT INTO cyberspace.vendor_payouts
                    (vendor_id, order_id, amount, stripe_transfer_id, status, paid_at)
                    VALUES ($1, $2, $3, $4, 'completed', CURRENT_TIMESTAMP)
                `, [payout.vendorId, orderId, payout.totalPayout, transfer.id]);

                transfers.push({
                    vendorId: payout.vendorId,
                    amount: payout.totalPayout,
                    transferId: transfer.id
                });

            } catch (transferError) {
                console.error(`Transfer to vendor ${payout.vendorId} failed:`, transferError.message);
                await client.query(`
                    INSERT INTO cyberspace.vendor_payouts
                    (vendor_id, order_id, amount, status, failure_reason)
                    VALUES ($1, $2, $3, 'failed', $4)
                `, [payout.vendorId, orderId, payout.totalPayout, transferError.message]);
            }
        }

        await client.query('COMMIT');

        return {
            success: true,
            orderId,
            paymentIntentId,
            transfers
        };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// ═══════════════════════════════════════════════════════════════
// VENDOR PAYOUTS
// ═══════════════════════════════════════════════════════════════

/**
 * Process pending vendor payouts (batch job)
 */
async function processPendingPayouts() {
    const client = await pool.connect();

    try {
        // Get vendors with pending payouts above minimum
        const pendingResult = await client.query(`
            SELECT
                v.id AS vendor_id,
                v.company_name,
                v.stripe_account_id,
                SUM(vp.amount) AS total_pending,
                ARRAY_AGG(vp.id) AS payout_ids
            FROM cyberspace.vendor_payouts vp
            JOIN cyberspace.vendors v ON vp.vendor_id = v.id
            WHERE vp.status = 'pending'
              AND v.stripe_account_id IS NOT NULL
              AND v.stripe_account_status = 'active'
            GROUP BY v.id
            HAVING SUM(vp.amount) >= $1
        `, [CONFIG.minimumPayoutAmount]);

        const results = [];

        for (const vendor of pendingResult.rows) {
            try {
                await client.query('BEGIN');

                // Create payout transfer
                const transfer = await stripe.transfers.create({
                    amount: vendor.total_pending,
                    currency: CONFIG.currency,
                    destination: vendor.stripe_account_id,
                    description: `Batch-Auszahlung ${new Date().toISOString().split('T')[0]}`,
                    metadata: {
                        platform: 'cyberspace',
                        vendor_id: vendor.vendor_id,
                        batch_payout: 'true',
                        payout_count: vendor.payout_ids.length.toString()
                    }
                });

                // Update all pending payouts
                await client.query(`
                    UPDATE cyberspace.vendor_payouts
                    SET status = 'completed',
                        stripe_transfer_id = $1,
                        paid_at = CURRENT_TIMESTAMP
                    WHERE id = ANY($2)
                `, [transfer.id, vendor.payout_ids]);

                await client.query('COMMIT');

                results.push({
                    vendorId: vendor.vendor_id,
                    vendorName: vendor.company_name,
                    amount: vendor.total_pending,
                    transferId: transfer.id,
                    payoutCount: vendor.payout_ids.length,
                    status: 'completed'
                });

            } catch (error) {
                await client.query('ROLLBACK');
                results.push({
                    vendorId: vendor.vendor_id,
                    vendorName: vendor.company_name,
                    amount: vendor.total_pending,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        return {
            processedAt: new Date(),
            vendorsProcessed: results.length,
            results
        };

    } finally {
        client.release();
    }
}

/**
 * Get vendor payout history
 */
async function getVendorPayouts(vendorId, options = {}) {
    const { status, limit = 20, page = 1 } = options;
    const offset = (page - 1) * limit;

    let query = `
        SELECT vp.*, o.order_number
        FROM cyberspace.vendor_payouts vp
        LEFT JOIN cyberspace.orders o ON vp.order_id = o.id
        WHERE vp.vendor_id = $1
    `;
    const params = [vendorId];

    if (status) {
        params.push(status);
        query += ` AND vp.status = $${params.length}`;
    }

    query += ` ORDER BY vp.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const result = await pool.query(query, params);

    // Get totals
    const totalsResult = await pool.query(`
        SELECT
            SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) AS total_paid,
            SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS total_pending
        FROM cyberspace.vendor_payouts
        WHERE vendor_id = $1
    `, [vendorId]);

    return {
        payouts: result.rows,
        totals: totalsResult.rows[0]
    };
}

// ═══════════════════════════════════════════════════════════════
// AFFILIATE PAYOUTS
// ═══════════════════════════════════════════════════════════════

/**
 * Process affiliate commissions (monthly job)
 */
async function processAffiliatePayouts() {
    const client = await pool.connect();

    try {
        // Get affiliates with unpaid commissions above threshold
        const affiliatesResult = await client.query(`
            SELECT
                a.id AS affiliate_id,
                a.email,
                a.payout_method,
                a.payout_details,
                SUM(ac.amount) AS total_unpaid,
                ARRAY_AGG(ac.id) AS commission_ids
            FROM cyberspace.affiliates a
            JOIN cyberspace.affiliate_commissions ac ON a.id = ac.affiliate_id
            WHERE ac.status = 'pending'
              AND a.status = 'active'
            GROUP BY a.id
            HAVING SUM(ac.amount) >= 5000 -- €50 minimum
        `);

        const results = [];

        for (const affiliate of affiliatesResult.rows) {
            try {
                await client.query('BEGIN');

                // For now, mark as processing (manual payout via bank transfer)
                // In future, could use Stripe Payouts API for automated payouts
                await client.query(`
                    UPDATE cyberspace.affiliate_commissions
                    SET status = 'processing'
                    WHERE id = ANY($1)
                `, [affiliate.commission_ids]);

                await client.query(`
                    UPDATE cyberspace.affiliates
                    SET total_earned = total_earned + $1,
                        last_payout_at = CURRENT_TIMESTAMP
                    WHERE id = $2
                `, [affiliate.total_unpaid, affiliate.affiliate_id]);

                await client.query('COMMIT');

                results.push({
                    affiliateId: affiliate.affiliate_id,
                    email: affiliate.email,
                    amount: affiliate.total_unpaid,
                    method: affiliate.payout_method,
                    status: 'processing'
                });

            } catch (error) {
                await client.query('ROLLBACK');
                results.push({
                    affiliateId: affiliate.affiliate_id,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        return {
            processedAt: new Date(),
            affiliatesProcessed: results.length,
            results
        };

    } finally {
        client.release();
    }
}

// ═══════════════════════════════════════════════════════════════
// REFUNDS
// ═══════════════════════════════════════════════════════════════

/**
 * Process refund for an order
 */
async function processRefund(orderId, refundData = {}) {
    const { amount, reason = 'requested_by_customer', items } = refundData;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get order
        const orderResult = await client.query(`
            SELECT * FROM cyberspace.orders WHERE id = $1
        `, [orderId]);

        if (orderResult.rows.length === 0) {
            throw new Error('Order not found');
        }

        const order = orderResult.rows[0];

        if (!order.stripe_payment_intent_id) {
            throw new Error('No payment to refund');
        }

        // Calculate refund amount
        const refundAmount = amount || order.total_amount;

        // Create Stripe refund
        const refund = await stripe.refunds.create({
            payment_intent: order.stripe_payment_intent_id,
            amount: refundAmount,
            reason: reason,
            metadata: {
                platform: 'cyberspace',
                order_id: orderId
            }
        });

        // Reverse vendor transfers
        const payoutsResult = await client.query(`
            SELECT * FROM cyberspace.vendor_payouts
            WHERE order_id = $1 AND status = 'completed'
        `, [orderId]);

        for (const payout of payoutsResult.rows) {
            if (payout.stripe_transfer_id) {
                try {
                    await stripe.transfers.createReversal(payout.stripe_transfer_id, {
                        amount: payout.amount,
                        description: `Stornierung Bestellung ${order.order_number}`
                    });

                    await client.query(`
                        UPDATE cyberspace.vendor_payouts
                        SET status = 'reversed'
                        WHERE id = $1
                    `, [payout.id]);
                } catch (e) {
                    console.error(`Failed to reverse transfer ${payout.stripe_transfer_id}:`, e.message);
                }
            }
        }

        // Update order status
        await client.query(`
            UPDATE cyberspace.orders
            SET status = 'refunded',
                payment_status = 'refunded',
                refunded_at = CURRENT_TIMESTAMP,
                stripe_refund_id = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [refund.id, orderId]);

        await client.query('COMMIT');

        return {
            success: true,
            refundId: refund.id,
            amount: refundAmount,
            status: refund.status
        };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// ═══════════════════════════════════════════════════════════════
// WEBHOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Handle Stripe webhook events for marketplace
 */
async function handleMarketplaceWebhook(payload, signature, webhookSecret) {
    let event;

    try {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
        throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    const handlers = {
        'checkout.session.completed': async (session) => {
            if (session.metadata?.platform === 'cyberspace') {
                return await processSuccessfulPayment(session.id);
            }
        },

        'payment_intent.succeeded': async (paymentIntent) => {
            console.log('Payment succeeded:', paymentIntent.id);
            return { type: 'payment_succeeded', id: paymentIntent.id };
        },

        'transfer.created': async (transfer) => {
            console.log('Transfer created:', transfer.id, 'to', transfer.destination);
            return { type: 'transfer_created', id: transfer.id };
        },

        'account.updated': async (account) => {
            // Update vendor status based on account changes
            const vendorResult = await pool.query(
                'SELECT id FROM cyberspace.vendors WHERE stripe_account_id = $1',
                [account.id]
            );

            if (vendorResult.rows.length > 0) {
                await getVendorAccountStatus(vendorResult.rows[0].id);
            }

            return { type: 'account_updated', id: account.id };
        },

        'payout.paid': async (payout) => {
            console.log('Payout completed:', payout.id);
            return { type: 'payout_completed', id: payout.id };
        },

        'charge.refunded': async (charge) => {
            console.log('Charge refunded:', charge.id);
            return { type: 'charge_refunded', id: charge.id };
        }
    };

    const handler = handlers[event.type];
    if (handler) {
        return await handler(event.data.object);
    }

    return { type: 'unhandled', eventType: event.type };
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════

/**
 * Get marketplace payment analytics
 */
async function getPaymentAnalytics(dateRange = {}) {
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
            COUNT(*) AS total_orders,
            SUM(total_amount) AS gross_revenue,
            SUM(platform_commission) AS platform_revenue,
            SUM(affiliate_commission) AS affiliate_costs,
            SUM(total_amount - platform_commission) AS vendor_payouts,
            AVG(platform_commission * 100.0 / NULLIF(total_amount, 0)) AS avg_commission_rate
        FROM cyberspace.orders o
        WHERE payment_status = 'paid'
        ${dateFilter}
    `, params);

    return result.rows[0];
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Vendor Connect
    createVendorConnectAccount,
    createVendorOnboardingLink,
    getVendorAccountStatus,

    // Checkout
    createMarketplaceCheckout,
    processSuccessfulPayment,

    // Payouts
    processPendingPayouts,
    getVendorPayouts,
    processAffiliatePayouts,

    // Refunds
    processRefund,

    // Webhooks
    handleMarketplaceWebhook,

    // Analytics
    getPaymentAnalytics,

    // Config
    CONFIG
};
