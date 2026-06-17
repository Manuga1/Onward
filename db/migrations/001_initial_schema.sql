-- Onward — Initial Schema
-- Phase 0: All tables per §4 of CLAUDE.md
-- Field encryption of sensitive columns is handled at the application layer (KMS-backed).
-- At-rest encryption provided by Supabase default.

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- Members
-- ============================================================
create table members (
  member_id        uuid primary key default gen_random_uuid(),
  codename         text not null unique,

  -- Encrypted at app layer before insert; decrypted at app layer on read
  phone_encrypted  text not null,
  phone_hash       text not null unique, -- one-way hash for duplicate detection

  email_encrypted  text,                 -- optional, encrypted

  fight            text not null check (fight in ('Porn')),
  gender           text not null check (gender in ('Male', 'Female', 'NonBinary')),
  intensity        text not null check (intensity in ('Occasional', 'Regular', 'Daily', 'MultipleDaily')),
  stage            text not null check (stage in ('Day1', 'Week1', 'ThirtyDays', 'NinetyPlus')),
  timezone         text not null,        -- IANA timezone string
  faith_preference text check (faith_preference in ('Secular', 'FaithBased', 'NoPreference')),

  -- Verification (no PII stored — only outcome + opaque ref + uniqueness hash)
  verified         boolean not null default false,
  verified_at      timestamptz,
  verifier_txn_id  text,
  uniqueness_hash  text unique,          -- one-way; detects re-registration

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on column members.phone_encrypted is 'App-layer KMS-encrypted phone number. Never log or expose raw.';
comment on column members.phone_hash is 'One-way SHA-256 of E.164 phone. Source never stored. Uniqueness only.';
comment on column members.uniqueness_hash is 'One-way hash from verification vendor. Prevents re-registration.';

-- ============================================================
-- Egg Pods
-- ============================================================
create table egg_pods (
  pod_id     uuid primary key default gen_random_uuid(),
  fight      text not null,
  gender     text not null,
  started_at timestamptz not null default now(),
  ends_at    timestamptz not null
);

create table egg_pod_members (
  pod_id    uuid not null references egg_pods(pod_id) on delete cascade,
  member_id uuid not null references members(member_id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (pod_id, member_id)
);

-- ============================================================
-- Partnerships
-- ============================================================
create table partnerships (
  partnership_id  uuid primary key default gen_random_uuid(),
  streak_days     int not null default 0,
  last_contact_at timestamptz,
  started_at      timestamptz not null default now(),
  is_active       boolean not null default true
);

create table partnership_members (
  partnership_id uuid not null references partnerships(partnership_id) on delete cascade,
  member_id      uuid not null references members(member_id) on delete cascade,
  primary key (partnership_id, member_id)
);

-- ============================================================
-- Check-ins
-- ============================================================
create table check_ins (
  check_in_id    uuid primary key default gen_random_uuid(),
  member_id      uuid not null references members(member_id) on delete cascade,
  partnership_id uuid not null references partnerships(partnership_id) on delete cascade,
  -- state is encrypted at app layer; enum enforced at app layer
  state_encrypted text not null, -- 'Good' | 'Shaky' | 'Fell' (encrypted)
  window_id      text not null,
  submitted_at   timestamptz not null default now()
);

comment on column check_ins.state_encrypted is 'App-layer encrypted. Good|Shaky|Fell. Never log plaintext state.';

-- ============================================================
-- Messages
-- ============================================================
create table messages (
  message_id     uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references partnerships(partnership_id) on delete cascade,
  sender_id      uuid not null references members(member_id) on delete cascade,
  -- text encrypted at app layer; images never accepted
  text_encrypted text not null,
  sent_at        timestamptz not null default now(),

  -- enforce at app layer too; belt-and-suspenders
  constraint message_no_future check (sent_at <= now() + interval '5 seconds')
);

comment on column messages.text_encrypted is 'App-layer encrypted. ≤280 chars (enforced at app layer). Images disabled.';

-- 30-day rolling retention: enforce via a scheduled job (HUMAN-OWNED: set up pg_cron or Supabase Edge Function)
-- HUMAN-OWNED: Schedule: delete from messages where sent_at < now() - interval '30 days';

-- ============================================================
-- Reports
-- ============================================================
create table reports (
  report_id                  uuid primary key default gen_random_uuid(),
  reporter_id                uuid not null references members(member_id) on delete set null,
  target_id                  uuid not null references members(member_id) on delete set null,
  category                   text not null check (category in ('Harassment','InappropriateContent','PredatoryBehavior','Spam','Other')),
  requires_human_escalation  boolean not null default false,
  possible_minor_involved    boolean not null default false,
  created_at                 timestamptz not null default now(),
  reviewed_at                timestamptz,
  reviewed_by                text        -- HUMAN-OWNED: operator identifier
);

-- ============================================================
-- Blocks
-- ============================================================
create table blocks (
  blocker_id uuid not null references members(member_id) on delete cascade,
  blocked_id uuid not null references members(member_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

-- ============================================================
-- Notification Log (ephemeral, purge after 30 days)
-- ============================================================
create table notification_log (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid references members(member_id) on delete cascade,
  type       text not null,
  sent_at    timestamptz not null default now()
);

-- HUMAN-OWNED: Schedule purge: delete from notification_log where sent_at < now() - interval '30 days';

-- ============================================================
-- Indexes
-- ============================================================
create index on check_ins(member_id, submitted_at desc);
create index on check_ins(partnership_id);
create index on messages(partnership_id, sent_at desc);
create index on blocks(blocker_id);
create index on blocks(blocked_id);
create index on notification_log(member_id, sent_at desc);
create index on egg_pod_members(member_id);
create index on partnership_members(member_id);

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger members_updated_at
  before update on members
  for each row execute function set_updated_at();
