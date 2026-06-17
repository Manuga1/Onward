import type { Report, Block, ReportCategory } from './types';

export interface CreateReportParams {
  reporterId: string;
  targetId: string;
  category: ReportCategory;
  possibleMinorInvolved?: boolean;
}

function generateId(): string {
  return `rpt_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Create a report. PredatoryBehavior involving a possible minor always sets
 * requiresHumanEscalation = true.
 *
 * // HUMAN-OWNED: NCMEC reporting duties for PredatoryBehavior + possible minor.
 * // Do NOT automate escalation decisions. Surface to human review queue only.
 */
export function createReport(params: CreateReportParams, now: Date): Report {
  const { reporterId, targetId, category, possibleMinorInvolved = false } = params;

  const requiresHumanEscalation =
    category === 'PredatoryBehavior' && possibleMinorInvolved;

  return {
    reportId: generateId(),
    reporterId,
    targetId,
    category,
    requiresHumanEscalation,
    possibleMinorInvolved,
    createdAt: now,
  };
}

/**
 * Create a two-way block. Both directions are recorded.
 */
export function createBlock(blockerId: string, blockedId: string, now: Date): [Block, Block] {
  return [
    { blockerId, blockedId, createdAt: now },
    { blockerId: blockedId, blockedId: blockerId, createdAt: now },
  ];
}

export function isBlocked(blocks: Block[], a: string, b: string): boolean {
  return blocks.some(
    bl => (bl.blockerId === a && bl.blockedId === b) || (bl.blockerId === b && bl.blockedId === a)
  );
}
