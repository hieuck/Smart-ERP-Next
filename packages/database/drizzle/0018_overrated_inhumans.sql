ALTER TABLE "lead_scoring_rules" ADD CONSTRAINT "mkt_score_tenant_event_unique" UNIQUE("tenant_id","event");--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "mkt_camp_tenant_name_unique" UNIQUE("tenant_id","name");--> statement-breakpoint
ALTER TABLE "marketing_segments" ADD CONSTRAINT "mkt_seg_tenant_name_unique" UNIQUE("tenant_id","name");