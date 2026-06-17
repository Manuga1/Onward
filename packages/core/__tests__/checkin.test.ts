import { describe, it, expect } from 'vitest';
import {
  getWindowBounds,
  isWithinWindow,
  isMissed,
  getNotificationTriggerTime,
  getCheckInEvents,
  CHECKIN_WINDOW_HOURS,
  NOTIFY_GRACE_MINUTES,
  PARTNER_DARK_DAYS_THRESHOLD,
} from '../checkin';
import type { CheckIn, Clock } from '../types';

function makeClock(iso: string): Clock {
  return { now: () => new Date(iso) };
}

function makeCheckIn(memberId: string, at: string): CheckIn {
  return {
    checkInId: `ci_${Math.random()}`,
    memberId,
    partnershipId: 'p1',
    state: 'Good',
    windowId: 'w1',
    at: new Date(at),
  };
}

describe('getWindowBounds', () => {
  it('returns a 2-hour window', () => {
    const bounds = getWindowBounds(20, 'America/New_York', new Date('2024-01-15T12:00:00Z'));
    const durationMs = bounds.end.getTime() - bounds.start.getTime();
    expect(durationMs).toBe(CHECKIN_WINDOW_HOURS * 60 * 60 * 1000);
  });

  it('window start reflects the local hour in the given timezone', () => {
    // America/New_York in winter is UTC-5
    const ref = new Date('2024-01-15T00:00:00Z'); // some reference
    const bounds = getWindowBounds(20, 'America/New_York', ref);
    // 20:00 ET (winter) = 01:00 UTC next day
    const utcHour = bounds.start.getUTCHours();
    // UTC-5 offset: 20 + 5 = 25 = 01 next day
    expect(utcHour).toBe(1);
  });

  it('accounts for DST: America/New_York spring-forward', () => {
    // In summer, NY is UTC-4
    const summerRef = new Date('2024-07-15T00:00:00Z');
    const winterRef = new Date('2024-01-15T00:00:00Z');
    const summerBounds = getWindowBounds(20, 'America/New_York', summerRef);
    const winterBounds = getWindowBounds(20, 'America/New_York', winterRef);
    // Summer: 20:00 ET (UTC-4) = 00:00 UTC; Winter: 20:00 ET (UTC-5) = 01:00 UTC
    // They should differ by 1 hour
    const diffHours =
      (winterBounds.start.getUTCHours() - summerBounds.start.getUTCHours() + 24) % 24;
    expect(diffHours).toBe(1);
  });
});

describe('isWithinWindow', () => {
  it('returns true when now is within the window', () => {
    const bounds = getWindowBounds(20, 'America/New_York', new Date('2024-01-15T00:00:00Z'));
    const duringWindow = new Date(bounds.start.getTime() + 30 * 60 * 1000); // 30 min in
    expect(isWithinWindow(bounds, duringWindow)).toBe(true);
  });

  it('returns false before window opens', () => {
    const bounds = getWindowBounds(20, 'America/New_York', new Date('2024-01-15T00:00:00Z'));
    const before = new Date(bounds.start.getTime() - 1000);
    expect(isWithinWindow(bounds, before)).toBe(false);
  });

  it('returns false after window closes', () => {
    const bounds = getWindowBounds(20, 'America/New_York', new Date('2024-01-15T00:00:00Z'));
    const after = new Date(bounds.end.getTime() + 1000);
    expect(isWithinWindow(bounds, after)).toBe(false);
  });
});

describe('isMissed', () => {
  it('returns false when window is still open', () => {
    const bounds = getWindowBounds(20, 'America/New_York', new Date('2024-01-15T00:00:00Z'));
    const duringWindow = new Date(bounds.start.getTime() + 30 * 60 * 1000);
    expect(isMissed(bounds, undefined, duringWindow)).toBe(false);
  });

  it('returns true when window closed and no check-in submitted', () => {
    const bounds = getWindowBounds(20, 'America/New_York', new Date('2024-01-15T00:00:00Z'));
    const afterWindow = new Date(bounds.end.getTime() + 60 * 1000);
    expect(isMissed(bounds, undefined, afterWindow)).toBe(true);
  });

  it('returns false for Fell check-in even after window closes (miss vs honest Fell)', () => {
    const bounds = getWindowBounds(20, 'America/New_York', new Date('2024-01-15T00:00:00Z'));
    const afterWindow = new Date(bounds.end.getTime() + 60 * 1000);
    const fellCheckIn: CheckIn = {
      checkInId: 'ci1',
      memberId: 'm1',
      partnershipId: 'p1',
      state: 'Fell',
      windowId: 'w1',
      at: bounds.start,
    };
    expect(isMissed(bounds, fellCheckIn, afterWindow)).toBe(false); // Fell ≠ miss
  });

  it('returns false for Good check-in after window closes', () => {
    const bounds = getWindowBounds(20, 'America/New_York', new Date('2024-01-15T00:00:00Z'));
    const afterWindow = new Date(bounds.end.getTime() + 60 * 1000);
    const goodCheckIn: CheckIn = {
      checkInId: 'ci1',
      memberId: 'm1',
      partnershipId: 'p1',
      state: 'Good',
      windowId: 'w1',
      at: bounds.start,
    };
    expect(isMissed(bounds, goodCheckIn, afterWindow)).toBe(false);
  });
});

describe('getNotificationTriggerTime', () => {
  it('is NOTIFY_GRACE_MINUTES after window end', () => {
    const bounds = getWindowBounds(20, 'America/New_York', new Date('2024-01-15T00:00:00Z'));
    const trigger = getNotificationTriggerTime(bounds);
    const diffMs = trigger.getTime() - bounds.end.getTime();
    expect(diffMs).toBe(NOTIFY_GRACE_MINUTES * 60 * 1000);
  });
});

describe('getCheckInEvents', () => {
  it('emits PartnerNotification after a missed window + grace period', () => {
    const ref = new Date('2024-01-15T00:00:00Z');
    const bounds = getWindowBounds(20, 'America/New_York', ref);
    const notifyTime = getNotificationTriggerTime(bounds);
    const afterGrace = new Date(notifyTime.getTime() + 1000);

    const events = getCheckInEvents({
      memberId: 'm1',
      partnershipId: 'p1',
      partnerId: 'partner1',
      windows: [{ window: bounds, checkIn: undefined }],
      clock: makeClock(afterGrace.toISOString()),
    });

    const notifyEvents = events.filter(e => e.type === 'PartnerNotification');
    expect(notifyEvents.length).toBeGreaterThan(0);
    expect(notifyEvents[0].memberId).toBe('partner1'); // sent TO partner
  });

  it('does NOT emit PartnerNotification during grace period (before trigger time)', () => {
    const ref = new Date('2024-01-15T00:00:00Z');
    const bounds = getWindowBounds(20, 'America/New_York', ref);
    const justAfterClose = new Date(bounds.end.getTime() + 1000); // before grace expires

    const events = getCheckInEvents({
      memberId: 'm1',
      partnershipId: 'p1',
      partnerId: 'partner1',
      windows: [{ window: bounds, checkIn: undefined }],
      clock: makeClock(justAfterClose.toISOString()),
    });

    const notifyEvents = events.filter(e => e.type === 'PartnerNotification');
    expect(notifyEvents).toHaveLength(0);
  });

  it('emits RematchRecommended after PARTNER_DARK_DAYS_THRESHOLD consecutive misses', () => {
    const windows = Array.from({ length: PARTNER_DARK_DAYS_THRESHOLD + 1 }, (_, i) => {
      const ref = new Date(Date.UTC(2024, 0, 10 + i));
      return { window: getWindowBounds(20, 'UTC', ref), checkIn: undefined };
    });
    // Move clock well past all windows + grace
    const lastEnd = windows[windows.length - 1].window.end;
    const afterAll = new Date(lastEnd.getTime() + (NOTIFY_GRACE_MINUTES + 60) * 60 * 1000);

    const events = getCheckInEvents({
      memberId: 'm1',
      partnershipId: 'p1',
      partnerId: 'partner1',
      windows,
      clock: makeClock(afterAll.toISOString()),
    });

    const rematch = events.filter(e => e.type === 'RematchRecommended');
    expect(rematch.length).toBeGreaterThan(0);
    expect(rematch[0].memberId).toBe('m1'); // RematchRecommended goes TO the member to ask them
  });

  it('does NOT emit RematchRecommended when check-ins are present (no consecutive misses)', () => {
    const ref = new Date('2024-01-15T00:00:00Z');
    const bounds = getWindowBounds(20, 'UTC', ref);
    const afterWindow = new Date(bounds.end.getTime() + (NOTIFY_GRACE_MINUTES + 60) * 60 * 1000);
    const checkIn = makeCheckIn('m1', bounds.start.toISOString());

    const events = getCheckInEvents({
      memberId: 'm1',
      partnershipId: 'p1',
      partnerId: 'partner1',
      windows: [{ window: bounds, checkIn }],
      clock: makeClock(afterWindow.toISOString()),
    });

    expect(events.filter(e => e.type === 'RematchRecommended')).toHaveLength(0);
  });
});
