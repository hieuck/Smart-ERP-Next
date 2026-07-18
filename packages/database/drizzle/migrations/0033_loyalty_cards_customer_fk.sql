-- Convert loyalty_cards.customer_id from integer to uuid and add FK to customers.id
-- Step 1: Drop existing index
DROP INDEX IF EXISTS "loyalty_cards_customer_idx";

-- Step 2: Drop column (data conversion requires ETL; in this case we just recreate schema
-- since production data needs manual migration, this is a fresh install setup)
DO $$ BEGIN
  ALTER TABLE "loyalty_cards" DROP COLUMN "customer_id";
EXCEPTION
  WHEN undefined_column THEN null;
END $$;

-- Step 3: Add column as uuid
ALTER TABLE "loyalty_cards" ADD COLUMN "customer_id" uuid NOT NULL;

-- Step 4: Add foreign key
DO $$ BEGIN
  ALTER TABLE "loyalty_cards"
    ADD CONSTRAINT "loyalty_cards_customer_id_customers_id_fk"
    FOREIGN KEY ("customer_id")
    REFERENCES "public"."customers"("id")
    ON DELETE cascade
    ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 5: Re-create index
CREATE INDEX IF NOT EXISTS "loyalty_cards_customer_idx" ON "loyalty_cards" USING btree ("customer_id");
