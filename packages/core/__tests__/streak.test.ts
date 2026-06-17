import { describe, it, expect } from 'vitest';
import { computeStreak, carryStreakToNewPartnership, PARTNER_DARK_THRESHOLD_DAYS } from '../streak';
import type { CheckIn, Clock } from '../types';

const PARTNERSHIP_ID = 'p1';
const MEMBER_ID = 'member1';
const PARTNER_ID = 'partner1';

function makeCheckIn(memberId: string, dateStr: string, state: 'Good' | 'Shaky' | 'Fell' = 'Good'): CheckIn {
  return {
    checkInId: `ci_${Math.random()}`,
    memberId,
    partnershipId: PARTNERSHIP_ID,
    state,
    windowId: `w_${dateStr}`,
    at: new Date(`${dateStr}T20:00:00Z`),
  };
}

function makeClock(isoDate: string): Clock {
  return { now: () => new Date(isoDate) };
}

describe('computeStreak', () => {
  it('returns 0 for no check-ins', () => {
    const result = computeStreak({
      checkIns: [],
      memberId: MEMBER_ID,
      partnershipStartedAt: new Date('2024-01-01Z'),
      clock: makeClock('2024-01-10T12:00:00Z'),
    });
    expect(result.streakDays).toBe(0);
    expect(result.lastContactAt).toBeNull();
  });

  it('counts consecutive check-in days as streak', () => {
    const checkIns = [
      makeCheckIn(MEMBER_ID, '2024-01-08'),
      makeCheckIn(MEMBER_ID, '2024-01-09'),
      makeCheckIn(MEMBER_ID, '2024-01-10'),
    ];
    const result = computeStreak({
      checkIns,
      memberId: MEMBER_ID,
      partnershipStartedAt: new Date('2024-01-01Z'),
      clock: makeClock('2024-01-10T23:00:00Z'),
    });
    expect(result.streakDays).toBe(3);
  });

  it('Fell check-in keeps the streak (relapse-keeps-streak)', () => {
    const checkIns = [
      makeCheckIn(MEMBER_ID, '2024-01-08', 'Good'),
      makeCheckIn(MEMBER_ID, '2024-01-09', 'Fell'), // honest relapse
      makeCheckIn(MEMBER_ID, '2024-01-10', 'Good'),
    ];
    const result = computeStreak({
      checkIns,
      memberId: MEMBER_ID,
      partnershipStartedAt: new Date('2024-01-01Z'),
      clock: makeClock('2024-01-10T23:00:00Z'),
    });
    expect(result.streakDays).toBe(3); // Fell did NOT break streak
  });

  it('Shaky check-in keeps the streak', () => {
    const checkIns = [
      makeCheckIn(MEMBER_ID, '2024-01-08', 'Good'),
      makeCheckIn(MEMBER_ID, '2024-01-09', 'Shaky'),
      makeCheckIn(MEMBER_ID, '2024-01-10', 'Good'),
    ];
    const result = computeStreak({
      checkIns,
      memberId: MEMBER_ID,
      partnershipStartedAt: new Date('2024-01-01Z'),
      clock: makeClock('2024-01-10T23:00:00Z'),
    });
    expect(result.streakDays).toBe(3);
  });

  it('partner silence does NOT punish my streak (partner-silence-doesnt-punish-me)', () => {
    // Only member's own check-ins count; partner has none
    const checkIns = [
      makeCheckIn(MEMBER_ID, '2024-01-08', 'Good'),
      makeCheckIn(MEMBER_ID, '2024-01-09', 'Good'),
      makeCheckIn(MEMBER_ID, '2024-01-10', 'Good'),
      // Partner PARTNER_ID has zero check-ins — should not affect my streak
    ];
    const result = computeStreak({
      checkIns,
      memberId: MEMBER_ID,
      partnershipStartedAt: new Date('2024-01-01Z'),
      clock: makeClock('2024-01-10T23:00:00Z'),
    });
    expect(result.streakDays).toBe(3);
  });

  it('a gap in my check-ins breaks the streak', () => {
    const checkIns = [
      makeCheckIn(MEMBER_ID, '2024-01-06', 'Good'),
      makeCheckIn(MEMBER_ID, '2024-01-07', 'Good'),
      // Gap on Jan 8
      makeCheckIn(MEMBER_ID, '2024-01-09', 'Good'),
      makeCheckIn(MEMBER_ID, '2024-01-10', 'Good'),
    ];
    const result = computeStreak({
      checkIns,
      memberId: MEMBER_ID,
      partnershipStartedAt: new Date('2024-01-01Z'),
      clock: makeClock('2024-01-10T23:00:00Z'),
    });
    expect(result.streakDays).toBe(2); // only Jan 9 + Jan 10 consecutive
  });

  it('returns lastContactAt as the most recent check-in time', () => {
    const last = makeCheckIn(MEMBER_ID, '2024-01-10', 'Good');
    const checkIns = [makeCheckIn(MEMBER_ID, '2024-01-09'), last];
    const result = computeStreak({
      checkIns,
      memberId: MEMBER_ID,
      partnershipStartedAt: new Date('2024-01-01Z'),
      clock: makeClock('2024-01-10T23:00:00Z'),
    });
    expect(result.lastContactAt?.toISOString()).toBe(last.at.toISOString());
  });
});

describe('carryStreakToNewPartnership', () => {
  it('carries the existing streak value when re-matched', () => {
    expect(carryStreakToNewPartnership(42)).toBe(42);
    expect(carryStreakToNewPartnership(0)).toBe(0);
  });
});

describe('PARTNER_DARK_THRESHOLD_DAYS', () => {
  it('is defined and positive', () => {
    expect(PARTNER_DARK_THRESHOLD_DAYS).toBeGreaterThan(0);
  });
});
