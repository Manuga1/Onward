# Architecture Decisions

> Record non-obvious choices here with a one-line rationale.

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | MIN_POD_SIZE = 2 for egg pods | A pair is the smallest meaningful accountability unit; 1 alone can't form a pod |
| 2 | TARGET_POD_SIZE = 5 | Spec says ~5; balances density (enough choices) with intimacy (not too many) |
| 3 | Greedy intensity-sorted pod assembly | Good enough for Phase 1 pilot; optimize with scoring later if matching quality needs it |
| 4 | Streak counts member's own check-ins only, not partner's | Spec explicit: partner silence never punishes the member |
| 5 | `isMissed` returns false if window is still open | Server time is authoritative; don't mark a miss until the window definitively closes |
| 6 | Two-way block stored as two rows | O(1) lookup in either direction; storage cost is negligible |
| 7 | `carryStreakToNewPartnership` is a passthrough function | Explicit function makes the carry behavior visible and testable vs implicit behavior |
| 8 | localToUtc uses Intl.DateTimeFormat for DST-aware conversion | Native, no dep, handles all IANA tz strings correctly including DST transitions |
| 9 | MatchResult limited to {memberId, partnerId, isTriple?} | Spec: output must not leak rejection or who picked whom |
| 10 | Stub verification adapter always returns passed=true | Dev/test only; clearly marked HUMAN-OWNED for replacement before launch |
