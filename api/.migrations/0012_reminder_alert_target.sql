ALTER TABLE alert_rules
  ADD COLUMN IF NOT EXISTS target text NOT NULL DEFAULT 'transaction';

UPDATE alert_rules SET target = 'transaction' WHERE target IS NULL OR target = '';

DROP INDEX IF EXISTS alert_rules_org_kind_active_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS alert_rules_org_target_kind_active_uidx
  ON alert_rules (organization_id, target, kind)
  WHERE scope = 'organization' AND active = true;

INSERT INTO alert_rules (
  id,
  organization_id,
  scope,
  series_id,
  kind,
  config,
  channels,
  recipients,
  active,
  created_by,
  created_at,
  updated_at,
  target
)
SELECT
  'ar_rem_' || CASE kind WHEN 'upcoming' THEN 'up_' ELSE 'od_' END || organization_id,
  organization_id,
  scope,
  series_id,
  kind,
  config,
  channels,
  recipients,
  active,
  created_by,
  now(),
  now(),
  'reminder'
FROM alert_rules
WHERE scope = 'organization' AND target = 'transaction'
ON CONFLICT DO NOTHING;

ALTER TABLE custom_reminders
  ADD COLUMN IF NOT EXISTS use_org_alert_defaults boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS overdue_alert_frequency text,
  ADD COLUMN IF NOT EXISTS overdue_alert_interval integer NOT NULL DEFAULT 1;
