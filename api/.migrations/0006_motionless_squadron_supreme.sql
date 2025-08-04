ALTER TABLE "users" DROP CONSTRAINT "users_default_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "owner_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "default_organization_id";