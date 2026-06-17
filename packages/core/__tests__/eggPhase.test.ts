import { describe, it, expect } from 'vitest';
import { assembleEggPods, EGG_DURATION_DAYS } from '../eggPhase';
import type { Member } from '../types';

const now = new Date('2024-01-15T12:00:00Z');

function makeMember(overrides: Partial<Member> & { memberId: string }): Member {
  return {
    codename: `Name-${overrides.memberId}`,
    fight: 'Porn',
    gender: 'Male',
    intensity: 'Regular',
    stage: 'Week1',
    timezone: 'America/New_York',
    createdAt: now,
    ...overrides,
  };
}

describe('assembleEggPods', () => {
  it('returns empty pods and leftover for empty queue', () => {
    const result = assembleEggPods([], now);
    expect(result.pods).toHaveLength(0);
    expect(result.leftover).toHaveLength(0);
  });

  it('hard-filters by gender: male and female never share a pod', () => {
    const members = [
      makeMember({ memberId: 'm1', gender: 'Male' }),
      makeMember({ memberId: 'm2', gender: 'Male' }),
      makeMember({ memberId: 'f1', gender: 'Female' }),
      makeMember({ memberId: 'f2', gender: 'Female' }),
      makeMember({ memberId: 'f3', gender: 'Female' }),
    ];
    const { pods } = assembleEggPods(members, now);
    for (const pod of pods) {
      const genders = new Set(pod.members.map(m => m.gender));
      expect(genders.size).toBe(1);
    }
  });

  it('hard-filters by fight: different fights never share a pod', () => {
    const members = [
      makeMember({ memberId: 'a1', fight: 'Porn' }),
      makeMember({ memberId: 'a2', fight: 'Porn' }),
      makeMember({ memberId: 'a3', fight: 'Porn' }),
    ];
    const { pods } = assembleEggPods(members, now);
    for (const pod of pods) {
      const fights = new Set(pod.members.map(m => m.fight));
      expect(fights.size).toBe(1);
    }
  });

  it('assembles pods of ~5 members', () => {
    const members = Array.from({ length: 10 }, (_, i) =>
      makeMember({ memberId: `m${i}` })
    );
    const { pods } = assembleEggPods(members, now);
    for (const pod of pods) {
      expect(pod.members.length).toBeGreaterThanOrEqual(2);
      expect(pod.members.length).toBeLessThanOrEqual(5);
    }
  });

  it('puts leftover members into leftover array when below min pod size', () => {
    const members = [makeMember({ memberId: 'm1' })]; // only 1, below MIN_POD_SIZE=2
    const { pods, leftover } = assembleEggPods(members, now);
    expect(pods).toHaveLength(0);
    expect(leftover).toHaveLength(1);
  });

  it('sets pod endsAt to EGG_DURATION_DAYS after startedAt', () => {
    const members = Array.from({ length: 5 }, (_, i) =>
      makeMember({ memberId: `m${i}` })
    );
    const { pods } = assembleEggPods(members, now);
    for (const pod of pods) {
      const diff = pod.endsAt.getTime() - pod.startedAt.getTime();
      expect(diff).toBe(EGG_DURATION_DAYS * 24 * 60 * 60 * 1000);
    }
  });

  it('all queue members end up in either pods or leftover', () => {
    const members = Array.from({ length: 13 }, (_, i) =>
      makeMember({ memberId: `m${i}` })
    );
    const { pods, leftover } = assembleEggPods(members, now);
    const podCount = pods.reduce((s, p) => s + p.members.length, 0);
    expect(podCount + leftover.length).toBe(13);
  });

  it('separates gender groups into separate pods', () => {
    const members = [
      ...Array.from({ length: 5 }, (_, i) => makeMember({ memberId: `m${i}`, gender: 'Male' })),
      ...Array.from({ length: 5 }, (_, i) => makeMember({ memberId: `f${i}`, gender: 'Female' })),
    ];
    const { pods } = assembleEggPods(members, now);
    expect(pods.length).toBeGreaterThanOrEqual(2);
    const malePods = pods.filter(p => p.gender === 'Male');
    const femalePods = pods.filter(p => p.gender === 'Female');
    expect(malePods.length).toBeGreaterThan(0);
    expect(femalePods.length).toBeGreaterThan(0);
  });
});
