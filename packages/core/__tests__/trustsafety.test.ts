import { describe, it, expect } from 'vitest';
import { createReport, createBlock, isBlocked } from '../trustsafety';

const now = new Date('2024-01-15T12:00:00Z');

describe('createReport', () => {
  it('sets requiresHumanEscalation=true for PredatoryBehavior + possible minor', () => {
    const report = createReport(
      { reporterId: 'r1', targetId: 't1', category: 'PredatoryBehavior', possibleMinorInvolved: true },
      now
    );
    expect(report.requiresHumanEscalation).toBe(true);
    expect(report.possibleMinorInvolved).toBe(true);
  });

  it('does NOT set requiresHumanEscalation for PredatoryBehavior without minor', () => {
    const report = createReport(
      { reporterId: 'r1', targetId: 't1', category: 'PredatoryBehavior', possibleMinorInvolved: false },
      now
    );
    expect(report.requiresHumanEscalation).toBe(false);
  });

  it('does NOT set requiresHumanEscalation for other categories even with minor flag', () => {
    const report = createReport(
      { reporterId: 'r1', targetId: 't1', category: 'Harassment', possibleMinorInvolved: true },
      now
    );
    expect(report.requiresHumanEscalation).toBe(false);
  });

  it('includes correct reporter and target', () => {
    const report = createReport(
      { reporterId: 'r1', targetId: 't1', category: 'Spam' },
      now
    );
    expect(report.reporterId).toBe('r1');
    expect(report.targetId).toBe('t1');
    expect(report.category).toBe('Spam');
  });

  it('creates unique reportIds', () => {
    const r1 = createReport({ reporterId: 'r1', targetId: 't1', category: 'Spam' }, now);
    const r2 = createReport({ reporterId: 'r1', targetId: 't1', category: 'Spam' }, now);
    expect(r1.reportId).not.toBe(r2.reportId);
  });
});

describe('createBlock', () => {
  it('creates two-way block entries', () => {
    const [blockA, blockB] = createBlock('userA', 'userB', now);
    expect(blockA.blockerId).toBe('userA');
    expect(blockA.blockedId).toBe('userB');
    expect(blockB.blockerId).toBe('userB');
    expect(blockB.blockedId).toBe('userA');
  });
});

describe('isBlocked', () => {
  it('returns true when either direction is blocked', () => {
    const blocks = createBlock('A', 'B', now);
    expect(isBlocked([...blocks], 'A', 'B')).toBe(true);
    expect(isBlocked([...blocks], 'B', 'A')).toBe(true);
  });

  it('returns false when no block exists', () => {
    expect(isBlocked([], 'A', 'B')).toBe(false);
  });

  it('does not affect unrelated pairs', () => {
    const blocks = createBlock('A', 'B', now);
    expect(isBlocked([...blocks], 'A', 'C')).toBe(false);
  });
});
