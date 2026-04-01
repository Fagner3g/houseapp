CREATE TABLE "investment_assets" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "symbol" text NOT NULL,
  "display_name" text NOT NULL,
  "asset_class" text NOT NULL,
  "quote_preference" text DEFAULT 'auto_with_manual_fallback' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "investment_plans" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "asset_id" text NOT NULL,
  "frequency" text DEFAULT 'monthly' NOT NULL,
  "mode" text NOT NULL,
  "progression_type" text NOT NULL,
  "initial_amount" bigint,
  "initial_quantity" double precision,
  "step_amount" bigint,
  "step_quantity" double precision,
  "start_date" timestamp with time zone NOT NULL,
  "end_date" timestamp with time zone,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "investment_executions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "asset_id" text NOT NULL,
  "plan_id" text,
  "reference_month" text NOT NULL,
  "planned_amount" bigint,
  "planned_quantity" double precision,
  "invested_amount" bigint NOT NULL,
  "executed_quantity" double precision NOT NULL,
  "executed_unit_price" bigint NOT NULL,
  "executed_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "investment_quotes" (
  "id" text PRIMARY KEY NOT NULL,
  "asset_id" text NOT NULL,
  "source" text NOT NULL,
  "price" bigint NOT NULL,
  "captured_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "investment_assets"
  ADD CONSTRAINT "investment_assets_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "investment_plans"
  ADD CONSTRAINT "investment_plans_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "investment_plans"
  ADD CONSTRAINT "investment_plans_asset_id_investment_assets_id_fk"
  FOREIGN KEY ("asset_id") REFERENCES "public"."investment_assets"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "investment_executions"
  ADD CONSTRAINT "investment_executions_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "investment_executions"
  ADD CONSTRAINT "investment_executions_asset_id_investment_assets_id_fk"
  FOREIGN KEY ("asset_id") REFERENCES "public"."investment_assets"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "investment_executions"
  ADD CONSTRAINT "investment_executions_plan_id_investment_plans_id_fk"
  FOREIGN KEY ("plan_id") REFERENCES "public"."investment_plans"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "investment_quotes"
  ADD CONSTRAINT "investment_quotes_asset_id_investment_assets_id_fk"
  FOREIGN KEY ("asset_id") REFERENCES "public"."investment_assets"("id")
  ON DELETE cascade ON UPDATE no action;

CREATE INDEX "investment_assets_user_idx" ON "investment_assets" ("user_id");
CREATE INDEX "investment_plans_user_idx" ON "investment_plans" ("user_id");
CREATE INDEX "investment_plans_asset_idx" ON "investment_plans" ("asset_id");
CREATE INDEX "investment_executions_user_month_idx" ON "investment_executions" ("user_id", "reference_month");
CREATE UNIQUE INDEX "investment_executions_plan_month_uidx" ON "investment_executions" ("plan_id", "reference_month");
CREATE INDEX "investment_quotes_asset_idx" ON "investment_quotes" ("asset_id", "captured_at");
