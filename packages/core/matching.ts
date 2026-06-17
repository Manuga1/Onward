import type { EggPod, Member } from './types';

// MatchResult deliberately omits any signal about who picked whom or rejection status.
export interface MatchResult {
  memberId: string;
  partnerId: string;
  isTriple?: boolean; // true when three members share a trio partnership
}

export interface MatchInput {
  pod: EggPod;
  // picks[memberId] = ordered array of up to 3 memberIds (most preferred first)
  picks: Map<string, string[]>;
  now: Date;
}

export interface MatchOutput {
  matches: MatchResult[];
  // Members who could not be matched and carry to next cohort (odd-one-out scenario)
  carryOver: string[];
}

function generatePairId(): string {
  return `pair_${Math.random().toString(36).slice(2, 10)}`;
}

export function matchPartners(input: MatchInput): MatchOutput {
  const { pod, picks } = input;
  const memberIds = pod.members.map(m => m.memberId);
  const matched = new Set<string>();
  const matches: MatchResult[] = [];

  // Degradation ladder:
  // (a) mutual top pick
  // (b) any mutual pick
  // (c) best one-directional pick
  // (d) system-assisted pairing

  function tryPair(a: string, b: string): boolean {
    if (matched.has(a) || matched.has(b)) return false;
    matched.add(a);
    matched.add(b);
    matches.push({ memberId: a, partnerId: b });
    matches.push({ memberId: b, partnerId: a });
    return true;
  }

  // (a) Mutual top pick
  for (const id of memberIds) {
    if (matched.has(id)) continue;
    const myPicks = picks.get(id) ?? [];
    const topPick = myPicks[0];
    if (!topPick) continue;
    const theirPicks = picks.get(topPick) ?? [];
    if (theirPicks[0] === id) {
      tryPair(id, topPick);
    }
  }

  // (b) Any mutual pick
  for (const id of memberIds) {
    if (matched.has(id)) continue;
    const myPicks = picks.get(id) ?? [];
    for (const candidate of myPicks) {
      if (matched.has(candidate)) continue;
      const theirPicks = picks.get(candidate) ?? [];
      if (theirPicks.includes(id)) {
        tryPair(id, candidate);
        break;
      }
    }
  }

  // (c) Best one-directional pick (highest-ranked available pick)
  for (const id of memberIds) {
    if (matched.has(id)) continue;
    const myPicks = picks.get(id) ?? [];
    for (const candidate of myPicks) {
      if (matched.has(candidate)) continue;
      if (tryPair(id, candidate)) break;
    }
  }

  // (d) System-assisted pairing on pod assembly criteria (remaining unmatched)
  const unmatched = memberIds.filter(id => !matched.has(id));

  if (unmatched.length === 0) {
    return { matches, carryOver: [] };
  }

  if (unmatched.length === 1) {
    // Odd member: fold into an existing pair to make a trio
    const oddOne = unmatched[0];
    if (matches.length >= 2) {
      // Find the last pair formed and upgrade to trio
      const lastMatch = matches[matches.length - 2]; // the first of a pair
      const existingPair = [lastMatch.memberId, lastMatch.partnerId];

      // Remove old pair entries and replace with trio
      const toRemove = new Set([lastMatch.memberId, lastMatch.partnerId]);
      const filtered = matches.filter(m => !toRemove.has(m.memberId));
      matches.length = 0;
      matches.push(...filtered);

      // Add trio entries (all three point to all partners)
      const [a, b] = existingPair;
      const c = oddOne;
      matches.push({ memberId: a, partnerId: b, isTriple: true });
      matches.push({ memberId: b, partnerId: a, isTriple: true });
      matches.push({ memberId: c, partnerId: a, isTriple: true });
      matches.push({ memberId: a, partnerId: c, isTriple: true });
      matches.push({ memberId: c, partnerId: b, isTriple: true });
      matches.push({ memberId: b, partnerId: c, isTriple: true });

      return { matches, carryOver: [] };
    }
    // No existing pairs to fold into — carry over
    return { matches, carryOver: [oddOne] };
  }

  // Multiple unmatched: pair them up system-style (by pod order)
  for (let i = 0; i + 1 < unmatched.length; i += 2) {
    tryPair(unmatched[i], unmatched[i + 1]);
  }

  // If still odd one remains after system pairing
  const stillUnmatched = unmatched.filter(id => !matched.has(id));
  if (stillUnmatched.length === 1) {
    const oddOne = stillUnmatched[0];
    if (matches.length >= 2) {
      const lastMatch = matches[matches.length - 2];
      const toRemove = new Set([lastMatch.memberId, lastMatch.partnerId]);
      const filtered = matches.filter(m => !toRemove.has(m.memberId));
      matches.length = 0;
      matches.push(...filtered);
      const [a, b] = [lastMatch.memberId, lastMatch.partnerId];
      const c = oddOne;
      matches.push({ memberId: a, partnerId: b, isTriple: true });
      matches.push({ memberId: b, partnerId: a, isTriple: true });
      matches.push({ memberId: c, partnerId: a, isTriple: true });
      matches.push({ memberId: a, partnerId: c, isTriple: true });
      matches.push({ memberId: c, partnerId: b, isTriple: true });
      matches.push({ memberId: b, partnerId: c, isTriple: true });
      return { matches, carryOver: [] };
    }
    return { matches, carryOver: stillUnmatched };
  }

  return { matches, carryOver: stillUnmatched };
}
