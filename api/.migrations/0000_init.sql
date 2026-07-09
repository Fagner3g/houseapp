CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"institution" text,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"credit_limit" bigint,
	"closing_day" integer,
	"due_day" integer,
	"payment_account_id" text,
	"initial_balance" bigint DEFAULT 0 NOT NULL,
	"pix_key" text,
	"pix_key_type" text,
	"color" text,
	"icon" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"ofx_account_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_organization_id_name_unique" UNIQUE("organization_id","name")
);
--> statement-breakpoint
CREATE TABLE "alert_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"scope" text NOT NULL,
	"account_id" text,
	"recurring_transaction_id" text,
	"trigger_type" text NOT NULL,
	"config" jsonb NOT NULL,
	"channels" jsonb DEFAULT '["in_app"]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"label" text NOT NULL,
	"last_four_digits" text,
	"type" text NOT NULL,
	"holder_name" text,
	"user_id" text,
	"brand" text,
	"status" text DEFAULT 'active' NOT NULL,
	"blocked_at" timestamp with time zone,
	"blocked_reason" text,
	"canceled_at" timestamp with time zone,
	"canceled_reason" text,
	"expires_at" date,
	"is_contactless" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'expense' NOT NULL,
	"color" text,
	"icon" text,
	"parent_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_organization_id_name_parent_id_type_unique" UNIQUE("organization_id","name","parent_id","type")
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"invited_by" text NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"alert_rule_id" text,
	"transaction_id" text,
	"account_id" text,
	"title" text NOT NULL,
	"body" text,
	"channel" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"dedupe_key" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_members_user_id_organization_id_pk" PRIMARY KEY("user_id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"owner_id" text NOT NULL,
	"default_notify_hour" integer DEFAULT 9 NOT NULL,
	"default_notify_minute" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"account_id" text,
	"title" text NOT NULL,
	"amount" bigint NOT NULL,
	"type" text NOT NULL,
	"counterparty" text,
	"category_id" text,
	"frequency" text NOT NULL,
	"interval" integer DEFAULT 1 NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"installments_total" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_generated_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "split_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"split_id" text NOT NULL,
	"amount" bigint NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"method" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "statements" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"closing_date" timestamp with time zone,
	"due_date" timestamp with time zone,
	"total_amount" bigint,
	"minimum_payment" bigint,
	"previous_balance" bigint,
	"payments_received" bigint,
	"purchases_total" bigint,
	"other_charges" bigint,
	"next_invoice_balance" bigint,
	"total_open_balance" bigint,
	"transactions_count" integer DEFAULT 0 NOT NULL,
	"file_hash" text NOT NULL,
	"file_name" text,
	"import_source" text,
	"is_closed" boolean DEFAULT false NOT NULL,
	"is_paid" boolean DEFAULT false NOT NULL,
	"imported_by" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "statements_file_hash_account_id_unique" UNIQUE("file_hash","account_id")
);
--> statement-breakpoint
CREATE TABLE "transaction_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"file_size" bigint NOT NULL,
	"storage_key" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_categories" (
	"transaction_id" text NOT NULL,
	"category_id" text NOT NULL,
	CONSTRAINT "transaction_categories_transaction_id_category_id_pk" PRIMARY KEY("transaction_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "transaction_splits" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"user_id" text,
	"contact_name" text,
	"contact_phone" text,
	"contact_email" text,
	"amount" bigint NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_amount" bigint DEFAULT 0 NOT NULL,
	"paid_at" timestamp with time zone,
	"notify_enabled" boolean DEFAULT true NOT NULL,
	"is_notified" boolean DEFAULT false NOT NULL,
	"last_notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_split_has_person" CHECK ("transaction_splits"."user_id" IS NOT NULL OR "transaction_splits"."contact_name" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"account_id" text,
	"card_id" text,
	"recurring_transaction_id" text,
	"statement_id" text,
	"title" text NOT NULL,
	"description" text,
	"amount" bigint,
	"type" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"competence_date" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"paid_amount" bigint,
	"counterparty" text,
	"installment_number" integer,
	"installments_total" integer,
	"source" text DEFAULT 'manual' NOT NULL,
	"external_id" text,
	"transfer_pair_id" text,
	"notify_enabled" boolean DEFAULT false NOT NULL,
	"notify_target_type" text,
	"notify_user_id" text,
	"notify_contact_name" text,
	"notify_contact_phone" text,
	"notify_days_before" jsonb,
	"notify_last_notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_transaction_notify_target" CHECK (NOT "transactions"."notify_enabled" OR (
        "transactions"."notify_target_type" = 'member' AND "transactions"."notify_user_id" IS NOT NULL
      ) OR (
        "transactions"."notify_target_type" = 'contact' AND "transactions"."notify_contact_name" IS NOT NULL
      ))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_payment_account_id_accounts_id_fk" FOREIGN KEY ("payment_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_recurring_transaction_id_recurring_transactions_id_fk" FOREIGN KEY ("recurring_transaction_id") REFERENCES "public"."recurring_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_alert_rule_id_alert_rules_id_fk" FOREIGN KEY ("alert_rule_id") REFERENCES "public"."alert_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_payments" ADD CONSTRAINT "split_payments_split_id_transaction_splits_id_fk" FOREIGN KEY ("split_id") REFERENCES "public"."transaction_splits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_attachments" ADD CONSTRAINT "transaction_attachments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_attachments" ADD CONSTRAINT "transaction_attachments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_attachments" ADD CONSTRAINT "transaction_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_categories" ADD CONSTRAINT "transaction_categories_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_categories" ADD CONSTRAINT "transaction_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurring_transaction_id_recurring_transactions_id_fk" FOREIGN KEY ("recurring_transaction_id") REFERENCES "public"."recurring_transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_statement_id_statements_id_fk" FOREIGN KEY ("statement_id") REFERENCES "public"."statements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transfer_pair_id_transactions_id_fk" FOREIGN KEY ("transfer_pair_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_notify_user_id_users_id_fk" FOREIGN KEY ("notify_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_accounts_org_ofx_account_id" ON "accounts" USING btree ("organization_id","ofx_account_id") WHERE "accounts"."ofx_account_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_alert_rules_org" ON "alert_rules" USING btree ("organization_id","trigger_type") WHERE "alert_rules"."scope" = 'organization' AND "alert_rules"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_alert_rules_account" ON "alert_rules" USING btree ("account_id","trigger_type") WHERE "alert_rules"."scope" = 'account' AND "alert_rules"."is_active" = true AND "alert_rules"."account_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_alert_rules_recurring" ON "alert_rules" USING btree ("recurring_transaction_id","trigger_type") WHERE "alert_rules"."scope" = 'recurring' AND "alert_rules"."is_active" = true AND "alert_rules"."recurring_transaction_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_cards_account" ON "cards" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_dedupe_key_unique" ON "notifications" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_unread" ON "notifications" USING btree ("user_id","status") WHERE "notifications"."status" IN ('pending', 'sent');--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unique" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_split_payments_split" ON "split_payments" USING btree ("split_id");--> statement-breakpoint
CREATE INDEX "idx_splits_transaction" ON "transaction_splits" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_splits_user_pending" ON "transaction_splits" USING btree ("user_id","status") WHERE "transaction_splits"."status" IN ('pending', 'partial');--> statement-breakpoint
CREATE INDEX "idx_transactions_org_date" ON "transactions" USING btree ("organization_id","date");--> statement-breakpoint
CREATE INDEX "idx_transactions_account_date" ON "transactions" USING btree ("account_id","date");--> statement-breakpoint
CREATE INDEX "idx_transactions_card" ON "transactions" USING btree ("card_id") WHERE "transactions"."card_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_transactions_status" ON "transactions" USING btree ("organization_id","status") WHERE "transactions"."status" IN ('pending', 'partial');--> statement-breakpoint
CREATE UNIQUE INDEX "idx_transactions_external_dedup" ON "transactions" USING btree ("account_id","external_id") WHERE "transactions"."external_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");