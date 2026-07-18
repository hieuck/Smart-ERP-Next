-- Add foreign key from users.tenant_id to tenants.id
DO $$ BEGIN
  ALTER TABLE "users"
    ADD CONSTRAINT "users_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id")
    REFERENCES "public"."tenants"("id")
    ON DELETE cascade
    ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
