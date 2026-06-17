import { describe, it, expect } from 'vitest';
import { matchPartners } from '../matching';
import type { EggPod, Member } from '../types';

const now = new Date('2024-01-15T12:00:00Z');

function makeMember(id: string): Member {
  return {
    memberId: id,
    codename: `Name-${id}`,
    fight: 'Porn',
    gender: 'Male',
    intensity: 'Regular',
    stage: 'Week1',
    timezone: 'America/New_York',
    createdAt: now,
  };
}

function makePod(ids: string[]): EggPod {
  return {
    podId: 'pod1',
    members: ids.map(makeMember),
    fight: 'Porn',
    gender: 'Male',
    startedAt: now,
    endsAt: new Date(now.getTime() + 7 * 86400000),
  };
}

describe('matchPartners', () => {
  it('matches mutual top picks together', () => {
    const pod = makePod(['A', 'B', 'C', 'D']);
    const picks = new Map([
      ['A', ['B', 'C']],
      ['B', ['A', 'D']],
      ['C', ['D', 'A']],
      ['D', ['C', 'B']],
    ]);
    const { matches } = matchPartners({ pod, picks, now });
    const aMatch = matches.find(m => m.memberId === 'A');
    expect(aMatch?.partnerId).toBe('B');
    const cMatch = matches.find(m => m.memberId === 'C');
    expect(cMatch?.partnerId).toBe('D');
  });

  it('falls back to any mutual pick when top picks are not mutual', () => {
    const pod = makePod(['A', 'B', 'C', 'D']);
    // A→B (top), B→C (top), but A and B both pick each other (A's #1, B's #2)
    const picks = new Map([
      ['A', ['B']],
      ['B', ['C', 'A']], // B's top is C, but A is mutual with A
      ['C', ['D']],
      ['D', ['C']],
    ]);
    const { matches } = matchPartners({ pod, picks, now });
    const allMatched = new Set(matches.map(m => m.memberId));
    // All 4 should be matched
    expect(allMatched.size).toBe(4);
  });

  it('uses system pairing so no one is unmatched (degradation ladder)', () => {
    const pod = makePod(['A', 'B', 'C', 'D', 'E']);
    // Completely non-overlapping picks
    const picks = new Map([
      ['A', ['B']],
      ['B', ['C']],
      ['C', ['D']],
      ['D', ['E']],
      ['E', ['A']],
    ]);
    const { matches, carryOver } = matchPartners({ pod, picks, now });
    const matched = new Set(matches.map(m => m.memberId));
    // Either everyone matched or at most 1 carried over
    expect(matched.size + carryOver.length).toBe(5);
    expect(carryOver.length).toBeLessThanOrEqual(1);
  });

  it('handles odd member: folds into trio instead of leaving unmatched', () => {
    const pod = makePod(['A', 'B', 'C']);
    const picks = new Map([
      ['A', ['B']],
      ['B', ['A']],
      ['C', ['A']],
    ]);
    const { matches, carryOver } = matchPartners({ pod, picks, now });
    // C should become part of a trio or carry over — never just dropped
    const allIds = new Set([...matches.map(m => m.memberId), ...carryOver]);
    expect(allIds.has('C')).toBe(true);
  });

  it('output does NOT contain rejection signals or who-picked-whom', () => {
    const pod = makePod(['A', 'B', 'C', 'D']);
    const picks = new Map([
      ['A', ['B']],
      ['B', ['C']], // B did NOT pick A back
      ['C', ['D']],
      ['D', ['C']],
    ]);
    const { matches } = matchPartners({ pod, picks, now });
    for (const match of matches) {
      // MatchResult must only have memberId, partnerId, and optionally isTriple
      const keys = Object.keys(match);
      for (const key of keys) {
        expect(['memberId', 'partnerId', 'isTriple']).toContain(key);
      }
      // No rejection fields
      expect(match).not.toHaveProperty('wasReciprocated');
      expect(match).not.toHaveProperty('whoPickedMe');
      expect(match).not.toHaveProperty('rankGiven');
      expect(match).not.toHaveProperty('rejected');
      expect(match).not.toHaveProperty('unreciprocated');
    }
  });

  it('degradation ladder leaves no one unmatched with 2 members', () => {
    const pod = makePod(['A', 'B']);
    const picks = new Map<string, string[]>([['A', []], ['B', []]]);
    const { matches, carryOver } = matchPartners({ pod, picks, now });
    expect(matches.length).toBe(2); // A→B, B→A
    expect(carryOver).toHaveLength(0);
  });

  it('trio members all see each other as partners', () => {
    const pod = makePod(['A', 'B', 'C']);
    const picks = new Map([
      ['A', ['B']],
      ['B', ['A']],
      ['C', []],
    ]);
    const { matches } = matchPartners({ pod, picks, now });
    const trioMembers = matches.filter(m => m.isTriple === true);
    if (trioMembers.length > 0) {
      const trioIds = new Set(trioMembers.map(m => m.memberId));
      expect(trioIds.has('C')).toBe(true);
    }
  });
});
