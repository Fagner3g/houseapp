CREATE TABLE "tags" (
        "id" text PRIMARY KEY NOT NULL,
        "organization_id" text NOT NULL,
        "name" text NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "tags_organization_id_name_unique" UNIQUE("organization_id","name"),
        CONSTRAINT "tags_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action
);

ALTER TABLE "transaction_tags" DROP COLUMN IF EXISTS "tag";
ALTER TABLE "transaction_tags" ADD COLUMN "tag_id" text NOT NULL;
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
