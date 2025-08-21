CREATE TABLE "transactions_occurrences" (
	"id" text PRIMARY KEY NOT NULL,
	"series_id" text NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"amount" integer NOT NULL,
	"installment_index" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"value_paid" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions_series" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"recurrence_type" text NOT NULL,
	"recurrence_interval" integer DEFAULT 1 NOT NULL,
	"installments_total" integer,
	"recurrence_until" timestamp with time zone,
	"owner_id" text NOT NULL,
	"pay_to_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transaction_tags" DROP CONSTRAINT "transaction_tags_transaction_id_transactions_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions_occurrences" ADD CONSTRAINT "transactions_occurrences_series_id_transactions_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."transactions_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions_series" ADD CONSTRAINT "transactions_series_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions_series" ADD CONSTRAINT "transactions_series_pay_to_id_users_id_fk" FOREIGN KEY ("pay_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions_series" ADD CONSTRAINT "transactions_series_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_transaction_id_transactions_series_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions_series"("id") ON DELETE cascade ON UPDATE no action;