/**
 * Stripe Integration for West Money Bau
 * Handles payments, invoices, and subcontractor payouts via Stripe Connect
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLATFORM_FEE_PERCENT = 5; // 5% platform fee

/**
 * Create a Stripe customer for a BAU customer
 */
async function createCustomer(customerData) {
    const { email, firstName, lastName, company, phone, address } = customerData;

    return await stripe.customers.create({
        email: email,
        name: company || `${firstName} ${lastName}`,
        phone: phone,
        address: address ? {
            line1: address.street,
            city: address.city,
            postal_code: address.postalCode,
            country: address.country || 'DE'
        } : undefined,
        metadata: {
            platform: 'west_money_bau',
            first_name: firstName,
            last_name: lastName
        }
    });
}

/**
 * Create a Stripe Connect account for a subcontractor
 */
async function createConnectAccount(subcontractorData) {
    const { email, firstName, lastName, country, companyName } = subcontractorData;

    // Create Express account (easier onboarding for subcontractors)
    const account = await stripe.accounts.create({
        type: 'express',
        country: country || 'DE',
        email: email,
        capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true }
        },
        business_type: companyName ? 'company' : 'individual',
        business_profile: {
            name: companyName || `${firstName} ${lastName}`,
            mcc: '1711', // Heating, plumbing, A/C contractors
            url: 'https://west-money-bau.de'
        },
        metadata: {
            platform: 'west_money_bau',
            subcontractor_name: `${firstName} ${lastName}`
        }
    });

    return account;
}

/**
 * Generate Connect account onboarding link
 */
async function createAccountLink(accountId, returnUrl, refreshUrl) {
    return await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl || 'https://west-money-bau.de/portal/onboarding/refresh',
        return_url: returnUrl || 'https://west-money-bau.de/portal/onboarding/complete',
        type: 'account_onboarding'
    });
}

/**
 * Check Connect account status
 */
async function getAccountStatus(accountId) {
    const account = await stripe.accounts.retrieve(accountId);
    return {
        id: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        requirements: account.requirements
    };
}

/**
 * Create invoice for a project
 */
async function createInvoice(invoiceData) {
    const { customerId, items, dueDate, projectNumber, memo } = invoiceData;

    // Create invoice
    const invoice = await stripe.invoices.create({
        customer: customerId,
        collection_method: 'send_invoice',
        days_until_due: dueDate ? Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : 14,
        metadata: {
            platform: 'west_money_bau',
            project_number: projectNumber
        },
        footer: memo || 'West Money Bau GmbH - Smart Home & Barrierefreies Bauen'
    });

    // Add line items
    for (const item of items) {
        await stripe.invoiceItems.create({
            customer: customerId,
            invoice: invoice.id,
            description: item.description,
            amount: Math.round(item.amount * 100), // Convert to cents
            currency: 'eur',
            quantity: item.quantity || 1
        });
    }

    // Finalize and send
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    await stripe.invoices.sendInvoice(finalizedInvoice.id);

    return finalizedInvoice;
}

/**
 * Create payment intent for deposit
 */
async function createPaymentIntent(paymentData) {
    const { amount, customerId, description, projectId } = paymentData;

    return await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'eur',
        customer: customerId,
        description: description,
        metadata: {
            platform: 'west_money_bau',
            project_id: projectId
        },
        automatic_payment_methods: {
            enabled: true
        }
    });
}

/**
 * Create payout to subcontractor via Stripe Connect
 */
async function createSubcontractorPayout(payoutData) {
    const { connectAccountId, amount, assignmentId, description } = payoutData;

    // Calculate platform fee
    const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT / 100);
    const netAmount = amount - platformFee;

    // Create transfer to connected account
    const transfer = await stripe.transfers.create({
        amount: Math.round(netAmount * 100), // Convert to cents
        currency: 'eur',
        destination: connectAccountId,
        description: description || `Zahlung fuer Auftrag #${assignmentId}`,
        metadata: {
            platform: 'west_money_bau',
            assignment_id: assignmentId,
            gross_amount: amount,
            platform_fee: platformFee
        }
    });

    return {
        transfer,
        grossAmount: amount,
        platformFee,
        netAmount
    };
}

/**
 * Get payout history for a subcontractor
 */
async function getPayoutHistory(connectAccountId, limit = 10) {
    return await stripe.transfers.list({
        destination: connectAccountId,
        limit: limit
    });
}

/**
 * Handle Stripe webhook events
 */
async function handleWebhook(payload, signature, webhookSecret) {
    let event;

    try {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
        throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    // Handle different event types
    switch (event.type) {
        case 'payment_intent.succeeded':
            return { type: 'payment_succeeded', data: event.data.object };

        case 'invoice.paid':
            return { type: 'invoice_paid', data: event.data.object };

        case 'invoice.payment_failed':
            return { type: 'invoice_failed', data: event.data.object };

        case 'transfer.created':
            return { type: 'transfer_created', data: event.data.object };

        case 'account.updated':
            return { type: 'account_updated', data: event.data.object };

        default:
            return { type: 'unknown', data: event.data.object };
    }
}

/**
 * Create checkout session for project deposit
 */
async function createCheckoutSession(sessionData) {
    const { customerId, amount, projectNumber, successUrl, cancelUrl } = sessionData;

    return await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card', 'sepa_debit', 'sofort', 'giropay'],
        mode: 'payment',
        line_items: [{
            price_data: {
                currency: 'eur',
                product_data: {
                    name: `Anzahlung Projekt ${projectNumber}`,
                    description: 'West Money Bau - Smart Home & Barrierefreies Bauen'
                },
                unit_amount: Math.round(amount * 100)
            },
            quantity: 1
        }],
        success_url: successUrl || `https://west-money-bau.de/portal/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `https://west-money-bau.de/portal/payment/cancel`,
        metadata: {
            platform: 'west_money_bau',
            project_number: projectNumber
        }
    });
}

module.exports = {
    createCustomer,
    createConnectAccount,
    createAccountLink,
    getAccountStatus,
    createInvoice,
    createPaymentIntent,
    createSubcontractorPayout,
    getPayoutHistory,
    handleWebhook,
    createCheckoutSession,
    PLATFORM_FEE_PERCENT
};
