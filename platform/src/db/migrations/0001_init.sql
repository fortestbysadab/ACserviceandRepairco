-- 0001_init.sql — identity, portals, sessions, durable queue
-- Applied once, in a transaction, by scripts/migrate.mjs.
-- Never edit an applied migration: add a new numbered file instead.

-- No extensions required: gen_random_uuid() is core since Postgres 13.

-- ---------------------------------------------------------------- identity
create table if not exists identity (
  id            uuid primary key default gen_random_uuid(),
  phone         text not null,
  display_name  text,
  language      text not null default 'bn',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint identity_phone_e164 check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  constraint identity_language_allowed check (language in ('bn', 'hi', 'en'))
);
create unique index if not exists identity_phone_key on identity (phone);

-- ------------------------------------------------------ membership (portal)
create table if not exists membership (
  id           uuid primary key default gen_random_uuid(),
  identity_id  uuid not null references identity (id) on delete cascade,
  portal       text not null,
  status       text not null default 'active',
  approved_by  uuid references identity (id),
  approved_at  timestamptz,
  created_at   timestamptz not null default now(),
  constraint membership_portal_allowed check (portal in ('customer', 'expert')),
  constraint membership_status_allowed check (status in ('invited', 'active', 'suspended', 'revoked'))
);
create unique index if not exists membership_identity_portal_key on membership (identity_id, portal);
create index if not exists membership_identity_idx on membership (identity_id);

-- ----------------------------------------------------------------- sessions
create table if not exists session (
  id          text primary key,                       -- sha-256 of cookie value
  identity_id uuid not null references identity (id) on delete cascade,
  portal      text not null,
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  constraint session_portal_allowed check (portal in ('customer', 'expert'))
);
create index if not exists session_identity_idx on session (identity_id);

-- ------------------------------------------------------------ inbound inbox
create table if not exists inbound_event (
  id           uuid primary key default gen_random_uuid(),
  external_id  text not null,
  channel      text not null default 'whatsapp',
  payload      text not null,
  status       text not null default 'received',
  attempts     integer not null default 0,
  received_at  timestamptz not null default now(),
  processed_at timestamptz,
  constraint inbound_status_allowed check (status in ('received', 'processed', 'failed', 'dead'))
);
create unique index if not exists inbound_event_external_id_key on inbound_event (external_id);
create index if not exists inbound_event_status_idx on inbound_event (status, received_at);

-- -------------------------------------------------------- transactional outbox
create table if not exists outbox (
  id              uuid primary key default gen_random_uuid(),
  action_key      text not null,
  kind            text not null,
  payload         text not null,
  status          text not null default 'pending',
  attempts        integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_expires_at timestamptz,
  last_error      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint outbox_status_allowed check (status in ('pending', 'leased', 'done', 'failed', 'dead'))
);
create unique index if not exists outbox_action_key_key on outbox (action_key);
create index if not exists outbox_due_idx on outbox (status, next_attempt_at);

-- --------------------------------------------------------- delivery receipts
create table if not exists delivery_event (
  id                  uuid primary key default gen_random_uuid(),
  provider_message_id text not null,
  status              text not null,
  detail              text,
  received_at         timestamptz not null default now()
);
create index if not exists delivery_event_message_idx on delivery_event (provider_message_id);
