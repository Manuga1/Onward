# Onward — Security Hardening & Pen-Test Prep

> Phase 3 checklist. Check off each item before authorizing a public MVP launch.
> Items marked **HUMAN-OWNED** require a human decision or external action.

---

## Pre-launch gate: must be ALL green before public access

| # | Control | Status | Notes |
|---|---------|--------|-------|
| 1 | RLS on every Supabase table | ✅ Done | See `db/rls/policies.sql` + audit below |
| 2 | App-layer field encryption on sensitive columns | ⚠️ HUMAN-OWNED | KMS stubs in place; wire real KMS before launch |
| 3 | Sentry `beforeSend` scrubber | ✅ Done | `lib/errors/sentry.ts` strips PII/fight/content |
| 4 | PostHog autocapture OFF on sensitive screens | ✅ Done | `lib/analytics/PostHogProvider.tsx` |
| 5 | No PII in server logs | ✅ Done | Only error codes and opaque IDs logged |
| 6 | Phone number encrypted at rest | ⚠️ HUMAN-OWNED | Column `phone_encrypted` — wire KMS before launch |
| 7 | Message text encrypted at rest | ⚠️ HUMAN-OWNED | Column `text_encrypted` — wire KMS before launch |
| 8 | Check-in state encrypted at rest | ⚠️ HUMAN-OWNED | Column `state_encrypted` — wire KMS before launch |
| 9 | Verification artifacts never stored | ✅ Done | Only `pass`, `verifier_txn_id`, `uniqueness_hash` |
| 10 | 18+ gate enforced | ✅ Done | Soft gate (Phase 1); Stripe Identity (Phase 2) |
| 11 | US-only geofence | ⚠️ HUMAN-OWNED | Add Vercel Edge middleware geofence before launch |
| 12 | Operator match route protected | ⚠️ HUMAN-OWNED | `/operator/match` needs auth before launch |
| 13 | `/api/match` protected by CRON_SECRET | ✅ Done | Returns 401 if header missing |
| 14 | Image upload blocked in chat | ✅ Done | API rejects non-text; UI shows disabled notice |
| 15 | 30-day message retention purge | ⚠️ HUMAN-OWNED | Set up pg_cron or Supabase Edge Function |
| 16 | 30-day notification log purge | ⚠️ HUMAN-OWNED | Same as above |
| 17 | Cyber-liability insurance | ⚠️ HUMAN-OWNED | Required before public launch per §12 |
| 18 | Privacy-law counsel review | ⚠️ HUMAN-OWNED | CCPA, BIPA applicability; retention periods |
| 19 | Pen test by external firm | ⚠️ HUMAN-OWNED | Schedule after all above are green |
| 20 | Rate limiting on OTP + API routes | ⚠️ HUMAN-OWNED | Add Vercel/Supabase rate limits before launch |

---

## RLS Audit

All tables have RLS enabled. Policies reviewed below.

### `members`
- ✅ SELECT: own row only (`member_id = auth.uid()`)
- ✅ INSERT: own row only
- ✅ UPDATE: own row only
- ✅ No DELETE via RLS — account deletion is server-side with 24h cooldown
- ⚠️ **Gap:** Service-role key needed for operator actions (matching, moderation). Never expose service-role key to client.

### `egg_pods`
- ✅ SELECT: only pods you're a member of
- ✅ `egg_pod_members`: all members of your pod visible (needed for egg room social feature)
- ⚠️ **Note:** Pod members can see each other's codenames but no other data. RLS enforces this.

### `partnerships` / `partnership_members`
- ✅ SELECT: both members can read the partnership row
- ✅ No INSERT from client — partnerships created server-side only
- ⚠️ **Gap:** A member could see `streakDays` of a partnership they're not in if the join is wrong. Confirm `is_partnership_member()` function is correct.

### `check_ins`
- ✅ SELECT: own check-ins always readable
- ✅ Partner check-ins readable (app layer controls which fields are decrypted)
- ⚠️ **Gap:** The policy allows partners to read the `state_encrypted` column. App layer MUST decrypt only the current-day state for the partner, not the full history. Enforce this in the API layer, not RLS.
- ✅ INSERT: own rows only
- ✅ No UPDATE/DELETE — immutable

### `messages`
- ✅ SELECT: partnership members only
- ✅ INSERT: sender must be auth user + partnership member
- ✅ No UPDATE — immutable
- ⚠️ **Gap:** 30-day retention purge must be a server-side job, not client-triggered.

### `reports`
- ✅ SELECT: reporter sees own reports only (target has no visibility)
- ✅ INSERT: reporter is auth user
- ⚠️ **Gap:** Need a service-role policy for moderation queue access (human reviewers).

### `blocks`
- ✅ SELECT: own block entries (both directions)
- ✅ INSERT: blocker is auth user
- ✅ DELETE: only blocker can remove
- ⚠️ **Gap:** The second direction of a block (blocked→blocker) is inserted server-side. If using RLS for that insert, it will fail because `blocker_id` won't equal `auth.uid()`. Use service-role for the reverse-direction insert in `/api/block` and `/api/report`.

### `member_picks`
- ✅ INSERT/UPDATE: own picks only
- ✅ No SELECT policy for members — picks are private until matching
- ⚠️ **Gap:** Matching engine reads all picks with service-role key. Confirm service-role is never exposed to client.

### `notification_log`
- ✅ SELECT: own entries only
- ✅ INSERT: server-side only (no client insert policy)

---

## Threat Model (summary)

### High-priority threats

| Threat | Mitigation | Status |
|--------|-----------|--------|
| Member de-anonymization via codename + metadata correlation | Codenames are random, no link to real identity; minimal metadata stored | ✅ |
| Re-registration after account deletion | `uniqueness_hash` persists post-deletion and collides on re-attempt | ✅ |
| CSAM via partner chat | Images blocked at API + UI layer; text-only enforced | ✅ |
| Member reading partner's full check-in history | RLS allows row access; decryption restricted to current-day state at app layer | ⚠️ Enforce in API |
| Operator route abuse | `/operator/match` has no auth in Phase 1 | ⚠️ HUMAN-OWNED |
| Matching engine manipulation (member picks others' IDs) | `/api/picks` validates all picks are in the same pod | ✅ |
| OTP brute force | HUMAN-OWNED: rate limit at Supabase/Vercel layer | ⚠️ |
| NCMEC reporting failure | `requiresHumanEscalation` flag + console warn; HUMAN-OWNED: wire moderation alert | ⚠️ |
| EU member accessing US-only service (data sovereignty) | Geofence needed at edge | ⚠️ HUMAN-OWNED |

### Lower-priority (post-launch)
- Timing attacks on uniqueness hash comparison (use constant-time compare if querying hash directly)
- Supabase service-role key rotation policy
- Backup encryption and access controls

---

## KMS Encryption: what to wire

Three columns need app-layer encryption before launch. The current code has `// HUMAN-OWNED` markers at every insertion point.

**Recommended approach:** Supabase Vault (built-in) or AWS KMS via a server-side helper.

```typescript
// lib/crypto/fieldEncrypt.ts — wire this before launch
// HUMAN-OWNED: Choose KMS provider and implement encrypt/decrypt

export async function encryptField(plaintext: string): Promise<string> {
  // HUMAN-OWNED: Replace with real KMS call
  throw new Error('Field encryption not configured. HUMAN-OWNED: wire KMS before launch.');
}

export async function decryptField(ciphertext: string): Promise<string> {
  // HUMAN-OWNED: Replace with real KMS call
  throw new Error('Field decryption not configured. HUMAN-OWNED: wire KMS before launch.');
}
```

**Fields requiring encryption:**
- `members.phone_encrypted`
- `check_ins.state_encrypted`
- `messages.text_encrypted`
- `members.email_encrypted` (if collected)

---

## Geofence (US-only)

Add this to `middleware.ts` before launch:

```typescript
// HUMAN-OWNED: Verify this covers all relevant cases with legal counsel
import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const country = req.geo?.country;
  // Block EU countries (GDPR data sovereignty) and others as required
  const BLOCKED_REGIONS = ['DE','FR','IT','ES','NL','PL','SE','BE','AT','DK','FI','NO','PT','IE','GB'];
  if (country && BLOCKED_REGIONS.includes(country)) {
    return NextResponse.redirect(new URL('/unavailable', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next|unavailable).*)'] };
```

---

## Rate Limiting

Add to API routes before launch. Recommended: Upstash Redis + `@upstash/ratelimit`.

Priority routes to rate-limit:
- `/api/auth/*` (OTP send/verify) — max 5 attempts per phone per 15 min
- `/api/checkin` — max 3 per member per window
- `/api/chat` — max 50 messages per hour per partnership
- `/api/report` — max 10 per member per day

---

## Pen-Test Scope (hand to external firm)

When all green above:

1. **Authentication:** OTP bypass, session fixation, token leakage
2. **Authorization:** RLS policy escape, partner data access, cross-partnership reads
3. **Injection:** SQL injection via Supabase client, XSS in chat/codename rendering
4. **Business logic:** Check-in window manipulation, streak inflation, matching manipulation
5. **Data exposure:** PII in logs/errors/analytics, encrypted field exposure
6. **API abuse:** Rate limit bypass, mass reporting, block manipulation
7. **CSRF:** All state-mutating POST endpoints
8. **Dependency audit:** `npm audit --audit-level=high` clean before scheduling pen test

---

## §12 Drawer Readiness (Phase 3 status)

None of the drawers are unlocked. Do not build them until conditions are met.

| Drawer | Condition | Status |
|--------|-----------|--------|
| Monitored community (pods 3–4) | MRR funds ≥1 part-time moderator + report volume justifies it | ❌ Not met |
| Calendar→risk windows | Phase-0 data question resolved with counsel + validated signal + explicit opt-in | ❌ Not met |
| Device-level blocking | Off the table as a core build | 🚫 Never |
| Other addictions | Porn vertical proves model (sustained D30 + real MRR + waitlist demand) | ❌ Not met |
