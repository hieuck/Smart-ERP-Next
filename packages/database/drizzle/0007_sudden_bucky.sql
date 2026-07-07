CREATE UNIQUE INDEX "customers_email_tenant_unique" ON "customers" USING btree ("tenant_id","email") WHERE "customers"."email" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "customers_external_id_tenant_unique" ON "customers" USING btree ("tenant_id","external_id","external_platform") WHERE "customers"."external_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_code_tenant_unique" UNIQUE("tenant_id","code");
