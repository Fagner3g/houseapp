ALTER TABLE "organization_members" ADD COLUMN "notifications_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_members" ADD COLUMN "alert_preferences" jsonb DEFAULT '{"whatsapp":true,"inApp":true,"extension":true}'::jsonb NOT NULL;
