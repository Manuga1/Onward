import type { CheckIn, Clock } from './types';

export interface StreakInput {
  checkIns: CheckIn[];
  memberId: string;
  partnershipStartedAt: Date;
  clock: Clock;
}

export interface StreakResult {
  streakDays: number;
  lastContactAt: Date | null;
}

/**
 * Compute the streak for a member within a partnership.
 *
 * Rules:
 * - Streak counts days the MEMBER checked in (Good, Shaky, OR Fell — all count).
 * - Fell is honest participation; it never breaks the streak.
 * - Partner silence never reduces this member's streak.
 * - Consecutive missed days (no check-in submitted) break the streak.
 * - On dead-partner re-match, the carried streak continues from this member's own history.
 */
export function computeStreak(input: StreakInput): StreakResult {
  const { checkIns, memberId, partnershipStartedAt, clock } = input;
  const now = clock.now();

  // Only this member's own check-ins count for their streak
  const mine = checkIns
    .filter(c => c.memberId === memberId)
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  if (mine.length === 0) {
    return { streakDays: 0, lastContactAt: null };
  }

  // Build a set of UTC date strings "YYYY-MM-DD" for days with a check-in
  const checkedInDays = new Set<string>();
  for (const c of mine) {
    checkedInDays.add(utcDateStr(c.at));
  }

  // Walk backwards from today, counting consecutive days with a check-in
  let streak = 0;
  const todayStr = utcDateStr(now);
  const current = new Date(now);

  // Allow today's check-in window to not count as a miss yet
  for (let i = 0; i < 365; i++) {
    const dayStr = utcDateStr(current);
    // Skip future days
    if (dayStr > todayStr) {
      current.setUTCDate(current.getUTCDate() - 1);
      continue;
    }
    if (checkedInDays.has(dayStr)) {
      streak++;
    } else if (dayStr === todayStr) {
      // Today's window may still be open — don't break streak yet
    } else {
      // A past day with no check-in breaks the streak
      break;
    }
    current.setUTCDate(current.getUTCDate() - 1);
  }

  const lastCheckin = mine[mine.length - 1];
  return { streakDays: streak, lastContactAt: lastCheckin.at };
}

function utcDateStr(d: Date): string {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * When a member is re-matched (partner went dark), carry their streak forward.
 * The existing streak days are preserved; the new partnership starts with the carried value.
 */
export function carryStreakToNewPartnership(
  existingStreak: number
): number {
  return existingStreak;
}

export const PARTNER_DARK_THRESHOLD_DAYS = 3;
