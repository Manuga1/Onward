-- Egg-phase group chat: pod members converse before choosing partners.
-- Text-only, encrypted at app layer, images off (same policy as partner chat).
create table if not exists egg_messages (
  message_id     uuid primary key default gen_random_uuid(),
  pod_id         uuid not null references egg_pods(pod_id) on delete cascade,
  sender_id      uuid not null references members(member_id) on delete cascade,
  text_encrypted text not null,
  sent_at        timestamptz not null default now()
);

create index if not exists egg_messages_pod_sent_idx on egg_messages(pod_id, sent_at);

alter table egg_messages enable row level security;
-- No client policies — reads/writes go through the API using the service role,
-- which verifies pod membership manually (egg_pod_members RLS is self-referential).
