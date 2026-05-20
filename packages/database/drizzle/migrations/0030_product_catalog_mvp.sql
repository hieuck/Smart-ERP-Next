ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "image_url" text;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "category_id" uuid;

DO $$ BEGIN
  ALTER TABLE "products"
    ADD CONSTRAINT "products_category_id_product_categories_id_fk"
    FOREIGN KEY ("category_id")
    REFERENCES "public"."product_categories"("id")
    ON DELETE set null
    ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "products_category_id_idx" ON "products" USING btree ("category_id");
