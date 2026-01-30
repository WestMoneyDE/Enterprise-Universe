ALTER TYPE "public"."money_machine_stage" ADD VALUE 'planning_started' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."money_machine_stage" ADD VALUE 'subcontractors_assigned' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."money_machine_stage" ADD VALUE 'materials_ordered' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."money_machine_stage" ADD VALUE 'permits_obtained' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."money_machine_stage" ADD VALUE 'construction_started' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."money_machine_stage" ADD VALUE 'foundation_complete' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."money_machine_stage" ADD VALUE 'shell_complete' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."money_machine_stage" ADD VALUE 'systems_installed' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."money_machine_stage" ADD VALUE 'interior_complete' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."money_machine_stage" ADD VALUE 'requirements_analysis' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."money_machine_stage" ADD VALUE 'architecture_design' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."money_machine_stage" ADD VALUE 'development_started' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."money_machine_stage" ADD VALUE 'development_sprint' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."money_machine_stage" ADD VALUE 'feature_complete' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."money_machine_stage" ADD VALUE 'testing_qa' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."money_machine_stage" ADD VALUE 'staging_deployed' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."money_machine_stage" ADD VALUE 'user_acceptance' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."money_machine_stage" ADD VALUE 'production_deployed' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."money_machine_stage" ADD VALUE 'app_delivered' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."money_machine_stage" ADD VALUE 'quality_inspection' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."money_machine_stage" ADD VALUE 'final_handover' BEFORE 'completed';--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "planning_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "subcontractors_assigned_at" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "materials_ordered_at" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "permits_obtained_at" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "construction_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "foundation_complete_at" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "shell_complete_at" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "systems_installed_at" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "interior_complete_at" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "requirements_analysis_at" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "architecture_design_at" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "development_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "feature_complete_at" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "testing_qa_at" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "staging_deployed_at" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "user_acceptance_at" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "production_deployed_at" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "app_delivered_at" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "quality_inspection_at" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "final_handover_at" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "project_type" varchar(100);--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "project_name" varchar(255);--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "subcontractors" jsonb;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "material_orders" jsonb;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "permits" jsonb;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "construction_milestones" jsonb;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "smart_systems" jsonb;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "overall_progress" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "current_phase" varchar(50);--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "estimated_completion_date" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "actual_completion_date" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "quality_checks" jsonb;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "tech_stack" jsonb;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "software_requirements" jsonb;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "sprints" jsonb;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "current_sprint_id" varchar(50);--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "features" jsonb;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "bugs" jsonb;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "deployments" jsonb;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "repository_url" varchar(500);--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "repository_branch" varchar(100);--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "last_commit_hash" varchar(50);--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "last_commit_at" timestamp;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "test_coverage" integer;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "test_results" jsonb;--> statement-breakpoint
ALTER TABLE "money_machine_workflows" ADD COLUMN "documentation_urls" jsonb;