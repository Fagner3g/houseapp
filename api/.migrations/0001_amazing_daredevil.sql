ALTER TABLE "transactions" ADD COLUMN "recurrence_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "installments_total" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "installments_paid" integer DEFAULT 0 NOT NULL;