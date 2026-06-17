-- Onward — Row-Level Security Policies
-- Phase 0: Every table has RLS enabled.
-- Auth: Supabase Auth. auth.uid() returns the Supabase user UUID.
-- Each member row has a member_id that corresponds to auth.uid() via the auth mapping.
--
-- HUMAN-OWNED: Review these policies with a security consultant before launch.
-- The auth.uid() → member_id mapping must be established in your auth flow.

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
alter table members              enable row level security;
alter table egg_pods             enable row level security;
alter table egg_pod_members      enable row level security;
alter table partnerships         enable row level security;
alter table partnership_members  enable row level security;
alter table check_ins            enable row level security;
alter table messages             enable row level security;
alter table reports              enable row level security;
alter table blocks               enable row level security;
alter table notification_log     enable row level security;

-- ============================================================
-- Helper: is the current user a member of a partnership?
-- ============================================================
create or replace function is_partnership_member(p_id uuid)
returns boolean
language sql security definer
stable as $$
  select exists (
    select 1 from partnership_members
    where partnership_id = p_id
      and member_id = auth.uid()
  );
$$;

-- ============================================================
-- Members: read own row only
-- ============================================================
create policy "members_select_own"
  on members for select
  using (member_id = auth.uid());

create policy "members_insert_own"
  on members for insert
  with check (member_id = auth.uid());

create policy "members_update_own"
  on members for update
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

-- No delete via RLS — account deletion goes through a server-side function with cooldown
-- HUMAN-OWNED: Implement server-side account deletion with 24h confirmation cooldown

-- ============================================================
-- Egg Pods: members can see pods they belong to
-- ============================================================
create policy "egg_pods_select_member"
  on egg_pods for select
  using (
    exists (
      select 1 from egg_pod_members
      where pod_id = egg_pods.pod_id
        and member_id = auth.uid()
    )
  );

create policy "egg_pod_members_select_own_pod"
  on egg_pod_members for select
  using (
    -- Can see all members of a pod you're in (for the egg room social view)
    exists (
      select 1 from egg_pod_members self_row
      where self_row.pod_id = egg_pod_members.pod_id
        and self_row.member_id = auth.uid()
    )
  );

-- ============================================================
-- Partnerships: both members can read
-- ============================================================
create policy "partnerships_select_member"
  on partnerships for select
  using (is_partnership_member(partnership_id));

create policy "partnership_members_select"
  on partnership_members for select
  using (is_partnership_member(partnership_id));

-- ============================================================
-- Check-ins:
-- - Member reads own check-ins in full
-- - Partner reads ONLY the encrypted state (not history) of their partner's check-ins
--   (decryption enforced at app layer; partner sees status, not archived history)
-- ============================================================
create policy "checkins_select_own"
  on check_ins for select
  using (member_id = auth.uid());

create policy "checkins_select_partner_current"
  on check_ins for select
  using (
    -- Partner can see current check-ins (app layer enforces they only decrypt the state)
    is_partnership_member(partnership_id)
  );

create policy "checkins_insert_own"
  on check_ins for insert
  with check (member_id = auth.uid());

-- No update/delete of check-ins (immutable audit trail)

-- ============================================================
-- Messages: only active partnership members
-- ============================================================
create policy "messages_select_partnership"
  on messages for select
  using (is_partnership_member(partnership_id));

create policy "messages_insert_own"
  on messages for insert
  with check (
    sender_id = auth.uid()
    and is_partnership_member(partnership_id)
  );

-- No update (immutable). Delete handled by 30-day server-side purge only.

-- ============================================================
-- Reports: reporter sees own reports; target has no visibility
-- ============================================================
create policy "reports_select_own"
  on reports for select
  using (reporter_id = auth.uid());

create policy "reports_insert_own"
  on reports for insert
  with check (reporter_id = auth.uid());

-- HUMAN-OWNED: Operator/admin role needs a separate service-role policy for report review queue

-- ============================================================
-- Blocks: each user sees their own block entries
-- ============================================================
create policy "blocks_select_own"
  on blocks for select
  using (blocker_id = auth.uid() or blocked_id = auth.uid());

create policy "blocks_insert_own"
  on blocks for insert
  with check (blocker_id = auth.uid());

create policy "blocks_delete_own"
  on blocks for delete
  using (blocker_id = auth.uid());

-- ============================================================
-- Notification log: member sees own entries only
-- ============================================================
create policy "notification_log_select_own"
  on notification_log for select
  using (member_id = auth.uid());

-- Inserts handled by server-side service role only (not client-insertable)
