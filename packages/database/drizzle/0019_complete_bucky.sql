CREATE INDEX "mrp_forecasts_tenant_idx" ON "mrp_forecasts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "mrp_forecasts_product_idx" ON "mrp_forecasts" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "mrp_forecasts_tenant_product_date_idx" ON "mrp_forecasts" USING btree ("tenant_id","product_id","forecast_date");--> statement-breakpoint
ALTER TABLE "mrp_forecasts" ADD CONSTRAINT "mrp_forecasts_tenant_product_date_unique" UNIQUE("tenant_id","product_id","forecast_date");