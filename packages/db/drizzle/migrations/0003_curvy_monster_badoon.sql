ALTER TABLE "invoices" ADD COLUMN "commission_amount" numeric(15, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "commission_rate" numeric(5, 4) DEFAULT '0.01';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "commission_contact_email" varchar(255);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "commission_contact_name" varchar(255);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "commission_paid" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "commission_paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "commission_stripe_payment_link" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "commission_email_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "overdue_status" varchar(20);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "inkasso_status" varchar(20);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "inkasso_submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "inkasso_reference" varchar(100);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "inkasso_notes" text;--> statement-breakpoint
CREATE INDEX "invoices_commission_paid_idx" ON "invoices" USING btree ("commission_paid");--> statement-breakpoint
CREATE INDEX "invoices_overdue_status_idx" ON "invoices" USING btree ("overdue_status");--> statement-breakpoint
CREATE INDEX "invoices_inkasso_status_idx" ON "invoices" USING btree ("inkasso_status");