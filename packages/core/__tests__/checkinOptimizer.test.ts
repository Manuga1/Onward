import { describe, it, expect } from 'vitest';
import {
  computeConsistentTime,
  computeDailyTimes,
  DEFAULT_PREFS,
  type BusyBlock,
} from '../checkinOptimizer';
import type { Clock } from '../types';

// Fixed "today" = Mon 2026-01-05 00:00 local
const fixedClock: Clock = { now: () => new Date(2026, 0, 5, 0, 0, 0) };

function at(dayOffset: number, hour: number, minute = 0): Date {
  return new Date(2026, 0, 5 + dayOffset, hour, minute, 0);
}

describe('computeConsistentTime', () => {
  it('returns the preferred hour when the calendar is completely free', () => {
    const { hour, minute } = computeConsistentTime([], fixedClock, DEFAULT_PREFS);
    expect(hour).toBe(DEFAULT_PREFS.preferredHour);
    expect(minute).toBe(0);
  });

  it('avoids a time that is busy every single day', () => {
    // Busy 20:00-20:30 on all 14 days → optimizer must not pick 20:00
    const busy: BusyBlock[] = [];
    for (let d = 0; d < 14; d++) busy.push({ start: at(d, 20, 0), end: at(d, 20, 30) });

    const { hour, minute } = computeConsistentTime(busy, fixedClock, DEFAULT_PREFS);
    expect(hour * 60 + minute).not.toBe(20 * 60);
  });

  it('picks the free slot closest to preferred when preferred is blocked', () => {
    // Block 19:30-20:30 daily → closest free slots are 19:00 or 20:30 (30 min away).
    const busy: BusyBlock[] = [];
    for (let d = 0; d < 14; d++) busy.push({ start: at(d, 19, 30), end: at(d, 20, 30) });

    const { hour, minute } = computeConsistentTime(busy, fixedClock, DEFAULT_PREFS);
    const chosen = hour * 60 + minute;
    expect([19 * 60, 20 * 60 + 30]).toContain(chosen);
  });

  it('stays within the acceptable waking window', () => {
    const busy: BusyBlock[] = [];
    for (let d = 0; d < 14; d++) busy.push({ start: at(d, 20, 0), end: at(d, 20, 30) });
    const { hour } = computeConsistentTime(busy, fixedClock, DEFAULT_PREFS);
    expect(hour).toBeGreaterThanOrEqual(DEFAULT_PREFS.earliestHour);
    expect(hour).toBeLessThanOrEqual(DEFAULT_PREFS.latestHour);
  });
});

describe('computeDailyTimes', () => {
  it('produces one recommendation per day in the horizon', () => {
    const recs = computeDailyTimes([], fixedClock, DEFAULT_PREFS, 7);
    expect(recs).toHaveLength(7);
    expect(recs[0].date).toBe('2026-01-05');
    expect(recs[6].date).toBe('2026-01-11');
  });

  it('gives different times on different days based on that day\'s calendar', () => {
    // Day 0 blocked at preferred 20:00; day 1 free.
    const busy: BusyBlock[] = [{ start: at(0, 19, 30), end: at(0, 21, 0) }];
    const recs = computeDailyTimes(busy, fixedClock, DEFAULT_PREFS, 2);

    const day0 = recs[0].hour * 60 + recs[0].minute;
    const day1 = recs[1].hour * 60 + recs[1].minute;
    expect(day1).toBe(20 * 60);      // free → preferred
    expect(day0).not.toBe(20 * 60);  // blocked → shifted
  });

  it('falls back to the preferred hour when the whole window is busy', () => {
    // Block the entire 08:00-22:00 acceptable window on day 0.
    const busy: BusyBlock[] = [{ start: at(0, 7, 0), end: at(0, 23, 0) }];
    const recs = computeDailyTimes(busy, fixedClock, DEFAULT_PREFS, 1);
    expect(recs[0].hour).toBe(DEFAULT_PREFS.preferredHour);
    expect(recs[0].minute).toBe(0);
  });
});
