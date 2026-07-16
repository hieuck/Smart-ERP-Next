-- Add foreign key from purchase_order_items.productId to products.id
DO $$ BEGIN
  ALTER TABLE "purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_product_id_products_id_fk"
    FOREIGN KEY ("product_id")
    REFERENCES "public"."products"("id")
    ON DELETE restrict
    ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add index for the foreign key column
CREATE INDEX IF NOT EXISTS "purchase_order_items_product_id_idx" ON "purchase_order_items" USING btree ("product_id");