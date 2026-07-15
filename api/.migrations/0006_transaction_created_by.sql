ALTER TABLE "transactions" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_transactions_created_by" ON "transactions" USING btree ("created_by") WHERE "created_by" IS NOT NULL;
