# Onward Data Map

> Generated from §4 of CLAUDE.md. Keep this current — it makes legal review cheap.
> Last updated: 2024-01 (Phase 0)

## Policy legend

| Symbol | Meaning |
|--------|---------|
| ✅ Store | Stored in Supabase DB |
| 🔐 Encrypted | App-layer field encryption (KMS-backed) in addition to at-rest |
| #️⃣ Hashed | One-way hash only; source never stored |
| ❌ Never | Never collected or stored anywhere |
| ⏱️ Retention | How long the data is kept |

---

## Member

| Field | Policy | Notes |
|-------|--------|-------|
| `memberId` | ✅ Store | Opaque UUID. No connection to real identity. |
| `codename` | ✅ Store | System-generated (e.g., "Cedar-4471"). Display name only. |
| `phone` | ✅ Store 🔐 Encrypted | Needed for OTP + nudges. Also store `phoneHash` for uniqueness. |
| `phoneHash` | #️⃣ Hashed | One-way SHA-256. Used to detect duplicate accounts. Source never stored. |
| `email` | ✅ Store 🔐 Encrypted (optional) | Recovery only. Never required. |
| Real name | ❌ Never | Lives only inside verification vendor (Stripe Identity). We never receive it. |
| Date of birth | ❌ Never | Same as above. We receive only a pass/fail boolean. |
| ID image | ❌ Never | Purged by vendor immediately after check. Never transmitted to us. |
| Selfie / liveness | ❌ Never | Same as above. |
| `verifiedAt` | ✅ Store | Timestamp of verification pass. |
| `verifierTxnId` | ✅ Store | Vendor transaction ID for audit trail only. Opaque string. |
| `uniquenessHash` | #️⃣ Hashed | One-way hash derived from verified identity. Makes re-registration detectable. |
| Emergency contact | ❌ Never | Not collected, not stored, not solicited. |
| Close contact | ❌ Never | Same. |
| `fight` | ✅ Store | Enum: `Porn`. Drives matching. |
| `gender` | ✅ Store | Enum: `Male \| Female \| NonBinary`. Drives same-gender pools. |
| `intensity` | ✅ Store | Enum: `Occasional \| Regular \| Daily \| MultipleDaily`. |
| `stage` | ✅ Store | Enum: `Day1 \| Week1 \| ThirtyDays \| NinetyPlus`. Self-reported, mutable. |
| `timezone` | ✅ Store | IANA timezone string (e.g., "America/New_York"). |
| `faithPreference` | ✅ Store (optional) | Enum: `Secular \| FaithBased \| NoPreference`. Matching only. |

---

## CheckIn

| Field | Policy | Notes |
|-------|--------|-------|
| `checkInId` | ✅ Store | Opaque UUID. |
| `memberId` | ✅ Store | Foreign key to member. |
| `partnershipId` | ✅ Store | Foreign key to partnership. |
| `state` | ✅ Store 🔐 Encrypted | `Good \| Shaky \| Fell`. Field-encrypted — only the member and active partner can read. |
| `at` | ✅ Store | Timestamp of submission. Server time only. |
| `windowId` | ✅ Store | Which window this check-in belongs to. |
| Free-text journal | ❌ Never | No journal text stored server-side. Categorical only. |

**Retention:** ⏱️ HUMAN-OWNED — retention period TBD pending legal review. Recommended: 90 days rolling then anonymize to aggregate.

---

## Partnership

| Field | Policy | Notes |
|-------|--------|-------|
| `partnershipId` | ✅ Store | Opaque UUID. |
| `memberIds` | ✅ Store | Array of 2–3 member UUIDs. |
| `streakDays` | ✅ Store | Current streak count. |
| `lastContactAt` | ✅ Store | Last check-in timestamp. |
| `startedAt` | ✅ Store | Partnership creation time. |
| `isActive` | ✅ Store | Whether partnership is currently active. |

---

## Message

| Field | Policy | Notes |
|-------|--------|-------|
| `messageId` | ✅ Store | Opaque UUID. |
| `partnershipId` | ✅ Store | Scoped to the partnership. |
| `senderId` | ✅ Store | Member UUID. |
| `text` | ✅ Store 🔐 Encrypted | ≤280 chars. Text only — images are off. Server-readable for moderation. |
| `sentAt` | ✅ Store | Server timestamp. |
| Images / attachments | ❌ Never | Images are disabled entirely (CSAM/abuse surface). |

**Retention:** ⏱️ ~30 days rolling. Hard delete on partnership end or account deletion.

---

## Report

| Field | Policy | Notes |
|-------|--------|-------|
| `reportId` | ✅ Store | Opaque UUID. |
| `reporterId` | ✅ Store | Member UUID of the reporter. |
| `targetId` | ✅ Store | Member UUID of the reported person. |
| `category` | ✅ Store | Enum: `Harassment \| InappropriateContent \| PredatoryBehavior \| Spam \| Other`. |
| `requiresHumanEscalation` | ✅ Store | Boolean. True when PredatoryBehavior + possible minor. |
| `possibleMinorInvolved` | ✅ Store | Boolean. Triggers NCMEC consideration. HUMAN-OWNED. |
| `createdAt` | ✅ Store | Server timestamp. |

---

## Block

| Field | Policy | Notes |
|-------|--------|-------|
| `blockerId` | ✅ Store | Member UUID. |
| `blockedId` | ✅ Store | Member UUID. |
| `createdAt` | ✅ Store | Server timestamp. |

Both directions stored for efficient lookup.

---

## Notification Log

| Field | Policy | Notes |
|-------|--------|-------|
| `type` | ✅ Store | Event type (opaque enum). |
| `at` | ✅ Store | Server timestamp. |

**Retention:** ⏱️ Ephemeral. Purge after 30 days.

---

## EggPod

| Field | Policy | Notes |
|-------|--------|-------|
| `podId` | ✅ Store | Opaque UUID. |
| `memberIds` | ✅ Store | Array of member UUIDs. |
| `fight` | ✅ Store | Enum value used for assembly. |
| `gender` | ✅ Store | Enum value used for assembly. |
| `startedAt` | ✅ Store | Pod creation timestamp. |
| `endsAt` | ✅ Store | Pod expiry (startedAt + 7 days). |

---

## What we deliberately do NOT collect

- Legal names
- Dates of birth
- Government ID images or numbers
- Selfies or biometric data
- Emergency contacts
- Location beyond timezone (no GPS, no city)
- Free-text journal entries (server-side)
- Browsing history or device identifiers beyond what Next.js/Vercel require for PWA

---

## Analytics (PostHog)

Behavioral events only. Opaque IDs only. No PII, no fight values, no check-in content.

PostHog autocapture is **OFF** on: onboarding screens, check-in screens, chat screens.

Events collected:
- `signup_started`, `signup_completed` — no personal data
- `verify_started`, `verify_passed` — no personal data
- `egg_joined`, `partner_matched` — opaque IDs only
- `checkin_submitted` — opaque IDs + state enum only (Fell/Good/Shaky)
- `streak_milestone` — opaque ID + day count

---

## Error Reporting (Sentry)

`beforeSend` hook strips:
- All PII fields
- `fight` values
- Message content
- Phone/email
- Any free-text user input

Only opaque IDs and stack traces reach Sentry.

---

*HUMAN-OWNED: Final retention periods must be set after legal counsel reviews applicable law (CCPA, BIPA, etc.). Do not finalize these periods without that review.*
