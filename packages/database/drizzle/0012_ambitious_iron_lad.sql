DROP INDEX "po_code_idx";--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "po_tenant_code_unique" UNIQUE("tenant_id","code");