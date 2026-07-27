import type { Clock } from './types';

/**
 * Check-in time optimizer.
 *
 * PRIVACY: this module only ever sees anonymous free/busy blocks — never event
 * titles, locations, or attendees. Calendar parsing/stripping happens on-device
 * (see lib/schedule/ics.ts) before anything reaches here or the server.
 *
 * Pure + deterministic: no I/O, inject a Clock for "today".
 */

export interface BusyBlock {
  start: Date;
  end: Date;
}

export interface OptimizerPrefs {
  earliestHour: number;  // earliest acceptable check-in hour (waking), inclusive
  latestHour: number;    // latest acceptable hour to START a check-in, inclusive
  preferredHour: number; // ideal center of day (e.g. evening wind-down)
  slotMinutes: number;   // granularity + occupancy length to test against calendar
}

export const DEFAULT_PREFS: OptimizerPrefs = {
  earliestHour: 8,
  latestHour: 22,
  preferredHour: 20,
  slotMinutes: 30,
};

export interface DailyRecommendation {
  /** Local calendar date, YYYY-MM-DD */
  date: string;
  hour: number;
  minute: number;
}

// ---- helpers ---------------------------------------------------------------

function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Candidate start-of-slot offsets (minutes from midnight), ordered by closeness to preferred. */
function candidateMinutes(prefs: OptimizerPrefs): number[] {
  const out: number[] = [];
  const start = prefs.earliestHour * 60;
  const end = prefs.latestHour * 60;
  for (let m = start; m <= end; m += prefs.slotMinutes) out.push(m);
  const preferred = prefs.preferredHour * 60;
  return out.sort((a, b) => Math.abs(a - preferred) - Math.abs(b - preferred));
}

/** Is the [minuteOfDay, +slot) window on `date` free of all busy blocks? */
function isSlotFree(date: Date, minuteOfDay: number, slotMinutes: number, busy: BusyBlock[]): boolean {
  const slotStart = new Date(date);
  slotStart.setHours(0, 0, 0, 0);
  slotStart.setMinutes(minuteOfDay);
  const slotEnd = new Date(slotStart.getTime() + slotMinutes * 60_000);
  for (const b of busy) {
    // overlap if slotStart < b.end && slotEnd > b.start
    if (slotStart < b.end && slotEnd > b.start) return false;
  }
  return true;
}

function upcomingDates(clock: Clock, horizonDays: number): Date[] {
  const today = new Date(clock.now());
  today.setHours(0, 0, 0, 0);
  const dates: Date[] = [];
  for (let i = 0; i < horizonDays; i++) {
    dates.push(new Date(today.getTime() + i * 86_400_000));
  }
  return dates;
}

// ---- public API ------------------------------------------------------------

/**
 * A single recurring time the member is most consistently free — best for
 * habit formation. Scores each candidate slot by how many of the next
 * `horizonDays` days it is free, tie-broken by closeness to the preferred hour.
 */
export function computeConsistentTime(
  busy: BusyBlock[],
  clock: Clock,
  prefs: OptimizerPrefs = DEFAULT_PREFS,
  horizonDays = 14,
): { hour: number; minute: number } {
  const dates = upcomingDates(clock, horizonDays);
  const candidates = candidateMinutes(prefs);
  const preferred = prefs.preferredHour * 60;

  let bestMinute = preferred;
  let bestFree = -1;
  let bestDistance = Infinity;

  for (const minute of candidates) {
    let free = 0;
    for (const date of dates) {
      if (isSlotFree(date, minute, prefs.slotMinutes, busy)) free++;
    }
    const distance = Math.abs(minute - preferred);
    if (free > bestFree || (free === bestFree && distance < bestDistance)) {
      bestFree = free;
      bestDistance = distance;
      bestMinute = minute;
    }
  }

  return { hour: Math.floor(bestMinute / 60), minute: bestMinute % 60 };
}

/**
 * A tailored time for each of the next `horizonDays` days: the free slot closest
 * to the preferred hour on that specific day. Falls back to the preferred hour
 * when the whole acceptable window is busy.
 */
export function computeDailyTimes(
  busy: BusyBlock[],
  clock: Clock,
  prefs: OptimizerPrefs = DEFAULT_PREFS,
  horizonDays = 14,
): DailyRecommendation[] {
  const dates = upcomingDates(clock, horizonDays);
  const candidates = candidateMinutes(prefs); // already ordered by closeness to preferred

  return dates.map(date => {
    let chosen = prefs.preferredHour * 60;
    for (const minute of candidates) {
      if (isSlotFree(date, minute, prefs.slotMinutes, busy)) {
        chosen = minute;
        break;
      }
    }
    return { date: localDateString(date), hour: Math.floor(chosen / 60), minute: chosen % 60 };
  });
}
