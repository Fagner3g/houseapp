CREATE TABLE "split_payment_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"transaction_id" text NOT NULL,
	"split_id" text NOT NULL,
	"requested_by_user_id" text NOT NULL,
	"recipient_user_id" text NOT NULL,
	"amount" bigint NOT NULL,
	"note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "split_payment_requests" ADD CONSTRAINT "split_payment_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_payment_requests" ADD CONSTRAINT "split_payment_requests_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_payment_requests" ADD CONSTRAINT "split_payment_requests_split_id_transaction_splits_id_fk" FOREIGN KEY ("split_id") REFERENCES "public"."transaction_splits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_payment_requests" ADD CONSTRAINT "split_payment_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_payment_requests" ADD CONSTRAINT "split_payment_requests_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "split_payment_requests_pending_split_unique" ON "split_payment_requests" USING btree ("split_id") WHERE "status" = 'pending';--> statement-breakpoint
CREATE INDEX "idx_split_payment_requests_recipient_pending" ON "split_payment_requests" USING btree ("recipient_user_id","status") WHERE "status" = 'pending';
