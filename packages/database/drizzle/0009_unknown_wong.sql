DROP INDEX "employees_code_idx";--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_code_unique" UNIQUE("tenant_id","code");