import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure, adminProcedure } from "../trpc";
import {
  db,
  provisions,
  provisionActivities,
  deals,
  invoices,
  payments,
  contacts,
  users,
  eq,
  and,
  desc,
  asc,
  count,
  sum,
  sql,
  gte,
  lte,
  inArray,
} from "@nexus/db";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Fixed commission rate: 2.5%
 */
const COMMISSION_RATE = "0.0250";
const COMMISSION_RATE_DECIMAL = 0.025;

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const provisionStatusSchema = z.enum([
  "pending_payment",
  "payment_confirmed",
  "payout_initiated",
  "payout_processing",
  "paid",
  "failed",
  "cancelled",
]);

const payoutMethodSchema = z.enum([
  "stripe_connect",
  "sepa",
  "manual",
]);

const provisionFilterSchema = z.object({
  status: provisionStatusSchema.optional(),
  statuses: z.array(provisionStatusSchema).optional(),
  payoutMethod: payoutMethodSchema.optional(),
  beneficiaryContactId: z.string().uuid().optional(),
  beneficiaryUserId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"]).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  search: z.string().optional(),
});

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const createProvisionSchema = z.object({
  dealId: z.string().uuid(),
  invoiceId: z.string().uuid().optional(),
  beneficiaryContactId: z.string().uuid().optional(),
  beneficiaryUserId: z.string().uuid().optional(),
  beneficiaryName: z.string().max(255).optional(),
  beneficiaryEmail: z.string().email().optional(),
  dealAmount: z.string(), // decimal as string
  currency: z.string().length(3).default("EUR"),
  subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"]).optional(),
  notes: z.string().optional(),
  // SEPA details (optional, can be provided later)
  sepaIban: z.string().max(34).optional(),
  sepaBic: z.string().max(11).optional(),
  sepaAccountHolder: z.string().max(255).optional(),
  sepaBankName: z.string().max(255).optional(),
  // Stripe Connect details (optional)
  stripeConnectAccountId: z.string().max(255).optional(),
});

const markAsPaidSchema = z.object({
  provisionId: z.string().uuid(),
  payoutMethod: payoutMethodSchema,
  payoutReference: z.string().max(255).optional(),
  notes: z.string().optional(),
});

const initiateStripePayoutSchema = z.object({
  provisionId: z.string().uuid(),
  stripeConnectAccountId: z.string().max(255).optional(), // Use existing or provide new
});

const initiateSepaPayoutSchema = z.object({
  provisionId: z.string().uuid(),
  sepaIban: z.string().max(34).optional(), // Use existing or provide new
  sepaBic: z.string().max(11).optional(),
  sepaAccountHolder: z.string().max(255).optional(),
  sepaBankName: z.string().max(255).optional(),
});

const monthlyProvisionSchema = z.object({
  year: z.number().min(2020).max(2100),
  month: z.number().min(1).max(12),
  subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"]).optional(),
});

// =============================================================================
// PROVISION ROUTER
// =============================================================================

export const provisionRouter = createTRPCRouter({
  // =========================================================================
  // getDashboardStats - Total pending, paid, by status
  // =========================================================================
  getDashboardStats: orgProcedure
    .input(z.object({
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
      subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(provisions.organizationId, ctx.organizationId)];

      if (input?.dateFrom) {
        conditions.push(gte(provisions.createdAt, input.dateFrom));
      }
      if (input?.dateTo) {
        conditions.push(lte(provisions.createdAt, input.dateTo));
      }
      if (input?.subsidiary) {
        conditions.push(eq(provisions.subsidiary, input.subsidiary));
      }

      // Get totals by status
      const byStatus = await db
        .select({
          status: provisions.status,
          count: count(),
          totalAmount: sum(provisions.commissionAmount),
        })
        .from(provisions)
        .where(and(...conditions))
        .groupBy(provisions.status);

      // Calculate aggregates
      let totalPending = 0;
      let totalPaid = 0;
      let totalProcessing = 0;
      let totalFailed = 0;
      let pendingCount = 0;
      let paidCount = 0;

      const statusMap: Record<string, { count: number; amount: string }> = {};

      for (const row of byStatus) {
        const amount = parseFloat(row.totalAmount ?? "0");
        const rowCount = Number(row.count);
        statusMap[row.status ?? "unknown"] = {
          count: rowCount,
          amount: row.totalAmount ?? "0",
        };

        if (row.status === "pending_payment" || row.status === "payment_confirmed") {
          totalPending += amount;
          pendingCount += rowCount;
        } else if (row.status === "paid") {
          totalPaid += amount;
          paidCount += rowCount;
        } else if (row.status === "payout_initiated" || row.status === "payout_processing") {
          totalProcessing += amount;
        } else if (row.status === "failed") {
          totalFailed += amount;
        }
      }

      // Get recent provisions
      const recentProvisions = await db.query.provisions.findMany({
        where: and(...conditions),
        orderBy: desc(provisions.createdAt),
        limit: 5,
        with: {
          deal: true,
          beneficiaryContact: true,
        },
      });

      // Get this month's stats
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [monthlyStats] = await db
        .select({
          count: count(),
          totalAmount: sum(provisions.commissionAmount),
          paidAmount: sql<string>`SUM(CASE WHEN ${provisions.status} = 'paid' THEN ${provisions.commissionAmount} ELSE 0 END)`,
        })
        .from(provisions)
        .where(and(
          eq(provisions.organizationId, ctx.organizationId),
          gte(provisions.createdAt, startOfMonth),
          ...(input?.subsidiary ? [eq(provisions.subsidiary, input.subsidiary)] : [])
        ));

      return {
        summary: {
          totalPending: totalPending.toFixed(2),
          totalPaid: totalPaid.toFixed(2),
          totalProcessing: totalProcessing.toFixed(2),
          totalFailed: totalFailed.toFixed(2),
          pendingCount,
          paidCount,
        },
        byStatus: statusMap,
        thisMonth: {
          count: monthlyStats?.count ?? 0,
          totalAmount: monthlyStats?.totalAmount ?? "0",
          paidAmount: monthlyStats?.paidAmount ?? "0",
        },
        recentProvisions,
        commissionRate: COMMISSION_RATE,
      };
    }),

  // =========================================================================
  // getPendingPayouts - List all pending provisions
  // =========================================================================
  getPendingPayouts: orgProcedure
    .input(z.object({
      pagination: paginationSchema.optional(),
      subsidiary: z.enum(["west_money_bau", "west_money_os", "z_automation", "dedsec_world_ai", "enterprise_universe"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const page = input?.pagination?.page ?? 1;
      const limit = input?.pagination?.limit ?? 20;
      const offset = (page - 1) * limit;

      const conditions = [
        eq(provisions.organizationId, ctx.organizationId),
        inArray(provisions.status, ["pending_payment", "payment_confirmed"]),
      ];

      if (input?.subsidiary) {
        conditions.push(eq(provisions.subsidiary, input.subsidiary));
      }

      const [countResult] = await db
        .select({ count: count() })
        .from(provisions)
        .where(and(...conditions));

      const total = countResult?.count ?? 0;

      const items = await db.query.provisions.findMany({
        where: and(...conditions),
        orderBy: desc(provisions.createdAt),
        limit,
        offset,
        with: {
          deal: true,
          beneficiaryContact: true,
          beneficiaryUser: true,
          invoice: true,
        },
      });

      return {
        items,
        total,
        page,
        limit,
        hasMore: offset + items.length < total,
        totalPages: Math.ceil(total / limit),
        totalPendingAmount: items.reduce((sum, p) => sum + parseFloat(p.commissionAmount ?? "0"), 0).toFixed(2),
      };
    }),

  // =========================================================================
  // getPayoutHistory - List paid provisions
  // =========================================================================
  getPayoutHistory: orgProcedure
    .input(z.object({
      pagination: paginationSchema.optional(),
      filters: provisionFilterSchema.optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const page = input?.pagination?.page ?? 1;
      const limit = input?.pagination?.limit ?? 20;
      const offset = (page - 1) * limit;

      const conditions = [
        eq(provisions.organizationId, ctx.organizationId),
        eq(provisions.status, "paid"),
      ];

      if (input?.filters?.subsidiary) {
        conditions.push(eq(provisions.subsidiary, input.filters.subsidiary));
      }
      if (input?.filters?.payoutMethod) {
        conditions.push(eq(provisions.payoutMethod, input.filters.payoutMethod));
      }
      if (input?.filters?.dateFrom) {
        conditions.push(gte(provisions.payoutCompletedAt, input.filters.dateFrom));
      }
      if (input?.filters?.dateTo) {
        conditions.push(lte(provisions.payoutCompletedAt, input.filters.dateTo));
      }
      if (input?.filters?.beneficiaryContactId) {
        conditions.push(eq(provisions.beneficiaryContactId, input.filters.beneficiaryContactId));
      }

      const [countResult] = await db
        .select({ count: count() })
        .from(provisions)
        .where(and(...conditions));

      const total = countResult?.count ?? 0;

      const items = await db.query.provisions.findMany({
        where: and(...conditions),
        orderBy: desc(provisions.payoutCompletedAt),
        limit,
        offset,
        with: {
          deal: true,
          beneficiaryContact: true,
          beneficiaryUser: true,
          invoice: true,
          approvedByUser: true,
        },
      });

      // Calculate total paid amount
      const [totalPaidResult] = await db
        .select({ total: sum(provisions.commissionAmount) })
        .from(provisions)
        .where(and(...conditions));

      return {
        items,
        total,
        page,
        limit,
        hasMore: offset + items.length < total,
        totalPages: Math.ceil(total / limit),
        totalPaidAmount: totalPaidResult?.total ?? "0",
      };
    }),

  // =========================================================================
  // list - List all provisions with filters
  // =========================================================================
  list: orgProcedure
    .input(z.object({
      filters: provisionFilterSchema.optional(),
      pagination: paginationSchema.optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { filters, pagination } = input;
      const page = pagination?.page ?? 1;
      const limit = pagination?.limit ?? 20;
      const offset = (page - 1) * limit;

      const conditions = [eq(provisions.organizationId, ctx.organizationId)];

      if (filters?.status) {
        conditions.push(eq(provisions.status, filters.status));
      }
      if (filters?.statuses && filters.statuses.length > 0) {
        conditions.push(inArray(provisions.status, filters.statuses));
      }
      if (filters?.payoutMethod) {
        conditions.push(eq(provisions.payoutMethod, filters.payoutMethod));
      }
      if (filters?.beneficiaryContactId) {
        conditions.push(eq(provisions.beneficiaryContactId, filters.beneficiaryContactId));
      }
      if (filters?.beneficiaryUserId) {
        conditions.push(eq(provisions.beneficiaryUserId, filters.beneficiaryUserId));
      }
      if (filters?.dealId) {
        conditions.push(eq(provisions.dealId, filters.dealId));
      }
      if (filters?.subsidiary) {
        conditions.push(eq(provisions.subsidiary, filters.subsidiary));
      }
      if (filters?.dateFrom) {
        conditions.push(gte(provisions.createdAt, filters.dateFrom));
      }
      if (filters?.dateTo) {
        conditions.push(lte(provisions.createdAt, filters.dateTo));
      }

      const [countResult] = await db
        .select({ count: count() })
        .from(provisions)
        .where(and(...conditions));

      const total = countResult?.count ?? 0;

      const sortField = provisions[pagination?.sortBy as keyof typeof provisions] ?? provisions.createdAt;
      const sortOrder = pagination?.sortOrder === "asc" ? asc : desc;

      const items = await db.query.provisions.findMany({
        where: and(...conditions),
        orderBy: sortOrder(sortField as any),
        limit,
        offset,
        with: {
          deal: true,
          beneficiaryContact: true,
          beneficiaryUser: true,
          invoice: true,
        },
      });

      return {
        items,
        total,
        page,
        limit,
        hasMore: offset + items.length < total,
        totalPages: Math.ceil(total / limit),
      };
    }),

  // =========================================================================
  // getById - Get single provision by ID
  // =========================================================================
  getById: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const provision = await db.query.provisions.findFirst({
        where: and(
          eq(provisions.id, input.id),
          eq(provisions.organizationId, ctx.organizationId)
        ),
        with: {
          deal: {
            with: {
              contact: true,
              owner: true,
            },
          },
          beneficiaryContact: true,
          beneficiaryUser: true,
          invoice: true,
          payment: true,
          approvedByUser: true,
          createdByUser: true,
          activities: {
            orderBy: desc(provisionActivities.occurredAt),
            limit: 50,
          },
        },
      });

      if (!provision) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provision not found",
        });
      }

      return provision;
    }),

  // =========================================================================
  // getProvisionByDeal - Get provision for specific deal
  // =========================================================================
  getProvisionByDeal: orgProcedure
    .input(z.object({ dealId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const provision = await db.query.provisions.findFirst({
        where: and(
          eq(provisions.dealId, input.dealId),
          eq(provisions.organizationId, ctx.organizationId)
        ),
        with: {
          deal: true,
          beneficiaryContact: true,
          beneficiaryUser: true,
          invoice: true,
          activities: {
            orderBy: desc(provisionActivities.occurredAt),
            limit: 20,
          },
        },
      });

      return provision; // Can be null if no provision exists for deal
    }),

  // =========================================================================
  // create - Create new provision
  // =========================================================================
  create: orgProcedure
    .input(createProvisionSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify deal exists and belongs to organization
      const deal = await db.query.deals.findFirst({
        where: and(
          eq(deals.id, input.dealId),
          eq(deals.organizationId, ctx.organizationId)
        ),
      });

      if (!deal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deal not found",
        });
      }

      // Check if provision already exists for this deal
      const existingProvision = await db.query.provisions.findFirst({
        where: and(
          eq(provisions.dealId, input.dealId),
          eq(provisions.organizationId, ctx.organizationId)
        ),
      });

      if (existingProvision) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A provision already exists for this deal",
        });
      }

      // Calculate commission amount
      const dealAmount = parseFloat(input.dealAmount);
      const commissionAmount = (dealAmount * COMMISSION_RATE_DECIMAL).toFixed(2);

      const [provision] = await db
        .insert(provisions)
        .values({
          organizationId: ctx.organizationId,
          dealId: input.dealId,
          invoiceId: input.invoiceId,
          beneficiaryContactId: input.beneficiaryContactId,
          beneficiaryUserId: input.beneficiaryUserId,
          beneficiaryName: input.beneficiaryName,
          beneficiaryEmail: input.beneficiaryEmail,
          dealAmount: input.dealAmount,
          commissionRate: COMMISSION_RATE,
          commissionAmount,
          currency: input.currency,
          subsidiary: input.subsidiary,
          status: "pending_payment",
          notes: input.notes,
          sepaIban: input.sepaIban,
          sepaBic: input.sepaBic,
          sepaAccountHolder: input.sepaAccountHolder,
          sepaBankName: input.sepaBankName,
          stripeConnectAccountId: input.stripeConnectAccountId,
          createdBy: ctx.user.id,
        })
        .returning();

      // Log activity
      await db.insert(provisionActivities).values({
        provisionId: provision.id,
        organizationId: ctx.organizationId,
        type: "created",
        title: "Provision created",
        description: `Commission of ${commissionAmount} ${input.currency} (${(COMMISSION_RATE_DECIMAL * 100).toFixed(1)}% of ${input.dealAmount})`,
        toStatus: "pending_payment",
        performedBy: ctx.user.id,
      });

      return provision;
    }),

  // =========================================================================
  // confirmCustomerPayment - Mark that customer has paid (triggers payout eligibility)
  // =========================================================================
  confirmCustomerPayment: orgProcedure
    .input(z.object({
      provisionId: z.string().uuid(),
      paymentId: z.string().uuid().optional(),
      paymentReference: z.string().max(255).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.provisions.findFirst({
        where: and(
          eq(provisions.id, input.provisionId),
          eq(provisions.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provision not found",
        });
      }

      if (existing.status !== "pending_payment") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot confirm payment for provision in status: ${existing.status}`,
        });
      }

      const [provision] = await db
        .update(provisions)
        .set({
          status: "payment_confirmed",
          paymentId: input.paymentId,
          customerPaymentConfirmedAt: new Date(),
          customerPaymentReference: input.paymentReference,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(provisions.id, input.provisionId))
        .returning();

      // Log activity
      await db.insert(provisionActivities).values({
        provisionId: provision.id,
        organizationId: ctx.organizationId,
        type: "status_change",
        title: "Customer payment confirmed",
        description: input.notes ?? "Customer payment has been confirmed. Provision is now eligible for payout.",
        fromStatus: "pending_payment",
        toStatus: "payment_confirmed",
        metadata: {
          paymentId: input.paymentId,
          paymentReference: input.paymentReference,
        },
        performedBy: ctx.user.id,
      });

      return provision;
    }),

  // =========================================================================
  // markAsPaid - Mark provision as paid (after payout completed)
  // =========================================================================
  markAsPaid: adminProcedure
    .input(markAsPaidSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.provisions.findFirst({
        where: and(
          eq(provisions.id, input.provisionId),
          eq(provisions.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provision not found",
        });
      }

      // Can only mark as paid if payment was confirmed or payout was processing
      const validStatuses = ["payment_confirmed", "payout_initiated", "payout_processing"];
      if (!validStatuses.includes(existing.status ?? "")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot mark as paid from status: ${existing.status}. Must be one of: ${validStatuses.join(", ")}`,
        });
      }

      const [provision] = await db
        .update(provisions)
        .set({
          status: "paid",
          payoutMethod: input.payoutMethod,
          payoutCompletedAt: new Date(),
          payoutReference: input.payoutReference,
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          approvalNotes: input.notes,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(provisions.id, input.provisionId))
        .returning();

      // Log activity
      await db.insert(provisionActivities).values({
        provisionId: provision.id,
        organizationId: ctx.organizationId,
        type: "payout_completed",
        title: "Provision paid",
        description: `Commission paid via ${input.payoutMethod}${input.payoutReference ? `. Reference: ${input.payoutReference}` : ""}`,
        fromStatus: existing.status,
        toStatus: "paid",
        metadata: {
          payoutMethod: input.payoutMethod,
          payoutReference: input.payoutReference,
        },
        performedBy: ctx.user.id,
      });

      return provision;
    }),

  // =========================================================================
  // initiateStripePayout - Trigger Stripe Connect payout
  // =========================================================================
  initiateStripePayout: adminProcedure
    .input(initiateStripePayoutSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.provisions.findFirst({
        where: and(
          eq(provisions.id, input.provisionId),
          eq(provisions.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provision not found",
        });
      }

      if (existing.status !== "payment_confirmed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot initiate payout from status: ${existing.status}. Customer payment must be confirmed first.`,
        });
      }

      const stripeAccountId = input.stripeConnectAccountId ?? existing.stripeConnectAccountId;
      if (!stripeAccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Stripe Connect account ID is required for Stripe payout",
        });
      }

      // Generate a reference ID for this payout attempt
      const payoutReference = `STRIPE-${Date.now()}-${existing.id.slice(0, 8)}`;

      // In a real implementation, this would call the Stripe API:
      // const transfer = await stripe.transfers.create({
      //   amount: Math.round(parseFloat(existing.commissionAmount) * 100),
      //   currency: existing.currency?.toLowerCase() ?? "eur",
      //   destination: stripeAccountId,
      //   transfer_group: existing.dealId,
      //   metadata: {
      //     provisionId: existing.id,
      //     dealId: existing.dealId,
      //   },
      // });

      const [provision] = await db
        .update(provisions)
        .set({
          status: "payout_initiated",
          payoutMethod: "stripe_connect",
          stripeConnectAccountId: stripeAccountId,
          payoutInitiatedAt: new Date(),
          payoutReference,
          // In real implementation:
          // stripeTransferId: transfer.id,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(provisions.id, input.provisionId))
        .returning();

      // Log activity
      await db.insert(provisionActivities).values({
        provisionId: provision.id,
        organizationId: ctx.organizationId,
        type: "payout_initiated",
        title: "Stripe payout initiated",
        description: `Stripe Connect transfer initiated to account ${stripeAccountId}`,
        fromStatus: "payment_confirmed",
        toStatus: "payout_initiated",
        metadata: {
          payoutMethod: "stripe_connect",
          stripeConnectAccountId: stripeAccountId,
          payoutReference,
        },
        performedBy: ctx.user.id,
      });

      return {
        provision,
        message: "Stripe payout initiated successfully",
        payoutReference,
        // In production, include:
        // stripeTransferId: transfer.id,
      };
    }),

  // =========================================================================
  // initiateSepaPayout - Trigger SEPA bank transfer
  // =========================================================================
  initiateSepaPayout: adminProcedure
    .input(initiateSepaPayoutSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.provisions.findFirst({
        where: and(
          eq(provisions.id, input.provisionId),
          eq(provisions.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provision not found",
        });
      }

      if (existing.status !== "payment_confirmed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot initiate payout from status: ${existing.status}. Customer payment must be confirmed first.`,
        });
      }

      // Use provided or existing SEPA details
      const sepaIban = input.sepaIban ?? existing.sepaIban;
      const sepaBic = input.sepaBic ?? existing.sepaBic;
      const sepaAccountHolder = input.sepaAccountHolder ?? existing.sepaAccountHolder;
      const sepaBankName = input.sepaBankName ?? existing.sepaBankName;

      if (!sepaIban) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "SEPA IBAN is required for SEPA transfer",
        });
      }

      // Generate a SEPA transfer reference
      const sepaTransferReference = `PROV-${existing.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

      // In a real implementation, this would integrate with your bank API or
      // payment processor to initiate the SEPA transfer

      const [provision] = await db
        .update(provisions)
        .set({
          status: "payout_initiated",
          payoutMethod: "sepa",
          sepaIban,
          sepaBic,
          sepaAccountHolder,
          sepaBankName,
          sepaTransferReference,
          payoutInitiatedAt: new Date(),
          payoutReference: sepaTransferReference,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(provisions.id, input.provisionId))
        .returning();

      // Log activity
      await db.insert(provisionActivities).values({
        provisionId: provision.id,
        organizationId: ctx.organizationId,
        type: "payout_initiated",
        title: "SEPA transfer initiated",
        description: `SEPA transfer initiated to ${sepaIban.slice(0, 4)}****${sepaIban.slice(-4)}`,
        fromStatus: "payment_confirmed",
        toStatus: "payout_initiated",
        metadata: {
          payoutMethod: "sepa",
          sepaIbanMasked: `${sepaIban.slice(0, 4)}****${sepaIban.slice(-4)}`,
          sepaTransferReference,
        },
        performedBy: ctx.user.id,
      });

      return {
        provision,
        message: "SEPA transfer initiated successfully",
        sepaTransferReference,
      };
    }),

  // =========================================================================
  // calculateMonthlyProvision - Aggregate for month
  // =========================================================================
  calculateMonthlyProvision: orgProcedure
    .input(monthlyProvisionSchema)
    .query(async ({ ctx, input }) => {
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0, 23, 59, 59, 999);

      const conditions = [
        eq(provisions.organizationId, ctx.organizationId),
        gte(provisions.createdAt, startDate),
        lte(provisions.createdAt, endDate),
      ];

      if (input.subsidiary) {
        conditions.push(eq(provisions.subsidiary, input.subsidiary));
      }

      // Get totals
      const [totals] = await db
        .select({
          totalCount: count(),
          totalDealAmount: sum(provisions.dealAmount),
          totalCommissionAmount: sum(provisions.commissionAmount),
        })
        .from(provisions)
        .where(and(...conditions));

      // Get breakdown by status
      const byStatus = await db
        .select({
          status: provisions.status,
          count: count(),
          dealAmount: sum(provisions.dealAmount),
          commissionAmount: sum(provisions.commissionAmount),
        })
        .from(provisions)
        .where(and(...conditions))
        .groupBy(provisions.status);

      // Get breakdown by payout method (for paid provisions)
      const byPayoutMethod = await db
        .select({
          payoutMethod: provisions.payoutMethod,
          count: count(),
          commissionAmount: sum(provisions.commissionAmount),
        })
        .from(provisions)
        .where(and(
          ...conditions,
          eq(provisions.status, "paid")
        ))
        .groupBy(provisions.payoutMethod);

      // Get top beneficiaries
      const topBeneficiaries = await db
        .select({
          beneficiaryContactId: provisions.beneficiaryContactId,
          beneficiaryName: provisions.beneficiaryName,
          beneficiaryEmail: provisions.beneficiaryEmail,
          count: count(),
          totalCommission: sum(provisions.commissionAmount),
        })
        .from(provisions)
        .where(and(...conditions))
        .groupBy(
          provisions.beneficiaryContactId,
          provisions.beneficiaryName,
          provisions.beneficiaryEmail
        )
        .orderBy(desc(sum(provisions.commissionAmount)))
        .limit(10);

      return {
        period: {
          year: input.year,
          month: input.month,
          startDate,
          endDate,
        },
        totals: {
          count: totals?.totalCount ?? 0,
          dealAmount: totals?.totalDealAmount ?? "0",
          commissionAmount: totals?.totalCommissionAmount ?? "0",
        },
        byStatus: byStatus.map(row => ({
          status: row.status,
          count: row.count,
          dealAmount: row.dealAmount ?? "0",
          commissionAmount: row.commissionAmount ?? "0",
        })),
        byPayoutMethod: byPayoutMethod.map(row => ({
          payoutMethod: row.payoutMethod,
          count: row.count,
          commissionAmount: row.commissionAmount ?? "0",
        })),
        topBeneficiaries,
        commissionRate: COMMISSION_RATE,
      };
    }),

  // =========================================================================
  // cancel - Cancel a provision
  // =========================================================================
  cancel: adminProcedure
    .input(z.object({
      provisionId: z.string().uuid(),
      reason: z.string().min(1).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.provisions.findFirst({
        where: and(
          eq(provisions.id, input.provisionId),
          eq(provisions.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provision not found",
        });
      }

      // Cannot cancel if already paid
      if (existing.status === "paid") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot cancel a provision that has already been paid",
        });
      }

      const [provision] = await db
        .update(provisions)
        .set({
          status: "cancelled",
          internalNotes: `Cancelled: ${input.reason}`,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(provisions.id, input.provisionId))
        .returning();

      // Log activity
      await db.insert(provisionActivities).values({
        provisionId: provision.id,
        organizationId: ctx.organizationId,
        type: "status_change",
        title: "Provision cancelled",
        description: input.reason,
        fromStatus: existing.status,
        toStatus: "cancelled",
        performedBy: ctx.user.id,
      });

      return provision;
    }),

  // =========================================================================
  // markPayoutFailed - Mark payout as failed
  // =========================================================================
  markPayoutFailed: adminProcedure
    .input(z.object({
      provisionId: z.string().uuid(),
      failureCode: z.string().max(100).optional(),
      failureReason: z.string().max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.provisions.findFirst({
        where: and(
          eq(provisions.id, input.provisionId),
          eq(provisions.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provision not found",
        });
      }

      const validStatuses = ["payout_initiated", "payout_processing"];
      if (!validStatuses.includes(existing.status ?? "")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot mark as failed from status: ${existing.status}`,
        });
      }

      const retryCount = parseInt(existing.retryCount ?? "0") + 1;

      const [provision] = await db
        .update(provisions)
        .set({
          status: "failed",
          failureCode: input.failureCode,
          failureReason: input.failureReason,
          retryCount: retryCount.toString(),
          lastRetryAt: new Date(),
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(provisions.id, input.provisionId))
        .returning();

      // Log activity
      await db.insert(provisionActivities).values({
        provisionId: provision.id,
        organizationId: ctx.organizationId,
        type: "payout_failed",
        title: "Payout failed",
        description: `${input.failureReason}${input.failureCode ? ` (Code: ${input.failureCode})` : ""}`,
        fromStatus: existing.status,
        toStatus: "failed",
        metadata: {
          failureCode: input.failureCode,
          failureReason: input.failureReason,
          retryCount,
        },
        performedBy: ctx.user.id,
      });

      return provision;
    }),

  // =========================================================================
  // retryPayout - Retry a failed payout
  // =========================================================================
  retryPayout: adminProcedure
    .input(z.object({
      provisionId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.provisions.findFirst({
        where: and(
          eq(provisions.id, input.provisionId),
          eq(provisions.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provision not found",
        });
      }

      if (existing.status !== "failed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only retry failed payouts",
        });
      }

      // Reset to payment_confirmed so it can be initiated again
      const [provision] = await db
        .update(provisions)
        .set({
          status: "payment_confirmed",
          failureCode: null,
          failureReason: null,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(provisions.id, input.provisionId))
        .returning();

      // Log activity
      await db.insert(provisionActivities).values({
        provisionId: provision.id,
        organizationId: ctx.organizationId,
        type: "status_change",
        title: "Payout retry requested",
        description: "Provision reset to payment_confirmed status for retry",
        fromStatus: "failed",
        toStatus: "payment_confirmed",
        performedBy: ctx.user.id,
      });

      return provision;
    }),

  // =========================================================================
  // updateBeneficiaryDetails - Update beneficiary payment details
  // =========================================================================
  updateBeneficiaryDetails: orgProcedure
    .input(z.object({
      provisionId: z.string().uuid(),
      beneficiaryName: z.string().max(255).optional(),
      beneficiaryEmail: z.string().email().optional(),
      sepaIban: z.string().max(34).optional(),
      sepaBic: z.string().max(11).optional(),
      sepaAccountHolder: z.string().max(255).optional(),
      sepaBankName: z.string().max(255).optional(),
      stripeConnectAccountId: z.string().max(255).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.provisions.findFirst({
        where: and(
          eq(provisions.id, input.provisionId),
          eq(provisions.organizationId, ctx.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provision not found",
        });
      }

      // Cannot update if already paid
      if (existing.status === "paid") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot update beneficiary details for a paid provision",
        });
      }

      const { provisionId, ...updateData } = input;

      const [provision] = await db
        .update(provisions)
        .set({
          ...updateData,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(provisions.id, provisionId))
        .returning();

      // Log activity
      await db.insert(provisionActivities).values({
        provisionId: provision.id,
        organizationId: ctx.organizationId,
        type: "updated",
        title: "Beneficiary details updated",
        description: "Payment details have been updated",
        metadata: {
          updatedFields: Object.keys(updateData).filter(k => updateData[k as keyof typeof updateData] !== undefined),
        },
        performedBy: ctx.user.id,
      });

      return provision;
    }),
});
