ALTER TABLE "tenants" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "tax_code" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "industry" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "onboarding_status" text DEFAULT 'pending' NOT NULL;