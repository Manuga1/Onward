-- Waitlist: collect interested emails before public launch
create table if not exists waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

alter table waitlist enable row level security;
-- No client policies — inserts/reads happen only via the service role from the API.
