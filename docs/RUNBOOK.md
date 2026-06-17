# Onward — Runbook

> Operational procedures for running the Phase 2 MVP pilot.

---

## Weekly cohort launch (Phase 1/2 manual ops)

1. Confirm signup queue in Supabase: `select * from members where verified = false or member_id not in (select member_id from egg_pod_members)`
2. Assemble pods via `/operator/match` or by calling `assembleEggPods()` from packages/core with the queue
3. Insert pod rows + `egg_pod_members` rows (service-role key)
4. Send welcome SMS/push (HUMAN-OWNED: trigger via OneSignal/Twilio)
5. After 7 days, trigger `/api/match` with each pod ID:
   ```bash
   curl -X POST https://your-app.vercel.app/api/match \
     -H "Authorization: Bearer $CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"podId": "pod_xxx"}'
   ```
6. Confirm partnerships created; check for `carryOver` members and handle manually

---

## Monitoring

- **Sentry:** `onward` project — check for new issues daily during pilot
- **Supabase:** Dashboard → Database → Table editor — spot-check for unexpected data
- **PostHog:** Funnel: `signup_started → onboarding_completed → egg_joined → partner_matched → checkin_submitted`
- **Key metric (Phase 1 green-light):** D30 active ≥ 35–40% + majority report a real decision changed

---

## Escalation handling

When `requires_human_escalation = true` appears in the `reports` table:

1. Log into Supabase, run: `select * from reports where requires_human_escalation = true and reviewed_at is null`
2. Review the report — do NOT take automated action on the reported member
3. If NCMEC duty triggered (PredatoryBehavior + possible_minor_involved):
   - **HUMAN-OWNED:** File CyberTipline report at cybertipline.org
   - Document action in `reviewed_by` and `reviewed_at`
4. If harassment/predatory but no minor: warn or ban via service-role update to `members` table (add a `banned` boolean column — not yet built; HUMAN-OWNED)

---

## Data deletion requests

1. Member requests deletion via `/settings` → "Request account deletion"
2. 24-hour confirmation window (HUMAN-OWNED: implement confirmation email/SMS)
3. After confirmation, run server-side deletion:
   ```sql
   -- Hard-delete member and cascade (RLS won't block service-role)
   delete from members where member_id = 'uuid';
   -- uniqueness_hash row stays (tombstone to prevent re-registration)
   -- HUMAN-OWNED: confirm retention law allows this with counsel
   ```
4. Confirm deletion in Sentry and PostHog (delete user data via their APIs)

---

## 30-day retention purge

Set up a Supabase pg_cron job (HUMAN-OWNED):

```sql
-- Run daily at 03:00 UTC
select cron.schedule(
  'purge-old-messages',
  '0 3 * * *',
  $$delete from messages where sent_at < now() - interval '30 days'$$
);

select cron.schedule(
  'purge-notification-log',
  '0 3 * * *',
  $$delete from notification_log where sent_at < now() - interval '30 days'$$
);
```

---

## Partner-dark handling

If `RematchRecommended` event fires (3+ consecutive missed days by a partner):

1. Member receives an in-app prompt: "Your partner hasn't checked in for a few days. Would you like us to find you a new partner?" (one tap, no explanation required)
2. If yes → deactivate current partnership, carry streak, re-add member to matching queue
3. If no → snooze for 3 more days

HUMAN-OWNED: Build the in-app prompt UI (not yet implemented). The domain event is emitted by `packages/core/checkin.ts`.

---

## Environment variables checklist

Before deploying to production, confirm all of these are set in Vercel:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `STRIPE_SECRET_KEY` (HUMAN-OWNED)
- [ ] `STRIPE_IDENTITY_WEBHOOK_SECRET` (HUMAN-OWNED)
- [ ] `NEXT_PUBLIC_POSTHOG_KEY`
- [ ] `NEXT_PUBLIC_SENTRY_DSN`
- [ ] `CRON_SECRET` (generate with `openssl rand -hex 32`)
- [ ] `UNIQUENESS_HASH_SALT` (generate with `openssl rand -hex 32`; **never change after launch**)
- [ ] `NEXT_PUBLIC_APP_URL`
