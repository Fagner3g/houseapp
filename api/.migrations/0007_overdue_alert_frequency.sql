ALTER TABLE "transactions_series" ADD COLUMN "overdue_alert_frequency" text NOT NULL DEFAULT 'weekly';
ALTER TABLE "transactions_occurrences" ADD COLUMN "last_overdue_alert_at" timestamp with time zone;
