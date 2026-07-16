-- Add barcode column to products table for barcode scanning support
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "barcode" text;

-- Index for barcode lookups (tenant-scoped)
CREATE INDEX IF NOT EXISTS "products_barcode_idx" ON "products" USING btree ("tenant_id", "barcode");
