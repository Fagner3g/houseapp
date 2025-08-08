ALTER TABLE "expenses" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "is_recurring" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "recurrence_type" text DEFAULT 'monthly';--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "recurrence_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "recurrence_interval" integer;