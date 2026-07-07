DROP INDEX "orders_code_idx";--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_code_unique" UNIQUE("tenant_id","code");