ALTER TABLE "accounts" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "accounts" SET "created_by" = "organizations"."owner_id" FROM "organizations" WHERE "accounts"."organization_id" = "organizations"."id" AND "accounts"."created_by" IS NULL;--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_organization_id_name_unique";--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_organization_id_created_by_name_unique" UNIQUE ("organization_id", "created_by", "name");--> statement-breakpoint
CREATE INDEX "idx_accounts_created_by" ON "accounts" USING btree ("created_by") WHERE "created_by" IS NOT NULL;
