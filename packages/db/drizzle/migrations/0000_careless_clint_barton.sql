CREATE TYPE "public"."bauherren_pass_status" AS ENUM('nicht_erstellt', 'in_bearbeitung', 'vollstaendig', 'geprueft', 'freigegeben', 'archiviert');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."campaign_type" AS ENUM('one_time', 'sequence', 'trigger_based');--> statement-breakpoint
CREATE TYPE "public"."consent_status" AS ENUM('pending', 'granted', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."contact_type" AS ENUM('lead', 'customer', 'investor', 'partner', 'vendor', 'employee');--> statement-breakpoint
CREATE TYPE "public"."deal_stage" AS ENUM('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."document_category" AS ENUM('vertrag', 'genehmigung', 'baugenehmigung', 'statik', 'energieausweis', 'versicherung', 'rechnung', 'protokoll', 'plan', 'foto', 'sonstiges');--> statement-breakpoint
CREATE TYPE "public"."email_status" AS ENUM('active', 'bounced', 'complained', 'unsubscribed');--> statement-breakpoint
CREATE TYPE "public"."gewerke" AS ENUM('rohbau', 'maurerarbeiten', 'betonarbeiten', 'zimmererarbeiten', 'dachdeckerarbeiten', 'klempnerarbeiten', 'fassadenarbeiten', 'fenster_tueren', 'trockenbau', 'estricharbeiten', 'fliesenarbeiten', 'malerarbeiten', 'bodenbelaege', 'sanitaer', 'heizung', 'lueftung', 'elektro', 'smart_home', 'garten_landschaft', 'tiefbau', 'abbruch', 'entsorgung', 'geruestbau', 'sonstiges');--> statement-breakpoint
CREATE TYPE "public"."kundenkarte_status" AS ENUM('draft', 'pending_review', 'approved', 'active', 'on_hold', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."message_channel" AS ENUM('email', 'whatsapp', 'sms', 'push', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."message_status_v2" AS ENUM('pending', 'sent', 'delivered', 'read', 'failed', 'bounced');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."product_category" AS ENUM('construction', 'smart_home', 'software', 'consulting', 'maintenance', 'other');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('physical', 'digital', 'service', 'subscription', 'bundle');--> statement-breakpoint
CREATE TYPE "public"."project_stage" AS ENUM('lead', 'erstberatung', 'angebot', 'vertrag', 'planung', 'vorbereitung', 'rohbau', 'innenausbau', 'smart_home', 'finishing', 'abnahme', 'uebergabe', 'gewaehrleistung');--> statement-breakpoint
CREATE TYPE "public"."smart_home_device_type" AS ENUM('lighting', 'climate', 'security', 'access', 'shading', 'audio', 'energy', 'sensor', 'actuator', 'controller');--> statement-breakpoint
CREATE TYPE "public"."smart_home_provider" AS ENUM('loxone', 'homematic', 'knx', 'zigbee', 'zwave', 'matter', 'custom');--> statement-breakpoint
CREATE TYPE "public"."subcontractor_status" AS ENUM('prospect', 'pending_approval', 'approved', 'active', 'suspended', 'blacklisted');--> statement-breakpoint
CREATE TYPE "public"."subsidiary" AS ENUM('west_money_bau', 'west_money_os', 'z_automation', 'dedsec_world_ai', 'enterprise_universe');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('urgent', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('feature', 'bug', 'improvement', 'documentation', 'construction', 'inspection', 'delivery', 'meeting', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'admin', 'manager', 'member', 'viewer');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(255),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255),
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"name" varchar(255) NOT NULL,
	"key_hash" varchar(255) NOT NULL,
	"key_prefix" varchar(10) NOT NULL,
	"scopes" text[],
	"last_used_at" timestamp,
	"usage_count" integer DEFAULT 0,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"logo_url" text,
	"primary_color" varchar(7) DEFAULT '#0066FF',
	"secondary_color" varchar(7),
	"subsidiary" "subsidiary" DEFAULT 'enterprise_universe',
	"settings" jsonb,
	"stripe_customer_id" varchar(255),
	"subscription_status" varchar(50),
	"subscription_plan" varchar(50),
	"subscription_period_end" timestamp,
	"contact_limit" integer DEFAULT 1000,
	"email_limit" integer DEFAULT 10000,
	"user_limit" integer DEFAULT 5,
	"project_limit" integer DEFAULT 10,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" timestamp,
	"hashed_password" varchar(255),
	"first_name" varchar(100),
	"last_name" varchar(100),
	"avatar_url" text,
	"phone" varchar(50),
	"organization_id" uuid,
	"role" "user_role" DEFAULT 'member',
	"preferences" jsonb,
	"two_factor_enabled" boolean DEFAULT false,
	"two_factor_secret" varchar(255),
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "contact_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255),
	"description" text,
	"metadata" jsonb,
	"associated_entity_type" varchar(50),
	"associated_entity_id" uuid,
	"performed_by" uuid,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_list_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"added_by" uuid
);
--> statement-breakpoint
CREATE TABLE "contact_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(20) DEFAULT 'static',
	"filter_criteria" jsonb,
	"contact_count" integer DEFAULT 0,
	"last_synced_at" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_hash" varchar(64),
	"salutation" varchar(20),
	"first_name" varchar(100),
	"last_name" varchar(100),
	"phone" varchar(50),
	"mobile" varchar(50),
	"whatsapp_number" varchar(50),
	"company" varchar(255),
	"position" varchar(100),
	"website" varchar(255),
	"linkedin_url" varchar(255),
	"street" varchar(255),
	"street_number" varchar(20),
	"city" varchar(100),
	"postal_code" varchar(20),
	"state" varchar(100),
	"country" varchar(2) DEFAULT 'DE',
	"type" "contact_type" DEFAULT 'lead',
	"subsidiary" "subsidiary",
	"source" varchar(100),
	"source_detail" varchar(255),
	"tags" text[],
	"lead_score" integer DEFAULT 0,
	"lead_score_updated_at" timestamp,
	"consent_status" "consent_status" DEFAULT 'pending',
	"consent_date" timestamp,
	"consent_source" varchar(100),
	"consent_ip" varchar(45),
	"consent_text" text,
	"double_opt_in_sent_at" timestamp,
	"double_opt_in_confirmed_at" timestamp,
	"email_status" "email_status" DEFAULT 'active',
	"bounce_type" varchar(20),
	"bounce_reason" text,
	"unsubscribed_at" timestamp,
	"unsubscribe_reason" text,
	"engagement_score" integer DEFAULT 0,
	"emails_sent" integer DEFAULT 0,
	"emails_opened" integer DEFAULT 0,
	"emails_clicked" integer DEFAULT 0,
	"last_email_sent" timestamp,
	"last_email_opened" timestamp,
	"last_email_clicked" timestamp,
	"last_engagement_at" timestamp,
	"hubspot_contact_id" varchar(50),
	"stripe_customer_id" varchar(255),
	"owner_id" uuid,
	"custom_fields" jsonb,
	"notes" text,
	"lifecycle_stage" varchar(50),
	"converted_at" timestamp,
	"converted_from_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255),
	"description" text,
	"from_stage_id" uuid,
	"to_stage_id" uuid,
	"metadata" jsonb,
	"performed_by" uuid,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"product_id" uuid,
	"name" varchar(255) NOT NULL,
	"sku" varchar(100),
	"description" text,
	"quantity" numeric(10, 2) DEFAULT '1',
	"unit_price" numeric(15, 2) NOT NULL,
	"discount" numeric(10, 2) DEFAULT '0',
	"discount_type" varchar(20) DEFAULT 'percentage',
	"total" numeric(15, 2) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '19.00',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"pipeline_id" uuid,
	"stage_id" uuid,
	"stage" "deal_stage" DEFAULT 'lead',
	"stage_changed_at" timestamp,
	"stage_duration" integer,
	"amount" numeric(15, 2),
	"currency" varchar(3) DEFAULT 'EUR',
	"probability" integer DEFAULT 0,
	"weighted_value" numeric(15, 2),
	"subsidiary" "subsidiary",
	"deal_type" varchar(50),
	"priority" varchar(20) DEFAULT 'medium',
	"source" varchar(100),
	"expected_close_date" timestamp,
	"actual_close_date" timestamp,
	"next_activity_date" timestamp,
	"last_activity_date" timestamp,
	"loss_reason" varchar(255),
	"loss_notes" text,
	"competitor_id" uuid,
	"owner_id" uuid,
	"hubspot_deal_id" varchar(50),
	"wmb_kundenkarte_id" uuid,
	"wmb_bauherren_pass_status" varchar(50),
	"wmb_project_id" uuid,
	"custom_fields" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"order" integer NOT NULL,
	"probability" integer DEFAULT 0,
	"is_closed" boolean DEFAULT false,
	"is_won" boolean DEFAULT false,
	"color" varchar(7) DEFAULT '#6B7280',
	"icon" varchar(50),
	"auto_actions" jsonb,
	"required_fields" text[],
	"validation_rules" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"subsidiary" "subsidiary",
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"template_id" uuid,
	"order" integer DEFAULT 0,
	"name" varchar(255),
	"subject" varchar(255) NOT NULL,
	"preheader" varchar(255),
	"html_content" text,
	"text_content" text,
	"delay_value" integer,
	"delay_unit" varchar(20),
	"send_conditions" jsonb,
	"skip_conditions" jsonb,
	"is_variant" boolean DEFAULT false,
	"variant_name" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"campaign_email_id" uuid,
	"contact_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"bounced_at" timestamp,
	"failed_at" timestamp,
	"error_message" text,
	"message_id" varchar(255),
	"open_count" integer DEFAULT 0,
	"click_count" integer DEFAULT 0,
	"variant" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" "campaign_type" DEFAULT 'one_time',
	"status" "campaign_status" DEFAULT 'draft',
	"audience_type" varchar(50),
	"audience_list_id" uuid,
	"audience_filters" jsonb,
	"audience_size" integer,
	"from_name" varchar(100),
	"from_email" varchar(255),
	"reply_to" varchar(255),
	"is_ab_test" boolean DEFAULT false,
	"ab_test_config" jsonb,
	"track_opens" boolean DEFAULT true,
	"track_clicks" boolean DEFAULT true,
	"settings" jsonb,
	"emails_queued" integer DEFAULT 0,
	"emails_sent" integer DEFAULT 0,
	"emails_delivered" integer DEFAULT 0,
	"emails_opened" integer DEFAULT 0,
	"unique_opens" integer DEFAULT 0,
	"emails_clicked" integer DEFAULT 0,
	"unique_clicks" integer DEFAULT 0,
	"emails_bounced" integer DEFAULT 0,
	"emails_complained" integer DEFAULT 0,
	"emails_unsubscribed" integer DEFAULT 0,
	"open_rate" integer DEFAULT 0,
	"click_rate" integer DEFAULT 0,
	"bounce_rate" integer DEFAULT 0,
	"scheduled_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"contact_id" uuid,
	"campaign_id" uuid,
	"campaign_email_id" uuid,
	"recipient_id" uuid,
	"message_id" varchar(255),
	"provider" varchar(50),
	"event_type" varchar(50) NOT NULL,
	"event_data" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"device_type" varchar(20),
	"country" varchar(2),
	"city" varchar(100),
	"link_url" text,
	"link_id" varchar(50),
	"link_text" varchar(255),
	"bounce_type" varchar(20),
	"bounce_sub_type" varchar(50),
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100),
	"category" varchar(50),
	"subsidiary" "subsidiary",
	"subject" varchar(255),
	"preheader" varchar(255),
	"html_content" text,
	"text_content" text,
	"design_json" jsonb,
	"variables" text[],
	"thumbnail_url" text,
	"is_active" boolean DEFAULT true,
	"is_system" boolean DEFAULT false,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppression_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"email" varchar(255) NOT NULL,
	"email_hash" varchar(64),
	"reason" varchar(50) NOT NULL,
	"reason_detail" text,
	"source" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unsubscribe_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"campaign_id" uuid,
	"token" varchar(100) NOT NULL,
	"used_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unsubscribe_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "project_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255),
	"description" text,
	"from_stage" "project_stage",
	"to_stage" "project_stage",
	"metadata" jsonb,
	"performed_by" uuid,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_daily_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"report_date" date NOT NULL,
	"stage" "project_stage",
	"weather" jsonb,
	"work_performed" text,
	"workers_on_site" integer,
	"work_hours" numeric(5, 2),
	"materials_delivered" jsonb,
	"equipment_used" text[],
	"issues" jsonb,
	"delay_reason" text,
	"delay_hours" numeric(5, 2),
	"safety_incidents" jsonb,
	"visitors" jsonb,
	"notes" text,
	"next_day_plan" text,
	"photo_ids" uuid[],
	"submitted_by" uuid NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(50),
	"stage" "project_stage",
	"file_name" varchar(255) NOT NULL,
	"file_url" text NOT NULL,
	"file_type" varchar(50),
	"file_size" integer,
	"thumbnail_url" text,
	"metadata" jsonb,
	"version" integer DEFAULT 1,
	"parent_document_id" uuid,
	"status" varchar(20) DEFAULT 'active',
	"uploaded_by" uuid,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"stage" "project_stage",
	"order" integer DEFAULT 0,
	"planned_date" date,
	"actual_date" date,
	"status" varchar(20) DEFAULT 'pending',
	"is_required" boolean DEFAULT true,
	"completed_by" uuid,
	"completed_at" timestamp,
	"completion_notes" text,
	"attachments" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" varchar(255),
	"description" text,
	"stage" "project_stage",
	"category" varchar(50),
	"original_url" text NOT NULL,
	"thumbnail_url" text,
	"medium_url" text,
	"taken_at" timestamp,
	"location" varchar(255),
	"coordinates" jsonb,
	"exif_data" jsonb,
	"tags" text[],
	"is_public" boolean DEFAULT false,
	"show_on_bauherren_pass" boolean DEFAULT false,
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid,
	"external_name" varchar(255),
	"external_email" varchar(255),
	"external_phone" varchar(50),
	"external_company" varchar(255),
	"role" varchar(100) NOT NULL,
	"permissions" text[],
	"start_date" date,
	"end_date" date,
	"is_active" boolean DEFAULT true,
	"added_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid,
	"deal_id" uuid,
	"name" varchar(255) NOT NULL,
	"project_number" varchar(50),
	"description" text,
	"subsidiary" "subsidiary" DEFAULT 'west_money_bau',
	"stage" "project_stage" DEFAULT 'lead',
	"stage_changed_at" timestamp,
	"stage_duration" integer,
	"property_type" varchar(50),
	"plot_size" numeric(10, 2),
	"living_space" numeric(10, 2),
	"floors" integer,
	"rooms" integer,
	"bathrooms" integer,
	"street" varchar(255),
	"street_number" varchar(20),
	"city" varchar(100),
	"postal_code" varchar(20),
	"state" varchar(100),
	"country" varchar(2) DEFAULT 'DE',
	"coordinates" jsonb,
	"total_budget" numeric(15, 2),
	"current_spent" numeric(15, 2) DEFAULT '0',
	"currency" varchar(3) DEFAULT 'EUR',
	"planned_start_date" date,
	"actual_start_date" date,
	"planned_end_date" date,
	"actual_end_date" date,
	"project_manager_id" uuid,
	"sales_rep_id" uuid,
	"smart_home_enabled" boolean DEFAULT false,
	"smart_home_config" jsonb,
	"bauherren_pass_id" varchar(100),
	"bauherren_pass_status" varchar(50),
	"bauherren_pass_issued_at" timestamp,
	"kundenkarte_id" uuid,
	"kundenkarte_status" varchar(50),
	"overall_progress" integer DEFAULT 0,
	"quality_score" integer,
	"documents_count" integer DEFAULT 0,
	"photos_count" integer DEFAULT 0,
	"custom_fields" jsonb,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"is_cancelled" boolean DEFAULT false,
	"cancelled_at" timestamp,
	"cancel_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projects_project_number_unique" UNIQUE("project_number")
);
--> statement-breakpoint
CREATE TABLE "invoice_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" text NOT NULL,
	"sku" varchar(100),
	"category" varchar(100),
	"quantity" numeric(10, 2) DEFAULT '1',
	"unit_price" numeric(15, 2) NOT NULL,
	"unit" varchar(20),
	"discount" numeric(10, 2) DEFAULT '0',
	"discount_type" varchar(20) DEFAULT 'percentage',
	"tax_rate" numeric(5, 2) DEFAULT '19.00',
	"tax_amount" numeric(15, 2),
	"subtotal" numeric(15, 2) NOT NULL,
	"total" numeric(15, 2) NOT NULL,
	"order" integer DEFAULT 0,
	"stripe_price_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid,
	"deal_id" uuid,
	"project_id" uuid,
	"invoice_number" varchar(50) NOT NULL,
	"reference_number" varchar(100),
	"subsidiary" "subsidiary",
	"type" varchar(20) DEFAULT 'invoice',
	"status" varchar(20) DEFAULT 'draft',
	"issue_date" date NOT NULL,
	"due_date" date,
	"paid_date" date,
	"subtotal" numeric(15, 2) NOT NULL,
	"tax_amount" numeric(15, 2) DEFAULT '0',
	"discount_amount" numeric(15, 2) DEFAULT '0',
	"total" numeric(15, 2) NOT NULL,
	"amount_paid" numeric(15, 2) DEFAULT '0',
	"amount_due" numeric(15, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR',
	"tax_rate" numeric(5, 2) DEFAULT '19.00',
	"tax_id" varchar(50),
	"tax_exempt" boolean DEFAULT false,
	"tax_exempt_reason" varchar(255),
	"billing_name" varchar(255),
	"billing_company" varchar(255),
	"billing_street" varchar(255),
	"billing_city" varchar(100),
	"billing_postal_code" varchar(20),
	"billing_country" varchar(2) DEFAULT 'DE',
	"payment_terms" varchar(100),
	"payment_method" varchar(50),
	"bank_details" jsonb,
	"stripe_invoice_id" varchar(255),
	"stripe_payment_intent_id" varchar(255),
	"stripe_hosted_invoice_url" text,
	"stripe_pdf_url" text,
	"notes" text,
	"internal_notes" text,
	"footer" text,
	"pdf_url" text,
	"pdf_generated_at" timestamp,
	"reminders_sent" integer DEFAULT 0,
	"last_reminder_at" timestamp,
	"next_reminder_at" timestamp,
	"created_by" uuid,
	"sent_at" timestamp,
	"sent_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"contact_id" uuid,
	"type" varchar(50) NOT NULL,
	"is_default" boolean DEFAULT false,
	"card_brand" varchar(20),
	"card_last4" varchar(4),
	"card_exp_month" integer,
	"card_exp_year" integer,
	"sepa_last4" varchar(4),
	"sepa_bank_code" varchar(20),
	"sepa_country" varchar(2),
	"stripe_payment_method_id" varchar(255),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"invoice_id" uuid,
	"contact_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR',
	"status" "payment_status" DEFAULT 'pending',
	"method" varchar(50) NOT NULL,
	"method_details" jsonb,
	"stripe_payment_intent_id" varchar(255),
	"stripe_charge_id" varchar(255),
	"stripe_refund_id" varchar(255),
	"reference" varchar(255),
	"description" text,
	"failure_code" varchar(100),
	"failure_message" text,
	"refunded_amount" numeric(15, 2),
	"refunded_at" timestamp,
	"refund_reason" text,
	"processed_at" timestamp,
	"processed_by" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid,
	"plan" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'active',
	"interval" varchar(20) DEFAULT 'month',
	"amount" numeric(15, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR',
	"trial_start_date" timestamp,
	"trial_end_date" timestamp,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"cancelled_at" timestamp,
	"cancel_reason" text,
	"stripe_subscription_id" varchar(255),
	"stripe_customer_id" varchar(255),
	"stripe_price_id" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"category" varchar(50) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"entity_name" varchar(255),
	"previous_data" jsonb,
	"new_data" jsonb,
	"changed_fields" text[],
	"description" text,
	"metadata" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"request_id" varchar(100),
	"session_id" varchar(255),
	"country" varchar(2),
	"city" varchar(100),
	"api_key_id" uuid,
	"status" varchar(20) DEFAULT 'success',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"user_id" uuid,
	"type" varchar(50) NOT NULL,
	"category" varchar(50),
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"action_url" text,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"is_dismissed" boolean DEFAULT false,
	"dismissed_at" timestamp,
	"email_sent" boolean DEFAULT false,
	"email_sent_at" timestamp,
	"push_sent" boolean DEFAULT false,
	"push_sent_at" timestamp,
	"priority" varchar(20) DEFAULT 'normal',
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"name" varchar(255) NOT NULL,
	"type" varchar(100) NOT NULL,
	"description" text,
	"cron_expression" varchar(100),
	"scheduled_for" timestamp,
	"timezone" varchar(50) DEFAULT 'Europe/Berlin',
	"payload" jsonb,
	"status" varchar(20) DEFAULT 'scheduled',
	"last_run_at" timestamp,
	"last_run_duration" integer,
	"last_run_result" jsonb,
	"next_run_at" timestamp,
	"failure_count" integer DEFAULT 0,
	"last_error" text,
	"max_retries" integer DEFAULT 3,
	"is_active" boolean DEFAULT true,
	"run_once" boolean DEFAULT false,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"event_data" jsonb,
	"request_url" text NOT NULL,
	"request_headers" jsonb,
	"request_body" jsonb,
	"status" varchar(20) DEFAULT 'pending',
	"response_status_code" integer,
	"response_headers" jsonb,
	"response_body" text,
	"error_message" text,
	"attempt_number" integer DEFAULT 1,
	"duration" integer,
	"delivered_at" timestamp,
	"next_retry_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"secret" varchar(255),
	"events" text[],
	"all_events" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"last_triggered_at" timestamp,
	"success_count" integer DEFAULT 0,
	"failure_count" integer DEFAULT 0,
	"headers" jsonb,
	"retry_on_failure" boolean DEFAULT true,
	"max_retries" integer DEFAULT 3,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"provider" varchar(50) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"event_id" varchar(255),
	"endpoint" varchar(255),
	"method" varchar(10) DEFAULT 'POST',
	"headers" jsonb,
	"payload" jsonb,
	"signature" varchar(255),
	"status" varchar(20) DEFAULT 'pending',
	"status_code" integer,
	"response_body" jsonb,
	"error_message" text,
	"processed_at" timestamp,
	"processing_duration" integer,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"next_retry_at" timestamp,
	"idempotency_key" varchar(255),
	"is_duplicate" boolean DEFAULT false,
	"received_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kundenkarte_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kundenkarte_id" uuid NOT NULL,
	"activity_type" varchar(50) NOT NULL,
	"title" varchar(255),
	"description" text,
	"previous_status" "kundenkarte_status",
	"new_status" "kundenkarte_status",
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "kundenkarte_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kundenkarte_id" uuid NOT NULL,
	"document_type" varchar(100) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"verified" boolean DEFAULT false,
	"verified_at" timestamp,
	"verified_by" uuid,
	"expires_at" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "kundenkarten" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid,
	"kunden_nummer" varchar(50) NOT NULL,
	"subsidiary" "subsidiary" DEFAULT 'west_money_bau',
	"status" "kundenkarte_status" DEFAULT 'draft' NOT NULL,
	"approved_at" timestamp,
	"approved_by" uuid,
	"anrede" varchar(20),
	"titel" varchar(50),
	"vorname" varchar(100) NOT NULL,
	"nachname" varchar(100) NOT NULL,
	"geburtsdatum" date,
	"geburtsort" varchar(100),
	"staatsangehoerigkeit" varchar(100),
	"familienstand" varchar(50),
	"email" varchar(255) NOT NULL,
	"email_secondary" varchar(255),
	"telefon" varchar(50),
	"telefon_mobil" varchar(50),
	"telefon_geschaeftlich" varchar(50),
	"strasse_hausnummer" varchar(255),
	"plz" varchar(10),
	"ort" varchar(100),
	"land" varchar(100) DEFAULT 'Deutschland',
	"beruf" varchar(100),
	"arbeitgeber" varchar(200),
	"arbeitgeber_adresse" text,
	"beschaeftigt_seit" date,
	"brutto_einkommen" numeric(12, 2),
	"netto_einkommen" numeric(12, 2),
	"sonstige_einkuenfte" numeric(12, 2),
	"selbststaendig" boolean DEFAULT false,
	"partner_vorname" varchar(100),
	"partner_nachname" varchar(100),
	"partner_geburtsdatum" date,
	"partner_beruf" varchar(100),
	"partner_einkommen" numeric(12, 2),
	"anzahl_kinder" integer DEFAULT 0,
	"kinder_details" jsonb,
	"grundstueck_vorhanden" boolean DEFAULT false,
	"grundstueck_adresse" text,
	"grundstueck_groesse" numeric(10, 2),
	"grundstueck_kaufpreis" numeric(12, 2),
	"grundstueck_kauf_datum" date,
	"grundbuch_eintrag" varchar(255),
	"bauvorhaben_typ" varchar(100),
	"haus_typ" varchar(100),
	"wohnflaeche" numeric(10, 2),
	"nutzflaeche" numeric(10, 2),
	"anzahl_zimmer" integer,
	"anzahl_baeder" integer,
	"anzahl_etagen" integer,
	"keller_geplant" boolean DEFAULT false,
	"garage_carport" varchar(100),
	"eigenkapital" numeric(12, 2),
	"gesamtbudget" numeric(12, 2),
	"finanzierungsbedarf" numeric(12, 2),
	"finanzierung_gesichert" boolean DEFAULT false,
	"finanzierungspartner" varchar(200),
	"kfw_foerderung" boolean DEFAULT false,
	"kfw_programm" varchar(100),
	"bestehende_kredite" numeric(12, 2),
	"monatliche_raten" numeric(10, 2),
	"mietbelastung" numeric(10, 2),
	"unterhaltspflichten" numeric(10, 2),
	"smart_home_interesse" boolean DEFAULT false,
	"smart_home_features" jsonb,
	"energiestandard" varchar(50),
	"heizungsart" varchar(100),
	"photovoltaik" boolean DEFAULT false,
	"photovoltaik_kwp" numeric(6, 2),
	"wallbox" boolean DEFAULT false,
	"ausweis_geprueft" boolean DEFAULT false,
	"einkommensnachweis_geprueft" boolean DEFAULT false,
	"schufa" jsonb,
	"bevorzugte_kontaktart" varchar(50),
	"beste_erreichbarkeit" varchar(100),
	"newsletter_opt_in" boolean DEFAULT false,
	"whatsapp_opt_in" boolean DEFAULT false,
	"internal_notes" text,
	"tags" jsonb,
	"lead_source" varchar(100),
	"referred_by" uuid,
	"assigned_to" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "bauherren_paesse" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid,
	"kundenkarte_id" uuid,
	"pass_nummer" varchar(50) NOT NULL,
	"subsidiary" "subsidiary" DEFAULT 'west_money_bau',
	"status" "bauherren_pass_status" DEFAULT 'nicht_erstellt' NOT NULL,
	"grundstueck_adresse" text NOT NULL,
	"grundstueck_plz" varchar(10) NOT NULL,
	"grundstueck_ort" varchar(100) NOT NULL,
	"grundstueck_flurstueck" varchar(100),
	"grundstueck_gemarkung" varchar(100),
	"grundstueck_groesse" numeric(10, 2),
	"bauvorhaben_bezeichnung" varchar(255) NOT NULL,
	"bauvorhaben_typ" varchar(100),
	"haus_typ" varchar(100),
	"wohnflaeche" numeric(10, 2),
	"brutto_grundflaeche" numeric(10, 2),
	"anzahl_wohneinheiten" integer DEFAULT 1,
	"zustaendiges_bauamt" varchar(255),
	"bauamt_ansprechpartner" varchar(100),
	"bauamt_aktenzeichen" varchar(100),
	"bauantrag_eingereicht" date,
	"baugenehmigung_erteilt" date,
	"baugenehmigung_gueltig_bis" date,
	"baubeginnanzeige" date,
	"rohbaufertigmeldung" date,
	"schlussabnahme" date,
	"checklist_baugenehmigung" boolean DEFAULT false,
	"checklist_statik" boolean DEFAULT false,
	"checklist_energieausweis" boolean DEFAULT false,
	"checklist_waermebedarfsausweis" boolean DEFAULT false,
	"checklist_baugrundgutachten" boolean DEFAULT false,
	"checklist_vermessung" boolean DEFAULT false,
	"checklist_lageplan" boolean DEFAULT false,
	"checklist_grundrisse" boolean DEFAULT false,
	"checklist_schnitte" boolean DEFAULT false,
	"checklist_ansichten" boolean DEFAULT false,
	"checklist_baubeschreibung" boolean DEFAULT false,
	"checklist_berechnungen" boolean DEFAULT false,
	"checklist_brandschutznachweis" boolean DEFAULT false,
	"checklist_schallschutznachweis" boolean DEFAULT false,
	"bauherrenhaftpflicht" boolean DEFAULT false,
	"bauherrenhaftpflicht_police" varchar(100),
	"bauleistungsversicherung" boolean DEFAULT false,
	"bauleistungsversicherung_police" varchar(100),
	"feuerrohbauversicherung" boolean DEFAULT false,
	"feuerrohbauversicherung_police" varchar(100),
	"energiestandard" varchar(50),
	"primaerenergiebedarf" numeric(8, 2),
	"endenergiebedarf" numeric(8, 2),
	"energieausweis_nummer" varchar(100),
	"smart_home_geplant" boolean DEFAULT false,
	"smart_home_provider" varchar(50),
	"smart_home_konfiguration" jsonb,
	"gesamtbaukosten" numeric(14, 2),
	"grundstueckskosten" numeric(14, 2),
	"nebenkosten" numeric(14, 2),
	"finanzierungssumme" numeric(14, 2),
	"bemerkungen" text,
	"intern_notizen" text,
	"completion_percentage" integer DEFAULT 0,
	"last_reviewed_at" timestamp,
	"last_reviewed_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "bauherren_pass_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bauherren_pass_id" uuid NOT NULL,
	"kategorie" "document_category" NOT NULL,
	"dokument_typ" varchar(100) NOT NULL,
	"titel" varchar(255) NOT NULL,
	"beschreibung" text,
	"datei_name" varchar(255) NOT NULL,
	"datei_url" text NOT NULL,
	"datei_groesse" integer,
	"mime_type" varchar(100),
	"version" varchar(20),
	"gueltig_ab" date,
	"gueltig_bis" date,
	"aktuell" boolean DEFAULT true,
	"geprueft" boolean DEFAULT false,
	"geprueft_am" timestamp,
	"geprueft_von" uuid,
	"pruefkommentar" text,
	"behoerdliches_aktenzeichen" varchar(100),
	"ausstellende_behoerde" varchar(255),
	"tags" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "bauherren_pass_genehmigungen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bauherren_pass_id" uuid NOT NULL,
	"genehmigungs_typ" varchar(100) NOT NULL,
	"bezeichnung" varchar(255) NOT NULL,
	"beschreibung" text,
	"behoerde" varchar(255) NOT NULL,
	"aktenzeichen" varchar(100),
	"ansprechpartner" varchar(100),
	"status" varchar(50) NOT NULL,
	"beantragt_am" date,
	"genehmigt_am" date,
	"gueltig_bis" date,
	"abgelehnt_am" date,
	"ablehnungsgrund" text,
	"auflagen" jsonb,
	"alle_auflagen_erfuellt" boolean DEFAULT false,
	"dokument_ids" jsonb,
	"gebuehren" numeric(10, 2),
	"gebuehren_bezahlt" boolean DEFAULT false,
	"erinnerung_aktiv" boolean DEFAULT false,
	"erinnerung_datum" date,
	"notizen" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "bauherren_pass_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bauherren_pass_id" uuid NOT NULL,
	"aktion" varchar(100) NOT NULL,
	"beschreibung" text,
	"vorher_status" "bauherren_pass_status",
	"nachher_status" "bauherren_pass_status",
	"geaenderte_felder" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "product_bundles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bundle_product_id" uuid NOT NULL,
	"item_product_id" uuid NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"optional" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"discount_percent" numeric(5, 2),
	"discount_amount" numeric(12, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"previous_price_net" numeric(12, 2),
	"new_price_net" numeric(12, 2),
	"previous_price_gross" numeric(12, 2),
	"new_price_gross" numeric(12, 2),
	"reason" varchar(255),
	"effective_from" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"sku" varchar(50) NOT NULL,
	"options" jsonb,
	"price_net" numeric(12, 2),
	"price_gross" numeric(12, 2),
	"cost_price" numeric(12, 2),
	"stock_quantity" integer,
	"low_stock_threshold" integer,
	"active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"stripe_price_id" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"sku" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255),
	"description" text,
	"short_description" varchar(500),
	"type" "product_type" NOT NULL,
	"category" "product_category" NOT NULL,
	"subsidiary" "subsidiary" DEFAULT 'west_money_bau',
	"subcategory" varchar(100),
	"tags" jsonb,
	"price_net" numeric(12, 2) NOT NULL,
	"price_gross" numeric(12, 2),
	"tax_rate" numeric(5, 2) DEFAULT '19.00',
	"currency" varchar(3) DEFAULT 'EUR',
	"unit" varchar(50),
	"min_quantity" numeric(10, 2) DEFAULT '1',
	"max_quantity" numeric(10, 2),
	"pricing_tiers" jsonb,
	"cost_price" numeric(12, 2),
	"margin_percent" numeric(5, 2),
	"is_recurring" boolean DEFAULT false,
	"recurring_interval" varchar(20),
	"recurring_interval_count" integer,
	"trial_days" integer,
	"active" boolean DEFAULT true,
	"available_from" timestamp,
	"available_until" timestamp,
	"featured" boolean DEFAULT false,
	"display_order" integer DEFAULT 0,
	"track_inventory" boolean DEFAULT false,
	"stock_quantity" integer,
	"low_stock_threshold" integer,
	"backorder_allowed" boolean DEFAULT false,
	"images" jsonb,
	"documents" jsonb,
	"construction_details" jsonb,
	"smart_home_details" jsonb,
	"meta_title" varchar(255),
	"meta_description" varchar(500),
	"keywords" jsonb,
	"stripe_product_id" varchar(100),
	"stripe_price_id" varchar(100),
	"hubspot_product_id" varchar(100),
	"external_sku" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "service_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255),
	"description" text,
	"subsidiary" "subsidiary" DEFAULT 'west_money_bau',
	"package_type" varchar(50) NOT NULL,
	"target_audience" varchar(100),
	"base_price" numeric(14, 2) NOT NULL,
	"price_per_sqm" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'EUR',
	"included_products" jsonb,
	"included_services" jsonb,
	"excluded_services" jsonb,
	"smart_home_config" jsonb,
	"construction_config" jsonb,
	"active" boolean DEFAULT true,
	"featured" boolean DEFAULT false,
	"display_order" integer DEFAULT 0,
	"image" text,
	"brochure_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"activity_type" varchar(50) NOT NULL,
	"description" text,
	"previous_value" jsonb,
	"new_value" jsonb,
	"changed_field" varchar(100),
	"related_comment_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"content" text NOT NULL,
	"content_html" text,
	"parent_comment_id" uuid,
	"mentions" jsonb,
	"attachments" jsonb,
	"reactions" jsonb,
	"edited" boolean DEFAULT false,
	"edited_at" timestamp,
	"pinned" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"subsidiary" "subsidiary" DEFAULT 'west_money_bau',
	"category" varchar(100),
	"task_template" jsonb NOT NULL,
	"subtask_templates" jsonb,
	"usage_count" integer DEFAULT 0,
	"last_used_at" timestamp,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"task_number" varchar(50),
	"title" varchar(500) NOT NULL,
	"description" text,
	"subsidiary" "subsidiary" DEFAULT 'west_money_bau',
	"type" "task_type" DEFAULT 'other' NOT NULL,
	"status" "task_status" DEFAULT 'backlog' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"project_id" uuid,
	"parent_task_id" uuid,
	"related_contact_id" uuid,
	"labels" jsonb,
	"category" varchar(100),
	"milestone" varchar(100),
	"assignee_id" uuid,
	"reporter_id" uuid,
	"watcher_ids" jsonb,
	"due_date" date,
	"start_date" date,
	"completed_at" timestamp,
	"estimated_hours" numeric(8, 2),
	"actual_hours" numeric(8, 2),
	"progress_percent" integer DEFAULT 0,
	"story_points" integer,
	"checklist" jsonb,
	"attachments" jsonb,
	"construction_details" jsonb,
	"blocked_by" jsonb,
	"blocks" jsonb,
	"blocked_reason" text,
	"external_id" varchar(100),
	"external_url" text,
	"external_system" varchar(50),
	"is_recurring" boolean DEFAULT false,
	"recurrence_rule" varchar(255),
	"recurrence_end_date" date,
	"recurrence_parent_id" uuid,
	"reminders" jsonb,
	"archived" boolean DEFAULT false,
	"archived_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"task_id" uuid,
	"project_id" uuid,
	"user_id" uuid NOT NULL,
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration" integer,
	"duration_decimal" numeric(8, 2),
	"billable" boolean DEFAULT true,
	"billed" boolean DEFAULT false,
	"billed_at" timestamp,
	"invoice_id" uuid,
	"hourly_rate" numeric(10, 2),
	"total_amount" numeric(12, 2),
	"category" varchar(100),
	"tags" jsonb,
	"running" boolean DEFAULT false,
	"approved" boolean,
	"approved_at" timestamp,
	"approved_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_subcontractors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"subcontractor_id" uuid NOT NULL,
	"gewerk" "gewerke" NOT NULL,
	"leistungsbeschreibung" text,
	"auftragsart" varchar(50),
	"auftragssumme_netto" numeric(14, 2),
	"auftragssumme_brutto" numeric(14, 2),
	"geplant_start" date,
	"geplant_ende" date,
	"tatsaechlich_start" date,
	"tatsaechlich_ende" date,
	"status" varchar(50) DEFAULT 'beauftragt',
	"fertigstellungsgrad" integer DEFAULT 0,
	"abnahme_erfolgt" boolean DEFAULT false,
	"abnahme_datum" date,
	"maengel" jsonb,
	"gezahlte_summe" numeric(14, 2) DEFAULT '0',
	"offene_summe" numeric(14, 2),
	"vertrag_url" text,
	"leistungsverzeichnis_url" text,
	"notizen" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "subcontractor_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subcontractor_id" uuid NOT NULL,
	"dokument_typ" varchar(100) NOT NULL,
	"titel" varchar(255) NOT NULL,
	"beschreibung" text,
	"datei_name" varchar(255) NOT NULL,
	"datei_url" text NOT NULL,
	"datei_groesse" integer,
	"mime_type" varchar(100),
	"gueltig_ab" date,
	"gueltig_bis" date,
	"geprueft" boolean DEFAULT false,
	"geprueft_am" timestamp,
	"geprueft_von" uuid,
	"erinnerung_vor_ablauf" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "subcontractor_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subcontractor_id" uuid NOT NULL,
	"project_id" uuid,
	"qualitaet" integer NOT NULL,
	"termintreue" integer NOT NULL,
	"kommunikation" integer NOT NULL,
	"preis_leistung" integer NOT NULL,
	"sauberkeit" integer,
	"zuverlaessigkeit" integer,
	"gesamtbewertung" numeric(3, 2) NOT NULL,
	"kommentar" text,
	"positiv" text,
	"negativ" text,
	"empfehlung" boolean,
	"intern" boolean DEFAULT true,
	"veroeffentlicht" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subcontractors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"firmenname" varchar(255) NOT NULL,
	"rechtsform" varchar(50),
	"handelsregister_nummer" varchar(100),
	"subsidiary" "subsidiary" DEFAULT 'west_money_bau',
	"status" "subcontractor_status" DEFAULT 'prospect' NOT NULL,
	"strasse" varchar(255),
	"plz" varchar(10),
	"ort" varchar(100),
	"land" varchar(100) DEFAULT 'Deutschland',
	"telefon" varchar(50),
	"telefon_mobil" varchar(50),
	"fax" varchar(50),
	"email" varchar(255) NOT NULL,
	"website" varchar(255),
	"ansprechpartner_name" varchar(100),
	"ansprechpartner_position" varchar(100),
	"ansprechpartner_telefon" varchar(50),
	"ansprechpartner_email" varchar(255),
	"hauptgewerk" "gewerke" NOT NULL,
	"nebengewerke" jsonb,
	"spezialisierungen" jsonb,
	"zertifizierungen" jsonb,
	"mitarbeiter_anzahl" integer,
	"kapazitaet" varchar(100),
	"einsatzradius" integer,
	"verfuegbarkeit" varchar(100),
	"ust_id_nr" varchar(50),
	"steuernummer" varchar(50),
	"kleinunternehmer" boolean DEFAULT false,
	"bank_name" varchar(100),
	"iban" varchar(34),
	"bic" varchar(11),
	"kontoinhaber" varchar(100),
	"betriebshaftpflicht" jsonb,
	"berufshaftpflicht" jsonb,
	"handwerkskammer" varchar(255),
	"meisterbetrieb" boolean DEFAULT false,
	"handwerksrolleneintrag" varchar(100),
	"soka_bau_mitglied" boolean DEFAULT false,
	"soka_bau_nummer" varchar(50),
	"soka_bau_unbedenklichkeit" boolean DEFAULT false,
	"soka_bau_unbedenklichkeit_bis" date,
	"bewertung_durchschnitt" numeric(3, 2),
	"bewertung_anzahl" integer DEFAULT 0,
	"projekte_gesamt" integer DEFAULT 0,
	"projekte_abgeschlossen" integer DEFAULT 0,
	"maengelquote" numeric(5, 2),
	"stundensatz" numeric(10, 2),
	"stundensatz_helfer" numeric(10, 2),
	"preisliste_url" text,
	"rabatt_vereinbarung" numeric(5, 2),
	"zahlungsziel" integer,
	"skonto" jsonb,
	"dokumente_vollstaendig" boolean DEFAULT false,
	"dokumente_pruefungsdatum" date,
	"bevorzugte_kontaktart" varchar(50),
	"newsletter_opt_in" boolean DEFAULT false,
	"intern_notizen" text,
	"tags" jsonb,
	"zustaendiger_mitarbeiter" uuid,
	"blacklist_grund" text,
	"blacklist_datum" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "smart_home_automations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"installation_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"external_id" varchar(100),
	"triggers" jsonb,
	"conditions" jsonb,
	"actions" jsonb,
	"schedule" jsonb,
	"enabled" boolean DEFAULT true,
	"last_triggered" timestamp,
	"trigger_count" integer DEFAULT 0,
	"last_error" text,
	"priority" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "smart_home_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"installation_id" uuid NOT NULL,
	"room_id" uuid,
	"name" varchar(255) NOT NULL,
	"device_type" "smart_home_device_type" NOT NULL,
	"manufacturer" varchar(100),
	"model" varchar(100),
	"serial_number" varchar(100),
	"firmware_version" varchar(50),
	"external_id" varchar(100),
	"external_type" varchar(100),
	"status" varchar(50) DEFAULT 'online',
	"last_seen" timestamp,
	"battery_level" integer,
	"current_state" jsonb,
	"capabilities" jsonb,
	"config" jsonb,
	"energy_tracking" boolean DEFAULT false,
	"total_energy_kwh" numeric(12, 3),
	"installed_at" timestamp,
	"installed_by" uuid,
	"icon" varchar(50),
	"color" varchar(20),
	"sort_order" integer DEFAULT 0,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smart_home_energy_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"installation_id" uuid NOT NULL,
	"device_id" uuid,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"period_type" varchar(20) NOT NULL,
	"consumption_kwh" numeric(12, 3),
	"production_kwh" numeric(12, 3),
	"feed_in_kwh" numeric(12, 3),
	"self_consumption_kwh" numeric(12, 3),
	"cost_eur" numeric(10, 2),
	"revenue_eur" numeric(10, 2),
	"peak_power_w" numeric(10, 2),
	"peak_timestamp" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smart_home_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"installation_id" uuid NOT NULL,
	"device_id" uuid,
	"scene_id" uuid,
	"automation_id" uuid,
	"event_type" varchar(100) NOT NULL,
	"event_data" jsonb,
	"source" varchar(50),
	"triggered_by" uuid,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smart_home_installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid,
	"kundenkarte_id" uuid,
	"installation_name" varchar(255) NOT NULL,
	"provider" "smart_home_provider" NOT NULL,
	"subsidiary" "subsidiary" DEFAULT 'west_money_bau',
	"adresse" text NOT NULL,
	"plz" varchar(10) NOT NULL,
	"ort" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'geplant',
	"loxone_config" jsonb,
	"general_config" jsonb,
	"access_credentials" jsonb,
	"total_devices" integer DEFAULT 0,
	"total_rooms" integer DEFAULT 0,
	"total_scenes" integer DEFAULT 0,
	"total_automations" integer DEFAULT 0,
	"installation_date" timestamp,
	"warranty_end_date" timestamp,
	"support_contract_active" boolean DEFAULT false,
	"support_contract_end_date" timestamp,
	"notes" text,
	"internal_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "smart_home_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"installation_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(50),
	"floor" varchar(50),
	"area" numeric(8, 2),
	"external_id" varchar(100),
	"image" text,
	"icon" varchar(50),
	"color" varchar(20),
	"device_count" integer DEFAULT 0,
	"default_temperature" numeric(4, 1),
	"comfort_temperature" numeric(4, 1),
	"eco_temperature" numeric(4, 1),
	"sort_order" integer DEFAULT 0,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smart_home_scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"installation_id" uuid NOT NULL,
	"room_id" uuid,
	"name" varchar(100) NOT NULL,
	"description" text,
	"external_id" varchar(100),
	"type" varchar(50),
	"actions" jsonb,
	"icon" varchar(50),
	"color" varchar(20),
	"image" text,
	"last_activated" timestamp,
	"activation_count" integer DEFAULT 0,
	"favorite" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid,
	"external_identifier" varchar(100) NOT NULL,
	"channel" "message_channel" NOT NULL,
	"subsidiary" "subsidiary" DEFAULT 'west_money_bau',
	"whatsapp_conversation_id" varchar(100),
	"whatsapp_phone_number_id" varchar(100),
	"whatsapp_business_account_id" varchar(100),
	"status" varchar(50) DEFAULT 'active',
	"unread_count" integer DEFAULT 0,
	"last_message_at" timestamp,
	"last_message_preview" varchar(255),
	"last_message_direction" "message_direction",
	"assigned_to" uuid,
	"team_id" uuid,
	"participant_name" varchar(255),
	"participant_avatar" text,
	"labels" jsonb,
	"priority" varchar(20),
	"customer_window_open" boolean DEFAULT false,
	"customer_window_expires_at" timestamp,
	"automation_paused" boolean DEFAULT false,
	"bot_active" boolean DEFAULT false,
	"internal_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"channel" "message_channel" NOT NULL,
	"subsidiary" "subsidiary" DEFAULT 'west_money_bau',
	"whatsapp_template_id" varchar(100),
	"whatsapp_namespace" varchar(100),
	"whatsapp_status" varchar(50),
	"category" varchar(50),
	"language" varchar(10) DEFAULT 'de',
	"header" jsonb,
	"body" text NOT NULL,
	"body_variables" jsonb,
	"footer" varchar(60),
	"buttons" jsonb,
	"usage_count" integer DEFAULT 0,
	"last_used_at" timestamp,
	"active" boolean DEFAULT true,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"external_message_id" varchar(100),
	"direction" "message_direction" NOT NULL,
	"status" "message_status_v2" DEFAULT 'pending' NOT NULL,
	"message_type" varchar(50) NOT NULL,
	"content" text,
	"content_html" text,
	"media" jsonb,
	"location" jsonb,
	"contacts_data" jsonb,
	"template_data" jsonb,
	"interactive_data" jsonb,
	"reactions" jsonb,
	"reply_to_message_id" uuid,
	"reply_to_external_id" varchar(100),
	"reply_context" jsonb,
	"sender_type" varchar(20),
	"sender_id" uuid,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"failed_at" timestamp,
	"failure_reason" text,
	"cost" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messaging_broadcasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"channel" "message_channel" NOT NULL,
	"subsidiary" "subsidiary" DEFAULT 'west_money_bau',
	"template_id" uuid,
	"recipient_list_id" uuid,
	"recipient_count" integer DEFAULT 0,
	"recipient_filter" jsonb,
	"content" text,
	"media_url" text,
	"status" varchar(50) DEFAULT 'draft',
	"scheduled_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"sent_count" integer DEFAULT 0,
	"delivered_count" integer DEFAULT 0,
	"read_count" integer DEFAULT 0,
	"failed_count" integer DEFAULT 0,
	"opt_out_count" integer DEFAULT 0,
	"estimated_cost" jsonb,
	"actual_cost" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "messaging_webhook_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"channel" "message_channel" NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"headers" jsonb,
	"processed" boolean DEFAULT false,
	"processed_at" timestamp,
	"processing_error" text,
	"retry_count" integer DEFAULT 0,
	"conversation_id" uuid,
	"message_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_phone_numbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"phone_number_id" varchar(100) NOT NULL,
	"business_account_id" varchar(100) NOT NULL,
	"display_phone_number" varchar(50) NOT NULL,
	"verified_name" varchar(255),
	"quality_rating" varchar(20),
	"status" varchar(50) DEFAULT 'active',
	"code_verification_status" varchar(50),
	"messaging_limit" varchar(50),
	"is_default" boolean DEFAULT false,
	"subsidiary" "subsidiary" DEFAULT 'west_money_bau',
	"webhook_url" text,
	"webhook_verify_token" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_activities" ADD CONSTRAINT "contact_activities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_activities" ADD CONSTRAINT "contact_activities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_activities" ADD CONSTRAINT "contact_activities_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_list_members" ADD CONSTRAINT "contact_list_members_list_id_contact_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."contact_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_list_members" ADD CONSTRAINT "contact_list_members_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_list_members" ADD CONSTRAINT "contact_list_members_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_lists" ADD CONSTRAINT "contact_lists_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_lists" ADD CONSTRAINT "contact_lists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_activities" ADD CONSTRAINT "deal_activities_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_activities" ADD CONSTRAINT "deal_activities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_activities" ADD CONSTRAINT "deal_activities_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_products" ADD CONSTRAINT "deal_products_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_emails" ADD CONSTRAINT "campaign_emails_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_emails" ADD CONSTRAINT "campaign_emails_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_email_id_campaign_emails_id_fk" FOREIGN KEY ("campaign_email_id") REFERENCES "public"."campaign_emails"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_campaign_email_id_campaign_emails_id_fk" FOREIGN KEY ("campaign_email_id") REFERENCES "public"."campaign_emails"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_recipient_id_campaign_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."campaign_recipients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppression_list" ADD CONSTRAINT "suppression_list_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unsubscribe_tokens" ADD CONSTRAINT "unsubscribe_tokens_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unsubscribe_tokens" ADD CONSTRAINT "unsubscribe_tokens_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_daily_reports" ADD CONSTRAINT "project_daily_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_daily_reports" ADD CONSTRAINT "project_daily_reports_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_daily_reports" ADD CONSTRAINT "project_daily_reports_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_photos" ADD CONSTRAINT "project_photos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_photos" ADD CONSTRAINT "project_photos_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_project_manager_id_users_id_fk" FOREIGN KEY ("project_manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_sales_rep_id_users_id_fk" FOREIGN KEY ("sales_rep_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_webhook_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kundenkarte_activities" ADD CONSTRAINT "kundenkarte_activities_kundenkarte_id_kundenkarten_id_fk" FOREIGN KEY ("kundenkarte_id") REFERENCES "public"."kundenkarten"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kundenkarte_activities" ADD CONSTRAINT "kundenkarte_activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kundenkarte_documents" ADD CONSTRAINT "kundenkarte_documents_kundenkarte_id_kundenkarten_id_fk" FOREIGN KEY ("kundenkarte_id") REFERENCES "public"."kundenkarten"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kundenkarte_documents" ADD CONSTRAINT "kundenkarte_documents_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kundenkarte_documents" ADD CONSTRAINT "kundenkarte_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kundenkarten" ADD CONSTRAINT "kundenkarten_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kundenkarten" ADD CONSTRAINT "kundenkarten_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kundenkarten" ADD CONSTRAINT "kundenkarten_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kundenkarten" ADD CONSTRAINT "kundenkarten_referred_by_contacts_id_fk" FOREIGN KEY ("referred_by") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kundenkarten" ADD CONSTRAINT "kundenkarten_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kundenkarten" ADD CONSTRAINT "kundenkarten_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kundenkarten" ADD CONSTRAINT "kundenkarten_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bauherren_paesse" ADD CONSTRAINT "bauherren_paesse_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bauherren_paesse" ADD CONSTRAINT "bauherren_paesse_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bauherren_paesse" ADD CONSTRAINT "bauherren_paesse_kundenkarte_id_kundenkarten_id_fk" FOREIGN KEY ("kundenkarte_id") REFERENCES "public"."kundenkarten"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bauherren_paesse" ADD CONSTRAINT "bauherren_paesse_last_reviewed_by_users_id_fk" FOREIGN KEY ("last_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bauherren_paesse" ADD CONSTRAINT "bauherren_paesse_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bauherren_paesse" ADD CONSTRAINT "bauherren_paesse_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bauherren_pass_documents" ADD CONSTRAINT "bauherren_pass_documents_bauherren_pass_id_bauherren_paesse_id_fk" FOREIGN KEY ("bauherren_pass_id") REFERENCES "public"."bauherren_paesse"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bauherren_pass_documents" ADD CONSTRAINT "bauherren_pass_documents_geprueft_von_users_id_fk" FOREIGN KEY ("geprueft_von") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bauherren_pass_documents" ADD CONSTRAINT "bauherren_pass_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bauherren_pass_genehmigungen" ADD CONSTRAINT "bauherren_pass_genehmigungen_bauherren_pass_id_bauherren_paesse_id_fk" FOREIGN KEY ("bauherren_pass_id") REFERENCES "public"."bauherren_paesse"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bauherren_pass_genehmigungen" ADD CONSTRAINT "bauherren_pass_genehmigungen_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bauherren_pass_history" ADD CONSTRAINT "bauherren_pass_history_bauherren_pass_id_bauherren_paesse_id_fk" FOREIGN KEY ("bauherren_pass_id") REFERENCES "public"."bauherren_paesse"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bauherren_pass_history" ADD CONSTRAINT "bauherren_pass_history_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundles" ADD CONSTRAINT "product_bundles_bundle_product_id_products_id_fk" FOREIGN KEY ("bundle_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundles" ADD CONSTRAINT "product_bundles_item_product_id_products_id_fk" FOREIGN KEY ("item_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price_history" ADD CONSTRAINT "product_price_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price_history" ADD CONSTRAINT "product_price_history_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_packages" ADD CONSTRAINT "service_packages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_parent_comment_id_task_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."task_comments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_related_contact_id_contacts_id_fk" FOREIGN KEY ("related_contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_subcontractors" ADD CONSTRAINT "project_subcontractors_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_subcontractors" ADD CONSTRAINT "project_subcontractors_subcontractor_id_subcontractors_id_fk" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."subcontractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_subcontractors" ADD CONSTRAINT "project_subcontractors_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractor_documents" ADD CONSTRAINT "subcontractor_documents_subcontractor_id_subcontractors_id_fk" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."subcontractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractor_documents" ADD CONSTRAINT "subcontractor_documents_geprueft_von_users_id_fk" FOREIGN KEY ("geprueft_von") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractor_documents" ADD CONSTRAINT "subcontractor_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractor_ratings" ADD CONSTRAINT "subcontractor_ratings_subcontractor_id_subcontractors_id_fk" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."subcontractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractor_ratings" ADD CONSTRAINT "subcontractor_ratings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractor_ratings" ADD CONSTRAINT "subcontractor_ratings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD CONSTRAINT "subcontractors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD CONSTRAINT "subcontractors_zustaendiger_mitarbeiter_users_id_fk" FOREIGN KEY ("zustaendiger_mitarbeiter") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD CONSTRAINT "subcontractors_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD CONSTRAINT "subcontractors_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_home_automations" ADD CONSTRAINT "smart_home_automations_installation_id_smart_home_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."smart_home_installations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_home_automations" ADD CONSTRAINT "smart_home_automations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_home_devices" ADD CONSTRAINT "smart_home_devices_installation_id_smart_home_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."smart_home_installations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_home_devices" ADD CONSTRAINT "smart_home_devices_room_id_smart_home_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."smart_home_rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_home_devices" ADD CONSTRAINT "smart_home_devices_installed_by_users_id_fk" FOREIGN KEY ("installed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_home_energy_data" ADD CONSTRAINT "smart_home_energy_data_installation_id_smart_home_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."smart_home_installations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_home_energy_data" ADD CONSTRAINT "smart_home_energy_data_device_id_smart_home_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."smart_home_devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_home_events" ADD CONSTRAINT "smart_home_events_installation_id_smart_home_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."smart_home_installations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_home_events" ADD CONSTRAINT "smart_home_events_device_id_smart_home_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."smart_home_devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_home_events" ADD CONSTRAINT "smart_home_events_scene_id_smart_home_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."smart_home_scenes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_home_events" ADD CONSTRAINT "smart_home_events_automation_id_smart_home_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."smart_home_automations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_home_events" ADD CONSTRAINT "smart_home_events_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_home_installations" ADD CONSTRAINT "smart_home_installations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_home_installations" ADD CONSTRAINT "smart_home_installations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_home_installations" ADD CONSTRAINT "smart_home_installations_kundenkarte_id_kundenkarten_id_fk" FOREIGN KEY ("kundenkarte_id") REFERENCES "public"."kundenkarten"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_home_installations" ADD CONSTRAINT "smart_home_installations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_home_rooms" ADD CONSTRAINT "smart_home_rooms_installation_id_smart_home_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."smart_home_installations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_home_scenes" ADD CONSTRAINT "smart_home_scenes_installation_id_smart_home_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."smart_home_installations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_home_scenes" ADD CONSTRAINT "smart_home_scenes_room_id_smart_home_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."smart_home_rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_broadcasts" ADD CONSTRAINT "messaging_broadcasts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_broadcasts" ADD CONSTRAINT "messaging_broadcasts_template_id_message_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."message_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_broadcasts" ADD CONSTRAINT "messaging_broadcasts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_webhook_logs" ADD CONSTRAINT "messaging_webhook_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_phone_numbers" ADD CONSTRAINT "whatsapp_phone_numbers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_contact_idx" ON "contact_activities" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "activities_type_idx" ON "contact_activities" USING btree ("type");--> statement-breakpoint
CREATE INDEX "activities_occurred_at_idx" ON "contact_activities" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "list_contact_idx" ON "contact_list_members" USING btree ("list_id","contact_id");--> statement-breakpoint
CREATE INDEX "contacts_email_idx" ON "contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "contacts_email_hash_idx" ON "contacts" USING btree ("email_hash");--> statement-breakpoint
CREATE INDEX "contacts_org_idx" ON "contacts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "contacts_owner_idx" ON "contacts" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "contacts_type_idx" ON "contacts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "contacts_subsidiary_idx" ON "contacts" USING btree ("subsidiary");--> statement-breakpoint
CREATE INDEX "contacts_hubspot_idx" ON "contacts" USING btree ("hubspot_contact_id");--> statement-breakpoint
CREATE INDEX "contacts_consent_idx" ON "contacts" USING btree ("consent_status");--> statement-breakpoint
CREATE INDEX "contacts_email_status_idx" ON "contacts" USING btree ("email_status");--> statement-breakpoint
CREATE INDEX "contacts_created_at_idx" ON "contacts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "deal_activities_deal_idx" ON "deal_activities" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "deal_activities_type_idx" ON "deal_activities" USING btree ("type");--> statement-breakpoint
CREATE INDEX "deals_org_idx" ON "deals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "deals_contact_idx" ON "deals" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "deals_pipeline_idx" ON "deals" USING btree ("pipeline_id");--> statement-breakpoint
CREATE INDEX "deals_stage_idx" ON "deals" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "deals_owner_idx" ON "deals" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "deals_close_date_idx" ON "deals" USING btree ("expected_close_date");--> statement-breakpoint
CREATE INDEX "deals_hubspot_idx" ON "deals" USING btree ("hubspot_deal_id");--> statement-breakpoint
CREATE INDEX "deals_created_at_idx" ON "deals" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "stages_pipeline_order_idx" ON "pipeline_stages" USING btree ("pipeline_id","order");--> statement-breakpoint
CREATE INDEX "recipients_campaign_idx" ON "campaign_recipients" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "recipients_contact_idx" ON "campaign_recipients" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "recipients_status_idx" ON "campaign_recipients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "recipients_message_id_idx" ON "campaign_recipients" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "campaigns_org_idx" ON "campaigns" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaigns_type_idx" ON "campaigns" USING btree ("type");--> statement-breakpoint
CREATE INDEX "campaigns_scheduled_idx" ON "campaigns" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "events_message_id_idx" ON "email_events" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "events_contact_idx" ON "email_events" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "events_campaign_idx" ON "email_events" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "events_type_idx" ON "email_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "events_occurred_at_idx" ON "email_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "suppression_email_idx" ON "suppression_list" USING btree ("email");--> statement-breakpoint
CREATE INDEX "suppression_email_hash_idx" ON "suppression_list" USING btree ("email_hash");--> statement-breakpoint
CREATE INDEX "suppression_org_idx" ON "suppression_list" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "project_activities_project_idx" ON "project_activities" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_activities_type_idx" ON "project_activities" USING btree ("type");--> statement-breakpoint
CREATE INDEX "project_activities_occurred_at_idx" ON "project_activities" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "daily_reports_project_idx" ON "project_daily_reports" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "daily_reports_date_idx" ON "project_daily_reports" USING btree ("report_date");--> statement-breakpoint
CREATE INDEX "daily_reports_project_date_idx" ON "project_daily_reports" USING btree ("project_id","report_date");--> statement-breakpoint
CREATE INDEX "documents_project_idx" ON "project_documents" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "documents_category_idx" ON "project_documents" USING btree ("category");--> statement-breakpoint
CREATE INDEX "documents_stage_idx" ON "project_documents" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "milestones_project_idx" ON "project_milestones" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "milestones_stage_idx" ON "project_milestones" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "photos_project_idx" ON "project_photos" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "photos_stage_idx" ON "project_photos" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "photos_taken_at_idx" ON "project_photos" USING btree ("taken_at");--> statement-breakpoint
CREATE INDEX "team_members_project_idx" ON "project_team_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "team_members_user_idx" ON "project_team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "projects_org_idx" ON "projects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "projects_contact_idx" ON "projects" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "projects_deal_idx" ON "projects" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "projects_stage_idx" ON "projects" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "projects_pm_idx" ON "projects" USING btree ("project_manager_id");--> statement-breakpoint
CREATE INDEX "projects_number_idx" ON "projects" USING btree ("project_number");--> statement-breakpoint
CREATE INDEX "projects_created_at_idx" ON "projects" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "invoices_org_idx" ON "invoices" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invoices_contact_idx" ON "invoices" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "invoices_deal_idx" ON "invoices" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "invoices_project_idx" ON "invoices" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_number_idx" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "invoices_due_date_idx" ON "invoices" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "invoices_stripe_idx" ON "invoices" USING btree ("stripe_invoice_id");--> statement-breakpoint
CREATE INDEX "payments_org_idx" ON "payments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "payments_invoice_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payments_contact_idx" ON "payments" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_stripe_payment_idx" ON "payments" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "payments_stripe_charge_idx" ON "payments" USING btree ("stripe_charge_id");--> statement-breakpoint
CREATE INDEX "payments_created_at_idx" ON "payments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "subscriptions_org_idx" ON "subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscriptions_contact_idx" ON "subscriptions" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_stripe_idx" ON "subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "audit_org_idx" ON "audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_category_idx" ON "audit_logs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_org_created_at_idx" ON "audit_logs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_org_idx" ON "notifications" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "notifications_type_idx" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notifications_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "jobs_org_idx" ON "scheduled_jobs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "jobs_type_idx" ON "scheduled_jobs" USING btree ("type");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "scheduled_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "jobs_next_run_idx" ON "scheduled_jobs" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX "deliveries_endpoint_idx" ON "webhook_deliveries" USING btree ("endpoint_id");--> statement-breakpoint
CREATE INDEX "deliveries_org_idx" ON "webhook_deliveries" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "deliveries_status_idx" ON "webhook_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "deliveries_created_at_idx" ON "webhook_deliveries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webhook_org_idx" ON "webhook_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "webhook_provider_idx" ON "webhook_logs" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "webhook_event_type_idx" ON "webhook_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "webhook_status_idx" ON "webhook_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webhook_event_id_idx" ON "webhook_logs" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "webhook_received_at_idx" ON "webhook_logs" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "webhook_idempotency_idx" ON "webhook_logs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "kundenkarte_activities_kundenkarte_idx" ON "kundenkarte_activities" USING btree ("kundenkarte_id");--> statement-breakpoint
CREATE INDEX "kundenkarte_activities_type_idx" ON "kundenkarte_activities" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "kundenkarte_activities_created_at_idx" ON "kundenkarte_activities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "kundenkarte_docs_kundenkarte_idx" ON "kundenkarte_documents" USING btree ("kundenkarte_id");--> statement-breakpoint
CREATE INDEX "kundenkarte_docs_type_idx" ON "kundenkarte_documents" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "kundenkarten_org_idx" ON "kundenkarten" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "kundenkarten_kunden_nummer_idx" ON "kundenkarten" USING btree ("kunden_nummer");--> statement-breakpoint
CREATE INDEX "kundenkarten_contact_idx" ON "kundenkarten" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "kundenkarten_status_idx" ON "kundenkarten" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kundenkarten_assigned_to_idx" ON "kundenkarten" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "kundenkarten_email_idx" ON "kundenkarten" USING btree ("email");--> statement-breakpoint
CREATE INDEX "bauherren_paesse_org_idx" ON "bauherren_paesse" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "bauherren_paesse_project_idx" ON "bauherren_paesse" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "bauherren_paesse_pass_nummer_idx" ON "bauherren_paesse" USING btree ("pass_nummer");--> statement-breakpoint
CREATE INDEX "bauherren_paesse_status_idx" ON "bauherren_paesse" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bauherren_paesse_kundenkarte_idx" ON "bauherren_paesse" USING btree ("kundenkarte_id");--> statement-breakpoint
CREATE INDEX "bp_docs_bauherren_pass_idx" ON "bauherren_pass_documents" USING btree ("bauherren_pass_id");--> statement-breakpoint
CREATE INDEX "bp_docs_kategorie_idx" ON "bauherren_pass_documents" USING btree ("kategorie");--> statement-breakpoint
CREATE INDEX "bp_docs_dokument_typ_idx" ON "bauherren_pass_documents" USING btree ("dokument_typ");--> statement-breakpoint
CREATE INDEX "bp_docs_aktuell_idx" ON "bauherren_pass_documents" USING btree ("aktuell");--> statement-breakpoint
CREATE INDEX "bp_genehmigungen_bp_idx" ON "bauherren_pass_genehmigungen" USING btree ("bauherren_pass_id");--> statement-breakpoint
CREATE INDEX "bp_genehmigungen_typ_idx" ON "bauherren_pass_genehmigungen" USING btree ("genehmigungs_typ");--> statement-breakpoint
CREATE INDEX "bp_genehmigungen_status_idx" ON "bauherren_pass_genehmigungen" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bp_history_bp_idx" ON "bauherren_pass_history" USING btree ("bauherren_pass_id");--> statement-breakpoint
CREATE INDEX "bp_history_created_at_idx" ON "bauherren_pass_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "product_bundles_bundle_idx" ON "product_bundles" USING btree ("bundle_product_id");--> statement-breakpoint
CREATE INDEX "product_bundles_item_idx" ON "product_bundles" USING btree ("item_product_id");--> statement-breakpoint
CREATE INDEX "product_price_history_product_idx" ON "product_price_history" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_price_history_effective_idx" ON "product_price_history" USING btree ("effective_from");--> statement-breakpoint
CREATE INDEX "product_variants_product_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_variants_sku_idx" ON "product_variants" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "products_org_idx" ON "products" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "products_sku_idx" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "products_slug_idx" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "products_subsidiary_idx" ON "products" USING btree ("subsidiary");--> statement-breakpoint
CREATE INDEX "products_active_idx" ON "products" USING btree ("active");--> statement-breakpoint
CREATE INDEX "products_stripe_product_idx" ON "products" USING btree ("stripe_product_id");--> statement-breakpoint
CREATE INDEX "service_packages_org_idx" ON "service_packages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "service_packages_subsidiary_idx" ON "service_packages" USING btree ("subsidiary");--> statement-breakpoint
CREATE INDEX "service_packages_type_idx" ON "service_packages" USING btree ("package_type");--> statement-breakpoint
CREATE INDEX "task_activities_task_idx" ON "task_activities" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_activities_type_idx" ON "task_activities" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "task_activities_created_at_idx" ON "task_activities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "task_comments_task_idx" ON "task_comments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_comments_parent_idx" ON "task_comments" USING btree ("parent_comment_id");--> statement-breakpoint
CREATE INDEX "task_comments_created_at_idx" ON "task_comments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "task_templates_org_idx" ON "task_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "task_templates_subsidiary_idx" ON "task_templates" USING btree ("subsidiary");--> statement-breakpoint
CREATE INDEX "task_templates_category_idx" ON "task_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "tasks_org_idx" ON "tasks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tasks_project_idx" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tasks_assignee_idx" ON "tasks" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_priority_idx" ON "tasks" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "tasks_due_date_idx" ON "tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "tasks_parent_idx" ON "tasks" USING btree ("parent_task_id");--> statement-breakpoint
CREATE INDEX "tasks_archived_idx" ON "tasks" USING btree ("archived");--> statement-breakpoint
CREATE INDEX "tasks_task_number_idx" ON "tasks" USING btree ("task_number");--> statement-breakpoint
CREATE INDEX "time_entries_org_idx" ON "time_entries" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "time_entries_task_idx" ON "time_entries" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "time_entries_project_idx" ON "time_entries" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "time_entries_user_idx" ON "time_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "time_entries_start_time_idx" ON "time_entries" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "time_entries_billable_idx" ON "time_entries" USING btree ("billable");--> statement-breakpoint
CREATE INDEX "project_subs_project_idx" ON "project_subcontractors" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_subs_subcontractor_idx" ON "project_subcontractors" USING btree ("subcontractor_id");--> statement-breakpoint
CREATE INDEX "project_subs_gewerk_idx" ON "project_subcontractors" USING btree ("gewerk");--> statement-breakpoint
CREATE INDEX "project_subs_status_idx" ON "project_subcontractors" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sub_docs_subcontractor_idx" ON "subcontractor_documents" USING btree ("subcontractor_id");--> statement-breakpoint
CREATE INDEX "sub_docs_typ_idx" ON "subcontractor_documents" USING btree ("dokument_typ");--> statement-breakpoint
CREATE INDEX "sub_docs_gueltig_bis_idx" ON "subcontractor_documents" USING btree ("gueltig_bis");--> statement-breakpoint
CREATE INDEX "sub_ratings_subcontractor_idx" ON "subcontractor_ratings" USING btree ("subcontractor_id");--> statement-breakpoint
CREATE INDEX "sub_ratings_project_idx" ON "subcontractor_ratings" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "subcontractors_org_idx" ON "subcontractors" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subcontractors_status_idx" ON "subcontractors" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subcontractors_hauptgewerk_idx" ON "subcontractors" USING btree ("hauptgewerk");--> statement-breakpoint
CREATE INDEX "subcontractors_email_idx" ON "subcontractors" USING btree ("email");--> statement-breakpoint
CREATE INDEX "subcontractors_bewertung_idx" ON "subcontractors" USING btree ("bewertung_durchschnitt");--> statement-breakpoint
CREATE INDEX "sh_automations_installation_idx" ON "smart_home_automations" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "sh_automations_enabled_idx" ON "smart_home_automations" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "sh_devices_installation_idx" ON "smart_home_devices" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "sh_devices_room_idx" ON "smart_home_devices" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "sh_devices_type_idx" ON "smart_home_devices" USING btree ("device_type");--> statement-breakpoint
CREATE INDEX "sh_devices_status_idx" ON "smart_home_devices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sh_devices_external_id_idx" ON "smart_home_devices" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "sh_energy_installation_idx" ON "smart_home_energy_data" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "sh_energy_device_idx" ON "smart_home_energy_data" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "sh_energy_period_idx" ON "smart_home_energy_data" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "sh_energy_period_type_idx" ON "smart_home_energy_data" USING btree ("period_type");--> statement-breakpoint
CREATE INDEX "sh_events_installation_idx" ON "smart_home_events" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "sh_events_device_idx" ON "smart_home_events" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "sh_events_type_idx" ON "smart_home_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "sh_events_timestamp_idx" ON "smart_home_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "sh_installations_org_idx" ON "smart_home_installations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sh_installations_project_idx" ON "smart_home_installations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "sh_installations_provider_idx" ON "smart_home_installations" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "sh_installations_status_idx" ON "smart_home_installations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sh_rooms_installation_idx" ON "smart_home_rooms" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "sh_rooms_type_idx" ON "smart_home_rooms" USING btree ("type");--> statement-breakpoint
CREATE INDEX "sh_scenes_installation_idx" ON "smart_home_scenes" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "sh_scenes_room_idx" ON "smart_home_scenes" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "conversations_org_idx" ON "conversations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "conversations_contact_idx" ON "conversations" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "conversations_channel_idx" ON "conversations" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "conversations_external_id_idx" ON "conversations" USING btree ("external_identifier");--> statement-breakpoint
CREATE INDEX "conversations_assigned_to_idx" ON "conversations" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "conversations_last_message_idx" ON "conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "conversations_status_idx" ON "conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "msg_templates_org_idx" ON "message_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "msg_templates_name_idx" ON "message_templates" USING btree ("name");--> statement-breakpoint
CREATE INDEX "msg_templates_channel_idx" ON "message_templates" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "msg_templates_category_idx" ON "message_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_external_id_idx" ON "messages" USING btree ("external_message_id");--> statement-breakpoint
CREATE INDEX "messages_direction_idx" ON "messages" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "messages_status_idx" ON "messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "messages_sender_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "msg_broadcasts_org_idx" ON "messaging_broadcasts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "msg_broadcasts_channel_idx" ON "messaging_broadcasts" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "msg_broadcasts_status_idx" ON "messaging_broadcasts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "msg_broadcasts_scheduled_at_idx" ON "messaging_broadcasts" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "msg_webhook_logs_org_idx" ON "messaging_webhook_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "msg_webhook_logs_channel_idx" ON "messaging_webhook_logs" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "msg_webhook_logs_event_type_idx" ON "messaging_webhook_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "msg_webhook_logs_processed_idx" ON "messaging_webhook_logs" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "msg_webhook_logs_created_at_idx" ON "messaging_webhook_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "wa_phones_org_idx" ON "whatsapp_phone_numbers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "wa_phones_phone_id_idx" ON "whatsapp_phone_numbers" USING btree ("phone_number_id");