-- Add foreign keys for accounting tables, missing tenantId FKs and indexes

-- chart_of_accounts
DO $$ BEGIN
  ALTER TABLE "chart_of_accounts"
    ADD CONSTRAINT "chart_of_accounts_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id")
    REFERENCES "public"."tenants"("id")
    ON DELETE cascade
    ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
CREATE INDEX IF NOT EXISTS "chart_of_accounts_tenant_idx" ON "chart_of_accounts" USING btree ("tenant_id");

-- journal_entries
DO $$ BEGIN
  ALTER TABLE "journal_entries"
    ADD CONSTRAINT "journal_entries_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id")
    REFERENCES "public"."tenants"("id")
    ON DELETE cascade
    ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
CREATE INDEX IF NOT EXISTS "journal_entries_tenant_idx" ON "journal_entries" USING btree ("tenant_id");

-- journal_entry_lines
DO $$ BEGIN
  ALTER TABLE "journal_entry_lines"
    ADD CONSTRAINT "journal_entry_lines_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id")
    REFERENCES "public"."tenants"("id")
    ON DELETE cascade
    ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
CREATE INDEX IF NOT EXISTS "jel_tenant_idx" ON "journal_entry_lines" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "jel_entry_idx" ON "journal_entry_lines" USING btree ("journal_entry_id");
CREATE INDEX IF NOT EXISTS "jel_account_idx" ON "journal_entry_lines" USING btree ("account_id");
