ALTER TABLE "transaction_splits" ADD COLUMN "due_at" timestamp with time zone;
ALTER TABLE "transaction_splits" ADD COLUMN "collect_installment_number" integer;
ALTER TABLE "transaction_splits" ADD COLUMN "collect_installments_total" integer;
ALTER TABLE "transaction_splits" ADD COLUMN "collect_plan_id" text;
CREATE INDEX "idx_splits_collect_plan" ON "transaction_splits" USING btree ("collect_plan_id");
