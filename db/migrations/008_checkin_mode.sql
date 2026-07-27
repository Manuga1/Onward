-- Personalized check-in timing (calendar-optimized).
-- PRIVACY: we store only the RESULT (a mode + recommended times). The raw
-- calendar is parsed on-device and never persisted or transmitted.

-- How the member's daily check-in time is determined:
--   'fixed'        → same chosen hour every day (default, existing behavior)
--   'ai_consistent'→ one recurring time the optimizer found (stored in checkin_hour)
--   'ai_daily'     → a different optimized time each day (see checkin_recommendations)
alter table members
  add column if not exists checkin_mode text not null default 'fixed'
    check (checkin_mode in ('fixed', 'ai_consistent', 'ai_daily'));

-- Per-day recommended times for 'ai_daily' members. Times only — no event data.
create table if not exists checkin_recommendations (
  member_id    uuid not null references members(member_id) on delete cascade,
  window_date  date not null,          -- local calendar date
  hour         int  not null check (hour >= 0 and hour <= 23),
  minute       int  not null default 0 check (minute >= 0 and minute <= 59),
  notified_at  timestamptz,            -- when the day-before reminder was sent
  created_at   timestamptz not null default now(),
  primary key (member_id, window_date)
);

alter table checkin_recommendations enable row level security;

-- Members can read their own recommendations; writes go through the service role.
do $$ begin
  create policy "checkin_reco_select_own"
    on checkin_recommendations for select
    using (member_id = auth.uid());
exception when duplicate_object then null; end $$;
