import type { CheckIn, CheckInState, Clock, DomainEvent, Partnership } from './types';

export const CHECKIN_WINDOW_HOURS = 2;
export const NOTIFY_GRACE_MINUTES = 45;
export const PARTNER_DARK_DAYS_THRESHOLD = 3;

export interface WindowBounds {
  start: Date;
  end: Date;
}

/**
 * Compute the check-in window bounds for a given local hour in the member's timezone.
 * Window is [localHour:00, localHour:00 + CHECKIN_WINDOW_HOURS).
 * DST-aware: uses the member's IANA timezone string.
 */
export function getWindowBounds(
  localHour: number, // 0-23, the hour the member chose
  timezone: string,
  referenceDate: Date // the calendar day (in member's tz) to compute for
): WindowBounds {
  // Find the UTC time that corresponds to localHour:00 on the reference date
  const dateStr = toLocalDateString(referenceDate, timezone);
  const start = localToUtc(`${dateStr}T${String(localHour).padStart(2, '0')}:00:00`, timezone);
  const end = new Date(start.getTime() + CHECKIN_WINDOW_HOURS * 60 * 60 * 1000);
  return { start, end };
}

export function isWithinWindow(window: WindowBounds, now: Date): boolean {
  return now >= window.start && now < window.end;
}

export function isWindowClosed(window: WindowBounds, now: Date): boolean {
  return now >= window.end;
}

/**
 * Determine if a check-in for a window was missed.
 * A miss = no check-in submitted AND the window is closed.
 * An explicit Fell is NOT a miss — it's honest participation.
 */
export function isMissed(
  window: WindowBounds,
  submitted: CheckIn | undefined,
  now: Date
): boolean {
  if (!isWindowClosed(window, now)) return false; // window still open
  if (submitted) return false; // any submission (including Fell) = not missed
  return true;
}

/**
 * Get the notification trigger time: window end + NOTIFY_GRACE_MINUTES.
 * The PartnerNotification event fires at this time if the window was missed.
 */
export function getNotificationTriggerTime(window: WindowBounds): Date {
  return new Date(window.end.getTime() + NOTIFY_GRACE_MINUTES * 60 * 1000);
}

export interface CheckInContext {
  memberId: string;
  partnershipId: string;
  partnerId: string;
  windows: Array<{ window: WindowBounds; checkIn?: CheckIn }>;
  clock: Clock;
}

/**
 * Evaluate domain events to emit based on check-in history.
 * Emits PartnerNotification after missed window + grace period.
 * Emits RematchRecommended after PARTNER_DARK_DAYS_THRESHOLD consecutive misses.
 *
 * NOTE: RematchRecommended always asks the MEMBER first — never auto-acts.
 */
export function getCheckInEvents(ctx: CheckInContext): DomainEvent[] {
  const { memberId, partnershipId, partnerId, windows, clock } = ctx;
  const now = clock.now();
  const events: DomainEvent[] = [];

  let consecutiveMisses = 0;
  let rematchAlreadyEmitted = false;

  for (const { window, checkIn } of windows) {
    const missed = isMissed(window, checkIn, now);
    if (missed) {
      consecutiveMisses++;
      const notifyAt = getNotificationTriggerTime(window);
      if (now >= notifyAt) {
        // Framed as "your partner could use support", not "failed"
        events.push({
          type: 'PartnerNotification',
          memberId: partnerId,
          partnershipId,
          at: notifyAt,
          meta: { forMemberId: memberId },
        });
      }
    } else {
      consecutiveMisses = 0;
    }

    if (consecutiveMisses >= PARTNER_DARK_DAYS_THRESHOLD && !rematchAlreadyEmitted) {
      // Ask the member — never auto-rematch
      events.push({
        type: 'RematchRecommended',
        memberId,
        partnershipId,
        at: now,
        meta: { consecutiveMissesByPartner: consecutiveMisses },
      });
      rematchAlreadyEmitted = true;
    }
  }

  return events;
}

// DST-aware helpers

function toLocalDateString(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { // 'en-CA' gives YYYY-MM-DD
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function localToUtc(localIso: string, timezone: string): Date {
  // Parse "YYYY-MM-DDTHH:mm:ss" in the given timezone and return UTC Date
  // Strategy: use Intl to find the offset at that local time
  const naive = new Date(localIso + 'Z'); // treat as UTC first

  // Find offset by formatting this UTC time in the target zone and comparing
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(naive);

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0';
  const localYear = parseInt(get('year'));
  const localMonth = parseInt(get('month')) - 1;
  const localDay = parseInt(get('day'));
  const localHour = parseInt(get('hour'));
  const localMinute = parseInt(get('minute'));
  const localSecond = parseInt(get('second'));

  // Build local time we want
  const wantedParts = localIso.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)!;
  const wYear = parseInt(wantedParts[1]);
  const wMonth = parseInt(wantedParts[2]) - 1;
  const wDay = parseInt(wantedParts[3]);
  const wHour = parseInt(wantedParts[4]);
  const wMinute = parseInt(wantedParts[5]);
  const wSecond = parseInt(wantedParts[6]);

  // Offset in ms: naive UTC → local time difference
  const localAsUtc = Date.UTC(localYear, localMonth, localDay, localHour, localMinute, localSecond);
  const wantedLocal = Date.UTC(wYear, wMonth, wDay, wHour, wMinute, wSecond);
  const offsetMs = wantedLocal - localAsUtc;

  return new Date(naive.getTime() + offsetMs);
}
