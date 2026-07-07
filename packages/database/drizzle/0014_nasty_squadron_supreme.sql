DROP INDEX "payments_code_idx";--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_code_unique" UNIQUE("tenant_id","code");