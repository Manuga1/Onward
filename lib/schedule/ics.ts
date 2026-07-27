/**
 * Minimal iCalendar (.ics) parser — runs ON-DEVICE only.
 *
 * PRIVACY: extracts ONLY event start/end times. Titles (SUMMARY), locations,
 * descriptions, and attendees are never read or returned. The output is a list
 * of anonymous busy blocks; nothing that could identify a person or event
 * leaves the browser.
 *
 * Scope: handles single events and weekly/daily RRULE recurrences within a
 * horizon (covers the vast majority of real calendars). Unsupported recurrence
 * rules are included as their first occurrence only — a safe, conservative
 * approximation for a check-in-time heuristic.
 */

import type { BusyBlock } from '@/packages/core';

// Unfold folded lines (RFC 5545: continuation lines start with space/tab).
function unfold(raw: string): string[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

// Parse an ICS date/date-time value into a local Date.
// Handles: 20260105T190000Z (UTC), 20260105T190000 (local/floating), 20260105 (all-day).
function parseIcsDate(value: string): Date | null {
  const v = value.trim();
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss, z] = m;
  if (hh === undefined) {
    // All-day: treat as local midnight
    return new Date(Number(y), Number(mo) - 1, Number(d));
  }
  if (z) {
    return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), Number(ss)));
  }
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), Number(ss));
}

function getPropValue(line: string): string {
  // Strip the property name and any parameters (everything before the first ':')
  const idx = line.indexOf(':');
  return idx === -1 ? '' : line.slice(idx + 1);
}

interface RawEvent {
  start: Date;
  end: Date;
  rrule?: string;
}

function parseEvents(raw: string): RawEvent[] {
  const lines = unfold(raw);
  const events: RawEvent[] = [];
  let cur: { start?: Date; end?: Date; rrule?: string } | null = null;

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      cur = {};
    } else if (line.startsWith('END:VEVENT')) {
      if (cur?.start) {
        const start = cur.start;
        // Default 1h duration if no DTEND
        const end = cur.end ?? new Date(start.getTime() + 3_600_000);
        events.push({ start, end, rrule: cur.rrule });
      }
      cur = null;
    } else if (cur) {
      if (line.startsWith('DTSTART')) {
        const d = parseIcsDate(getPropValue(line));
        if (d) cur.start = d;
      } else if (line.startsWith('DTEND')) {
        const d = parseIcsDate(getPropValue(line));
        if (d) cur.end = d;
      } else if (line.startsWith('RRULE')) {
        cur.rrule = getPropValue(line);
      }
    }
  }
  return events;
}

// Expand weekly/daily recurrences across [now, now + horizonDays].
function expand(events: RawEvent[], now: Date, horizonDays: number): BusyBlock[] {
  const horizonEnd = new Date(now.getTime() + horizonDays * 86_400_000);
  const blocks: BusyBlock[] = [];

  for (const ev of events) {
    const durationMs = ev.end.getTime() - ev.start.getTime();

    if (!ev.rrule) {
      if (ev.end >= now && ev.start <= horizonEnd) blocks.push({ start: ev.start, end: ev.end });
      continue;
    }

    const rule = Object.fromEntries(
      ev.rrule.split(';').map(p => {
        const [k, val] = p.split('=');
        return [k.toUpperCase(), val];
      })
    );
    const freq = rule.FREQ;
    const interval = Math.max(1, parseInt(rule.INTERVAL ?? '1', 10) || 1);
    let until: Date | null = null;
    if (rule.UNTIL) until = parseIcsDate(rule.UNTIL);

    let stepDays: number | null = null;
    if (freq === 'DAILY') stepDays = interval;
    else if (freq === 'WEEKLY') stepDays = 7 * interval;

    if (stepDays === null) {
      // Unsupported freq (MONTHLY/YEARLY/etc.) — include first occurrence only.
      if (ev.end >= now && ev.start <= horizonEnd) blocks.push({ start: ev.start, end: ev.end });
      continue;
    }

    // Walk occurrences from the event start until horizon (cap iterations for safety).
    let occStart = new Date(ev.start);
    let guard = 0;
    while (occStart <= horizonEnd && guard < 500) {
      guard++;
      const occEnd = new Date(occStart.getTime() + durationMs);
      if (until && occStart > until) break;
      if (occEnd >= now) blocks.push({ start: new Date(occStart), end: occEnd });
      occStart = new Date(occStart.getTime() + stepDays * 86_400_000);
    }
  }

  return blocks;
}

/**
 * Parse raw .ics text into anonymous busy blocks over the next `horizonDays`.
 * Nothing but times is extracted.
 */
export function parseIcsToBusyBlocks(raw: string, now: Date, horizonDays = 14): BusyBlock[] {
  const events = parseEvents(raw);
  return expand(events, now, horizonDays);
}
