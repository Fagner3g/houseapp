ALTER TABLE "user_organizations" DROP CONSTRAINT "user_organizations_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "user_organizations" ADD CONSTRAINT "user_organizations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;