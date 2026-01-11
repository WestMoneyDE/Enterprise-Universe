/**
 * Payment Processor Daemon
 * Processes pending payments and handles Stripe operations
 */

const db = require('./utils/database');
const emailService = require('./utils/email-service');

// Stripe configuration
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
let stripe;
try {
    stripe = require('stripe')(STRIPE_SECRET_KEY);
} catch (e) {
    console.error('[PaymentProcessor] Stripe not configured');
}

async function checkPendingPayments() {
    const results = { processed: 0, failed: 0 };

    try {
        // Get invoices that need payment link generation
        const pendingInvoices = await db.query(`
            SELECT p.*, c.email, c.first_name, c.last_name, c.stripe_customer_id
            FROM bau.payments p
            LEFT JOIN bau.customers c ON p.customer_id = c.id
            WHERE p.payment_type = 'customer_invoice'
            AND p.status = 'pending'
            AND p.stripe_payment_link IS NULL
            AND c.email IS NOT NULL
            LIMIT 20
        `);

        for (const invoice of pendingInvoices.rows) {
            try {
                if (!stripe) continue;

                // Create or get Stripe customer
                let customerId = invoice.stripe_customer_id;
                if (!customerId) {
                    const customer = await stripe.customers.create({
                        email: invoice.email,
                        name: `${invoice.first_name} ${invoice.last_name}`,
                        metadata: { bau_customer_id: invoice.customer_id }
                    });
                    customerId = customer.id;

                    await db.query(
                        'UPDATE bau.customers SET stripe_customer_id = $1 WHERE id = $2',
                        [customerId, invoice.customer_id]
                    );
                }

                // Create payment link
                const paymentLink = await stripe.paymentLinks.create({
                    line_items: [{
                        price_data: {
                            currency: 'eur',
                            product_data: {
                                name: `Rechnung ${invoice.invoice_number}`,
                                description: 'West Money Bau'
                            },
                            unit_amount: Math.round(invoice.amount * 100)
                        },
                        quantity: 1
                    }],
                    metadata: {
                        payment_id: invoice.id,
                        invoice_number: invoice.invoice_number
                    }
                });

                // Update payment record
                await db.query(`
                    UPDATE bau.payments
                    SET stripe_payment_link = $1, stripe_payment_link_id = $2
                    WHERE id = $3
                `, [paymentLink.url, paymentLink.id, invoice.id]);

                // Send payment email
                await emailService.sendEmail({
                    to: invoice.email,
                    subject: `Rechnung ${invoice.invoice_number} - Zahlungslink`,
                    body: `
Sehr geehrte/r ${invoice.first_name} ${invoice.last_name},

anbei finden Sie den Zahlungslink für Ihre Rechnung:

Rechnungsnummer: ${invoice.invoice_number}
Betrag: ${parseFloat(invoice.amount).toFixed(2)} EUR

Zahlungslink: ${paymentLink.url}

Mit freundlichen Grüßen
West Money Bau
                    `
                });

                results.processed++;

            } catch (error) {
                console.error(`[PaymentProcessor] Error processing ${invoice.invoice_number}:`, error.message);
                results.failed++;
            }
        }

    } catch (error) {
        console.error('[PaymentProcessor] Error:', error.message);
    }

    return results;
}

async function processSubcontractorPayouts() {
    const results = { processed: 0, failed: 0 };

    try {
        // Get completed assignments ready for payout
        const assignments = await db.query(`
            SELECT
                pa.*,
                s.stripe_connect_id,
                s.email,
                s.first_name,
                s.last_name,
                p.title as project_title
            FROM bau.project_assignments pa
            LEFT JOIN bau.subcontractors s ON pa.subcontractor_id = s.id
            LEFT JOIN bau.projects p ON pa.project_id = p.id
            WHERE pa.status = 'completed'
            AND pa.payment_status = 'pending'
            AND s.stripe_connect_id IS NOT NULL
            AND pa.total_payment > 0
            LIMIT 10
        `);

        for (const assignment of assignments.rows) {
            try {
                if (!stripe) continue;

                const amount = parseFloat(assignment.total_payment);
                const platformFee = Math.round(amount * 0.05 * 100); // 5% fee
                const netAmount = Math.round(amount * 100) - platformFee;

                // Create transfer
                const transfer = await stripe.transfers.create({
                    amount: netAmount,
                    currency: 'eur',
                    destination: assignment.stripe_connect_id,
                    metadata: {
                        assignment_id: assignment.id,
                        project_title: assignment.project_title
                    }
                });

                // Update assignment
                await db.query(`
                    UPDATE bau.project_assignments
                    SET payment_status = 'paid', stripe_transfer_id = $1
                    WHERE id = $2
                `, [transfer.id, assignment.id]);

                // Record payment
                await db.query(`
                    INSERT INTO bau.payments
                    (payment_type, reference_type, reference_id, subcontractor_id,
                     amount, platform_fee, net_amount, status, paid_at)
                    VALUES ('subcontractor_payment', 'assignment', $1, $2, $3, $4, $5, 'paid', NOW())
                `, [assignment.id, assignment.subcontractor_id, amount, platformFee/100, netAmount/100]);

                // Notify subcontractor
                await emailService.sendEmail({
                    to: assignment.email,
                    subject: 'Zahlung erhalten - West Money Bau',
                    body: `
Hallo ${assignment.first_name},

Ihre Zahlung für das Projekt "${assignment.project_title}" wurde veranlasst.

Betrag: ${(netAmount/100).toFixed(2)} EUR (nach 5% Plattformgebühr)

Die Überweisung sollte in 2-3 Werktagen auf Ihrem Konto eingehen.

Mit freundlichen Grüßen
West Money Bau Team
                    `
                });

                results.processed++;

            } catch (error) {
                console.error(`[PaymentProcessor] Payout error:`, error.message);
                results.failed++;
            }
        }

    } catch (error) {
        console.error('[PaymentProcessor] Payout error:', error.message);
    }

    return results;
}

async function run() {
    const invoiceResults = await checkPendingPayments();
    const payoutResults = await processSubcontractorPayouts();

    return {
        success: true,
        summary: `${invoiceResults.processed} invoices, ${payoutResults.processed} payouts processed`,
        invoices: invoiceResults,
        payouts: payoutResults
    };
}

module.exports = { run };
