# Onward — Master Build Spec (CLAUDE.md)

> Single source of truth. Where explicit, follow exactly. Where silent, follow §1 and record
> decisions in `docs/DECISIONS.md`. Items tagged **HUMAN-OWNED** require human input — stop and surface.

---

## 0. What Onward is

Onward is a chosen, double-opt-in, **anonymous** 1-on-1 accountability product for people recovering
from compulsive porn use. The differentiator is **human accountability that can't be silently
deleted**. People meet in a same-gender cohort ("egg"), talk for a week, then choose each other;
mutual choice creates a partnership whose daily heartbeat is a check-in and a shared streak.

Audience: adults (18+), shame-loaded, often isolated, skewing male. Tone: **warm companion, never
clinical-cold, never bro-coach**.

---

## 1. Operating principles

1. **Minimize data above all.** Collect less, store less, retain shorter.
2. **Anonymity is sacred.** Identity = `memberId` + `codename`. No real names anywhere ever.
3. **Never improvise a HUMAN-OWNED surface.** Leave `// HUMAN-OWNED:` markers.
4. **Server time is authoritative.** Inject `Clock`; never trust client timestamps.
5. **Test the logic that matters.** All domain rules ship with exhaustive unit tests.
6. **No sensitive data in logs/analytics/errors.** Opaque IDs only.
7. **Record decisions, don't stall.** Log in `docs/DECISIONS.md` and continue.

---

## 2. Hard constraints

- 18+ only. Hard age gate; no path around it.
- No real names stored or displayed anywhere. Codenames only.
- Verification artifacts never retained — keep only pass boolean, verifierTxnId, uniquenessHash.
- Notifications never escalate beyond explicitly chosen partner/pod.
- No free-text journals server-side. Categorical enums only.
- Partner chat: text-only, images OFF, in-app, server-readable, ~30-day rolling retention.
- `Fell` check-in never breaks a streak. Only silence does.
- US-only at launch. Crisis resources hard-coded to US lines.
- Every check-in/miss/streak/window computation is server-time authoritative.

---

## 3. Architecture & stack (locked)

- **Platform:** Web PWA — Next.js (App Router) + TypeScript, strict mode
- **DB/Auth:** Supabase (Postgres + Auth, phone OTP) + Row-Level Security on every table
- **Identity verification:** Stripe Identity — **HUMAN-OWNED** — scaffold behind interface only
- **SMS/email:** Twilio (OTP + nudge fallback), Resend (transactional email)
- **Push:** OneSignal (web push + SMS-fallback)
- **Payments:** Stripe (web, no app-store cut)
- **Analytics:** PostHog (autocapture OFF on sensitive screens)
- **Errors:** Sentry with `beforeSend` scrubber stripping all PII
- **Design:** teal/sand/recovery-green; Spectral/Inter/IBM Plex Mono; WCAG 2.1 AA; dark mode; Lucide icons

### Repo layout
```
/app            Next.js routes (PWA shell, onboarding, egg room, daily loop, settings)
/packages/core  Pure domain logic (NO infra imports) — matching, streak, checkin, eggPhase, types, trustsafety
/lib            Infra adapters behind interfaces (db, auth, sms, push, verify, payments)
/db             Supabase migrations + RLS policies
/docs           DECISIONS.md, DATA-MAP.md, SECURITY.md, RUNBOOK.md
/tests          unit (vitest) + e2e (playwright)
```

## 4. Data model

| Entity | Field | Policy |
|---|---|---|
| Member | `memberId` | store (opaque uuid) |
| Member | `codename` | store (system-generated, e.g. "Cedar-4471") |
| Member | `phone` | store **encrypted** + `phoneHash` for uniqueness |
| Member | `email` | optional, store encrypted (recovery only) |
| Member | real name / DOB / ID image / selfie | **never** |
| Member | emergency contact | **never collect** |
| Member | `fight` | store (enum) |
| Member | `gender` | store (enum) |
| Member | `intensity` | store (enum) |
| Member | `stage` | store (enum, mutable) |
| Member | `timezone` | store (IANA string) |
| Member | `faithPreference` | optional enum |
| CheckIn | `state` `Good\|Shaky\|Fell`, `at`, `windowId` | store, field-encrypt `state` history |
| Partnership | `streakDays`, `lastContactAt`, members | store |
| Message | text ≤280 chars | store **encrypted**, 30-day rolling retention |
| Report | category, target, `requiresHumanEscalation` | store |
| Notification log | type, at | ephemeral, purge after 30 days |

## 7. Domain logic specs (build in /packages/core, fully tested)

### eggPhase.ts
`assembleEggPods(queue, now) → { pods, leftover }`. Hard filter: same gender + fight. Scoring: intensity similarity, timezone offset bonus (cross-tz preferred). Pod size ~5. `EGG_DURATION_DAYS = 7`.

### matching.ts
`matchPartners(pod, picks, now) → MatchResult[]`. Degradation ladder: (a) mutual top pick → (b) any mutual pick → (c) one-directional best → (d) system pair. Odd member → trio or carry. Output **must not** reveal rejection or who picked whom.

### streak.ts
`Fell` = honest = streak survives. Partner silence doesn't reduce my streak. Dead-partner re-match carries streak gracefully.

### checkin.ts
`CHECKIN_WINDOW_HOURS = 2`. `NOTIFY_GRACE_MINUTES = 45`. DST-aware. Miss = silence within window only. `RematchRecommended` always asks member first.

### trustsafety.ts
`PredatoryBehavior` + possible minor → `requiresHumanEscalation = true`. // HUMAN-OWNED: NCMEC duties.

**Required test cases:** odd-member-out in matching; relapse-keeps-streak; partner-silence-doesn't-punish-me; window math across DST; miss vs honest `Fell`; degradation ladder leaves no one unmatched; matching output leaks no rejection.

## 8. Conventions
Strict TS, no `any` in exported signatures. Inject `Clock` and randomness for determinism. Vitest units. Conventional commits.
