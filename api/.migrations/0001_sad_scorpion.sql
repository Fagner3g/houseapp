DROP INDEX "idx_transactions_status";--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_transactions_status" ON "transactions" USING btree ("organization_id","status") WHERE "transactions"."status" IN ('pending', 'partial');