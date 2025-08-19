CREATE TABLE IF NOT EXISTS notification_policies (
  id serial PRIMARY KEY,
  org_id varchar NOT NULL,
  scope varchar(16) NOT NULL,
  event varchar(16) NOT NULL,
  days_before integer,
  days_overdue integer,
  repeat_every_minutes integer,
  max_occurrences integer,
  channels varchar(64) NOT NULL,
  type_filter varchar(16),
  category_id varchar,
  amount_min numeric,
  amount_max numeric,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone varchar(64) DEFAULT 'America/Sao_Paulo',
  weekdays_mask integer DEFAULT 127,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX notification_policies_org_idx ON notification_policies(org_id);

CREATE TABLE IF NOT EXISTS notification_state (
  id serial PRIMARY KEY,
  policy_id integer NOT NULL REFERENCES notification_policies(id) ON DELETE CASCADE,
  resource_type varchar(16) NOT NULL,
  resource_id varchar NOT NULL,
  last_notified_at timestamp with time zone,
  occurrences integer DEFAULT 0,
  next_eligible_at timestamp with time zone,
  status varchar(16) DEFAULT 'ok'
);

CREATE UNIQUE INDEX notification_state_policy_resource_idx
  ON notification_state(policy_id, resource_type, resource_id);

CREATE TABLE IF NOT EXISTS notification_runs (
  id serial PRIMARY KEY,
  policy_id integer REFERENCES notification_policies(id) ON DELETE CASCADE,
  resource_type varchar(16),
  resource_id varchar,
  channel varchar(16),
  sent_at timestamp with time zone NOT NULL,
  status varchar(16),
  error text
);
