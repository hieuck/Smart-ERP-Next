DROP INDEX "tms_veh_plate_idx";--> statement-breakpoint
CREATE INDEX "tms_veh_plate_idx" ON "tms_vehicles" USING btree ("tenant_id","plate_number");--> statement-breakpoint
ALTER TABLE "tms_vehicles" ADD CONSTRAINT "tms_vehicles_tenant_plate_unique" UNIQUE("tenant_id","plate_number");