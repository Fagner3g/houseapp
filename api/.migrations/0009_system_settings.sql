CREATE TABLE IF NOT EXISTS "system_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
INSERT INTO "system_settings" ("id", "notifications_enabled")
VALUES ('default', true)
ON CONFLICT ("id") DO NOTHING;
