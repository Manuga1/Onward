-- Member picks table: stores ranked choices during egg phase
-- picks is an ordered array of member_ids (up to 3, most preferred first)
-- Only the matching engine reads this; it is never exposed to other members.

create table member_picks (
  pod_id    uuid not null references egg_pods(pod_id) on delete cascade,
  member_id uuid not null references members(member_id) on delete cascade,
  picks     uuid[] not null default '{}', -- up to 3 ranked memberIds
  updated_at timestamptz not null default now(),
  primary key (pod_id, member_id),
  constraint max_three_picks check (array_length(picks, 1) <= 3)
);

alter table member_picks enable row level security;

-- Members can only write their own picks; they cannot read others' picks
create policy "member_picks_insert_own"
  on member_picks for insert
  with check (member_id = auth.uid());

create policy "member_picks_update_own"
  on member_picks for update
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

-- No select policy for members — picks are private until matching completes
-- The matching engine uses service-role key to read all picks
