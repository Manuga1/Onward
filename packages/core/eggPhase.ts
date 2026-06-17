import type { Member, EggPod, Fight, Gender } from './types';

export const EGG_DURATION_DAYS = 7;
export const TARGET_POD_SIZE = 5;
export const MIN_POD_SIZE = 2;

const INTENSITY_ORDER = ['Occasional', 'Regular', 'Daily', 'MultipleDaily'] as const;

function intensityScore(a: Member, b: Member): number {
  const ia = INTENSITY_ORDER.indexOf(a.intensity);
  const ib = INTENSITY_ORDER.indexOf(b.intensity);
  const diff = Math.abs(ia - ib);
  // 0 diff = 10pts, 1 diff = 7pts, 2 diff = 4pts, 3 diff = 1pt
  return Math.max(10 - diff * 3, 1);
}

function timezoneOffsetHours(tzA: string, tzB: string, now: Date): number {
  try {
    const fmtOpts: Intl.DateTimeFormatOptions = { timeZone: tzA, timeZoneName: 'shortOffset' };
    const partA = new Intl.DateTimeFormat('en-US', fmtOpts).formatToParts(now);
    const partB = new Intl.DateTimeFormat('en-US', { timeZone: tzB, timeZoneName: 'shortOffset' }).formatToParts(now);
    const offsetA = partA.find(p => p.type === 'timeZoneName')?.value ?? 'UTC+0';
    const offsetB = partB.find(p => p.type === 'timeZoneName')?.value ?? 'UTC+0';
    const parseOffset = (s: string): number => {
      const m = s.match(/UTC([+-])(\d+)(?::(\d+))?/);
      if (!m) return 0;
      const sign = m[1] === '+' ? 1 : -1;
      return sign * (parseInt(m[2]) + (parseInt(m[3] ?? '0') / 60));
    };
    return Math.abs(parseOffset(offsetA) - parseOffset(offsetB));
  } catch {
    return 0;
  }
}

function timezoneBonus(a: Member, b: Member, now: Date): number {
  // Cross-timezone preferred (helps with 24h accountability coverage)
  const diff = timezoneOffsetHours(a.timezone, b.timezone, now);
  if (diff >= 3) return 3;
  if (diff >= 1) return 1;
  return 0;
}

function pairCompatibilityScore(a: Member, b: Member, now: Date): number {
  return intensityScore(a, b) + timezoneBonus(a, b, now);
}

function generatePodId(): string {
  return `pod_${Math.random().toString(36).slice(2, 10)}`;
}

export function assembleEggPods(
  queue: Member[],
  now: Date
): { pods: EggPod[]; leftover: Member[] } {
  // Group by gender (hard filter) + fight (hard filter)
  const groups = new Map<string, Member[]>();
  for (const m of queue) {
    const key = `${m.gender}:${m.fight}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  const pods: EggPod[] = [];
  const leftover: Member[] = [];

  for (const [key, members] of groups) {
    const [gender, fight] = key.split(':') as [Gender, Fight];

    // Greedy pod assembly: score pairs, build ~5-person pods
    const remaining = [...members];
    while (remaining.length >= MIN_POD_SIZE) {
      if (remaining.length < TARGET_POD_SIZE) {
        // Not enough for a full pod — carry to leftover unless we have at least 2
        if (remaining.length >= MIN_POD_SIZE) {
          // Form a small pod
          pods.push(buildPod(remaining.splice(0, remaining.length), gender, fight, now));
        } else {
          leftover.push(...remaining.splice(0, remaining.length));
        }
        break;
      }

      // Take the next TARGET_POD_SIZE members (sorted by intensity for cohesion)
      remaining.sort((a, b) => {
        const ia = INTENSITY_ORDER.indexOf(a.intensity);
        const ib = INTENSITY_ORDER.indexOf(b.intensity);
        return ia - ib;
      });

      // Greedily pick best-scoring group of TARGET_POD_SIZE from the front
      const podMembers = remaining.splice(0, TARGET_POD_SIZE);
      pods.push(buildPod(podMembers, gender, fight, now));
    }

    if (remaining.length > 0) {
      leftover.push(...remaining);
    }
  }

  return { pods, leftover };
}

function buildPod(members: Member[], gender: Gender, fight: Fight, now: Date): EggPod {
  const endsAt = new Date(now.getTime() + EGG_DURATION_DAYS * 24 * 60 * 60 * 1000);
  return {
    podId: generatePodId(),
    members,
    fight,
    gender,
    startedAt: now,
    endsAt,
  };
}

export { pairCompatibilityScore };
