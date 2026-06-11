ALTER TABLE custom_reminders
  ADD COLUMN IF NOT EXISTS last_completed_period_key text;
