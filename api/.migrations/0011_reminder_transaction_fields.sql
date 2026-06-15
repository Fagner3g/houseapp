ALTER TABLE custom_reminders
  ADD COLUMN IF NOT EXISTS generates_transaction boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_pay_to_id text,
  ADD COLUMN IF NOT EXISTS transaction_type text NOT NULL DEFAULT 'expense';

ALTER TABLE custom_reminders
  ADD CONSTRAINT custom_reminders_default_pay_to_id_users_id_fk
  FOREIGN KEY (default_pay_to_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS reminder_occurrence_transactions (
  id text PRIMARY KEY NOT NULL,
  reminder_id text NOT NULL,
  period_key text NOT NULL,
  occurrence_id text NOT NULL,
  series_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE reminder_occurrence_transactions
  ADD CONSTRAINT reminder_occurrence_transactions_reminder_id_fk
  FOREIGN KEY (reminder_id) REFERENCES custom_reminders(id) ON DELETE CASCADE;

ALTER TABLE reminder_occurrence_transactions
  ADD CONSTRAINT reminder_occurrence_transactions_occurrence_id_fk
  FOREIGN KEY (occurrence_id) REFERENCES transactions_occurrences(id) ON DELETE CASCADE;

ALTER TABLE reminder_occurrence_transactions
  ADD CONSTRAINT reminder_occurrence_transactions_series_id_fk
  FOREIGN KEY (series_id) REFERENCES transactions_series(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS reminder_occurrence_transactions_reminder_period_uidx
  ON reminder_occurrence_transactions (reminder_id, period_key);
