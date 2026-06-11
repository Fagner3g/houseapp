-- Central de Alertas: custom reminders, alert deliveries, alert rules, and preferences
CREATE TABLE IF NOT EXISTS "custom_reminders" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "created_by" text NOT NULL,
  "title" text NOT NULL,
  "notes" text,
  "due_date" timestamp with time zone NOT NULL,
  "amount_cents" bigint,
  "days_before" json NOT NULL DEFAULT '[1,0]'::json,
  "channels" json NOT NULL DEFAULT '["in_app","whatsapp","extension"]'::json,
  "recipient_user_id" text NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "completed_at" timestamp with time zone,
  "is_recurring" boolean NOT NULL DEFAULT false,
  "recurrence_type" text,
  "recurrence_interval" integer NOT NULL DEFAULT 1,
  "recurrence_until" timestamp with time zone,
  "notify_hour" integer,
  "notify_minute" integer,
  "linked_series_id" text,
  "snoozed_until" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "custom_reminders" ADD CONSTRAINT "custom_reminders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "custom_reminders" ADD CONSTRAINT "custom_reminders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "custom_reminders" ADD CONSTRAINT "custom_reminders_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "custom_reminders" ADD CONSTRAINT "custom_reminders_linked_series_id_transactions_series_id_fk" FOREIGN KEY ("linked_series_id") REFERENCES "public"."transactions_series"("id") ON DELETE set null ON UPDATE no action;

CREATE TABLE IF NOT EXISTS "alert_deliveries" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "user_id" text NOT NULL,
  "source_type" text NOT NULL,
  "rule_id" text,
  "reminder_id" text,
  "occurrence_id" text,
  "kind" text NOT NULL,
  "channel" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "sent_at" timestamp with time zone,
  "read_at" timestamp with time zone,
  "acked_at" timestamp with time zone,
  "dedupe_key" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_reminder_id_custom_reminders_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "public"."custom_reminders"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX IF NOT EXISTS "alert_deliveries_dedupe_key_unique" ON "alert_deliveries" ("dedupe_key");

CREATE TABLE IF NOT EXISTS "alert_rules" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "scope" text NOT NULL,
  "series_id" text,
  "kind" text NOT NULL,
  "config" jsonb NOT NULL,
  "channels" json NOT NULL DEFAULT '["in_app","whatsapp","extension"]'::json,
  "recipients" text NOT NULL DEFAULT 'pay_to',
  "active" boolean NOT NULL DEFAULT true,
  "created_by" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_series_id_transactions_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."transactions_series"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_rule_id_alert_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."alert_rules"("id") ON DELETE set null ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "alert_rules_org_kind_active_uidx" ON "alert_rules" ("organization_id", "kind") WHERE "scope" = 'organization' AND "active" = true;
CREATE UNIQUE INDEX IF NOT EXISTS "alert_rules_series_kind_active_uidx" ON "alert_rules" ("series_id", "kind") WHERE "scope" = 'series' AND "active" = true AND "series_id" IS NOT NULL;

-- Seed default org rules for existing organizations
INSERT INTO "alert_rules" (
  "id",
  "organization_id",
  "scope",
  "series_id",
  "kind",
  "config",
  "channels",
  "recipients",
  "active",
  "created_by",
  "created_at",
  "updated_at"
)
SELECT
  'ar_up_' || o.id,
  o.id,
  'organization',
  NULL,
  'upcoming',
  '{"daysBefore": [0, 1, 2, 3, 4]}'::jsonb,
  '["in_app","whatsapp","extension"]'::json,
  'pay_to',
  true,
  uo.user_id,
  now(),
  now()
FROM "organizations" o
INNER JOIN LATERAL (
  SELECT user_id FROM "user_organizations" uo
  WHERE uo.organization_id = o.id
  ORDER BY uo.created_at
  LIMIT 1
) uo ON true
ON CONFLICT DO NOTHING;

INSERT INTO "alert_rules" (
  "id",
  "organization_id",
  "scope",
  "series_id",
  "kind",
  "config",
  "channels",
  "recipients",
  "active",
  "created_by",
  "created_at",
  "updated_at"
)
SELECT
  'ar_od_' || o.id,
  o.id,
  'organization',
  NULL,
  'overdue',
  '{"frequency": "weekly", "interval": 1}'::jsonb,
  '["in_app","whatsapp","extension"]'::json,
  'pay_to',
  true,
  uo.user_id,
  now(),
  now()
FROM "organizations" o
INNER JOIN LATERAL (
  SELECT user_id FROM "user_organizations" uo
  WHERE uo.organization_id = o.id
  ORDER BY uo.created_at
  LIMIT 1
) uo ON true
ON CONFLICT DO NOTHING;

-- Map non-weekly overdueAlertFrequency to series overrides (excluding never and weekly)
INSERT INTO "alert_rules" (
  "id",
  "organization_id",
  "scope",
  "series_id",
  "kind",
  "config",
  "channels",
  "recipients",
  "active",
  "created_by",
  "created_at",
  "updated_at"
)
SELECT
  'ar_sod_' || ts.id,
  ts.organization_id,
  'series',
  ts.id,
  'overdue',
  jsonb_build_object('frequency', ts.overdue_alert_frequency, 'interval', 1),
  '["in_app","whatsapp","extension"]'::json,
  'pay_to',
  true,
  ts.owner_id,
  now(),
  now()
FROM "transactions_series" ts
WHERE ts.overdue_alert_frequency NOT IN ('weekly', 'never')
ON CONFLICT DO NOTHING;

ALTER TABLE "transactions_series" DROP COLUMN IF EXISTS "overdue_alert_frequency";
ALTER TABLE "transactions_occurrences" DROP COLUMN IF EXISTS "last_overdue_alert_at";

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "default_notify_hour" integer NOT NULL DEFAULT 9;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "default_notify_minute" integer NOT NULL DEFAULT 0;

ALTER TABLE "user_organizations"
ADD COLUMN IF NOT EXISTS "alert_preferences" jsonb NOT NULL DEFAULT '{"whatsapp": true, "inApp": true, "extension": true}'::jsonb;

UPDATE "alert_rules" SET "recipients" = 'pay_to' WHERE "scope" = 'organization' AND "recipients" = 'both';
