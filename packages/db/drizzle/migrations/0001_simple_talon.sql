CREATE TYPE "public"."money_machine_stage" AS ENUM('deal_received', 'kundenkarte_created', 'documents_pending', 'documents_uploaded', 'presentation_ready', 'email_sent', 'presentation_viewed', 'bauherren_pass_offered', 'bauherren_pass_sold', 'completed');--> statement-breakpoint
CREATE TYPE "public"."presentation_status" AS ENUM('draft', 'documents_ready', 'generating', 'ready', 'sent', 'viewed', 'completed', 'expired');--> statement-breakpoint
CREATE TABLE "deal_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hubspot_deal_id" varchar(50) NOT NULL,
	"deal_name" varchar(255),
	"deal_value" numeric(15, 2),
	"contact_email" varchar(255) NOT NULL,
	"contact_name" varchar(255),
	"contact_phone" varchar(50),
	"contact_company" varchar(255),
	"email_verified" boolean DEFAULT false,
	"email_sent_at" timestamp with time zone,
	"email_sent_count" integer DEFAULT 0,
	"last_send_status" varchar(50),
	"last_send_error" text,
	"source" varchar(50) DEFAULT 'manual',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "money_machine_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"activity_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"from_stage" "money_machine_stage",
	"to_stage" "money_machine_stage",
	"metadata" jsonb,
	"performed_by" uuid,
	"is_automated" boolean DEFAULT false,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "money_machine_workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"kundenkarte_id" uuid,
	"presentation_id" uuid,
	"contact_id" uuid,
	"hubspot_deal_id" varchar(50),
	"current_stage" "money_machine_stage" DEFAULT 'deal_received' NOT NULL,
	"previous_stage" "money_machine_stage",
	"deal_received_at" timestamp DEFAULT now(),
	"kundenkarte_created_at" timestamp,
	"documents_uploaded_at" timestamp,
	"presentation_ready_at" timestamp,
	"email_sent_at" timestamp,
	"presentation_viewed_at" timestamp,
	"bauherren_pass_offered_at" timestamp,
	"bauherren_pass_sold_at" timestamp,
	"completed_at" timestamp,
	"required_documents" jsonb,
	"documents_complete" boolean DEFAULT false,
	"customer_email" varchar(255),
	"email_sent_count" integer DEFAULT 0,
	"last_email_sent_at" timestamp,
	"deal_amount" integer,
	"bauherren_pass_revenue" integer,
	"total_revenue" integer,
	"is_active" boolean DEFAULT true,
	"is_paused" boolean DEFAULT false,
	"paused_reason" text,
	"last_error" text,
	"error_count" integer DEFAULT 0,
	"metadata" jsonb,
	"assigned_to" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "money_machine_workflows_deal_id_unique" UNIQUE("deal_id")
);
--> statement-breakpoint
CREATE TABLE "presentation_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"presentation_id" uuid NOT NULL,
	"viewed_at" timestamp DEFAULT now() NOT NULL,
	"duration" integer,
	"ip_address" varchar(45),
	"user_agent" text,
	"device_type" varchar(50),
	"slides_viewed" jsonb,
	"max_slide_reached" integer,
	"completed_viewing" boolean DEFAULT false,
	"downloaded_documents" boolean DEFAULT false,
	"clicked_contact_button" boolean DEFAULT false,
	"clicked_bauherren_pass" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "presentations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"kundenkarte_id" uuid,
	"contact_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "presentation_status" DEFAULT 'draft' NOT NULL,
	"access_token" varchar(64) NOT NULL,
	"public_url" text,
	"included_documents" jsonb,
	"slides" jsonb,
	"customer_snapshot" jsonb,
	"view_count" integer DEFAULT 0,
	"last_viewed_at" timestamp,
	"first_viewed_at" timestamp,
	"average_view_duration" integer,
	"email_sent_at" timestamp,
	"email_to" varchar(255),
	"email_opened_at" timestamp,
	"bauherren_pass_offered" boolean DEFAULT false,
	"bauherren_pass_offered_at" timestamp,
	"bauherren_pass_accepted" boolean DEFAULT false,
	"bauherren_pass_accepted_at" timestamp,
	"expires_at" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "presentations_access_token_unique" UNIQUE("access_token")
);
--> statement-breakpoint
ALTER TABLE "money_machine_activities" ADD CONSTRAINT "money_machine_activities_workflow_id_money_machine_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."money_machine_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_machine_activities" ADD CONSTRAINT "money_machine_activities_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD CONSTRAINT "money_machine_workflows_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD CONSTRAINT "money_machine_workflows_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD CONSTRAINT "money_machine_workflows_kundenkarte_id_kundenkarten_id_fk" FOREIGN KEY ("kundenkarte_id") REFERENCES "public"."kundenkarten"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD CONSTRAINT "money_machine_workflows_presentation_id_presentations_id_fk" FOREIGN KEY ("presentation_id") REFERENCES "public"."presentations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD CONSTRAINT "money_machine_workflows_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD CONSTRAINT "money_machine_workflows_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presentation_views" ADD CONSTRAINT "presentation_views_presentation_id_presentations_id_fk" FOREIGN KEY ("presentation_id") REFERENCES "public"."presentations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presentations" ADD CONSTRAINT "presentations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presentations" ADD CONSTRAINT "presentations_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presentations" ADD CONSTRAINT "presentations_kundenkarte_id_kundenkarten_id_fk" FOREIGN KEY ("kundenkarte_id") REFERENCES "public"."kundenkarten"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presentations" ADD CONSTRAINT "presentations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presentations" ADD CONSTRAINT "presentations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_deal_contacts_hubspot_id" ON "deal_contacts" USING btree ("hubspot_deal_id");--> statement-breakpoint
CREATE INDEX "idx_deal_contacts_email" ON "deal_contacts" USING btree ("contact_email");--> statement-breakpoint
CREATE INDEX "idx_deal_contacts_status" ON "deal_contacts" USING btree ("last_send_status");--> statement-breakpoint
CREATE INDEX "idx_deal_contacts_created" ON "deal_contacts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "money_machine_activities_workflow_idx" ON "money_machine_activities" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "money_machine_activities_type_idx" ON "money_machine_activities" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "money_machine_activities_occurred_at_idx" ON "money_machine_activities" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "money_machine_org_idx" ON "money_machine_workflows" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "money_machine_deal_idx" ON "money_machine_workflows" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "money_machine_stage_idx" ON "money_machine_workflows" USING btree ("current_stage");--> statement-breakpoint
CREATE INDEX "money_machine_hubspot_idx" ON "money_machine_workflows" USING btree ("hubspot_deal_id");--> statement-breakpoint
CREATE INDEX "money_machine_active_idx" ON "money_machine_workflows" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "presentation_views_presentation_idx" ON "presentation_views" USING btree ("presentation_id");--> statement-breakpoint
CREATE INDEX "presentation_views_viewed_at_idx" ON "presentation_views" USING btree ("viewed_at");--> statement-breakpoint
CREATE INDEX "presentations_org_idx" ON "presentations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "presentations_deal_idx" ON "presentations" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "presentations_kundenkarte_idx" ON "presentations" USING btree ("kundenkarte_id");--> statement-breakpoint
CREATE INDEX "presentations_status_idx" ON "presentations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "presentations_access_token_idx" ON "presentations" USING btree ("access_token");--> statement-breakpoint
CREATE INDEX "presentations_created_at_idx" ON "presentations" USING btree ("created_at");