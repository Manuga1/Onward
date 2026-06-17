export type Fight = 'Porn';

export type Gender = 'Male' | 'Female' | 'NonBinary';

export type Intensity = 'Occasional' | 'Regular' | 'Daily' | 'MultipleDaily';

export type Stage = 'Day1' | 'Week1' | 'ThirtyDays' | 'NinetyPlus';

export type FaithPreference = 'Secular' | 'FaithBased' | 'NoPreference';

export type ReportCategory =
  | 'Harassment'
  | 'InappropriateContent'
  | 'PredatoryBehavior'
  | 'Spam'
  | 'Other';

export type CheckInState = 'Good' | 'Shaky' | 'Fell';

export interface Clock {
  now(): Date;
}

export interface Member {
  memberId: string;
  codename: string;
  fight: Fight;
  gender: Gender;
  intensity: Intensity;
  stage: Stage;
  timezone: string; // IANA tz string e.g. "America/New_York"
  faithPreference?: FaithPreference;
  verifiedAt?: Date;
  createdAt: Date;
}

export interface EggPod {
  podId: string;
  members: Member[];
  fight: Fight;
  gender: Gender;
  startedAt: Date;
  endsAt: Date;
}

export interface Partnership {
  partnershipId: string;
  memberIds: [string, string] | [string, string, string]; // pair or trio
  streakDays: number;
  lastContactAt: Date | null;
  startedAt: Date;
  isActive: boolean;
}

export interface CheckIn {
  checkInId: string;
  memberId: string;
  partnershipId: string;
  state: CheckInState;
  windowId: string;
  at: Date;
}

export interface CheckInWindow {
  windowId: string;
  memberId: string;
  partnershipId: string;
  windowStart: Date;
  windowEnd: Date;
  timezone: string;
}

export interface Report {
  reportId: string;
  reporterId: string;
  targetId: string;
  category: ReportCategory;
  requiresHumanEscalation: boolean;
  possibleMinorInvolved: boolean;
  createdAt: Date;
}

export interface Block {
  blockerId: string;
  blockedId: string;
  createdAt: Date;
}

export type DomainEventType =
  | 'PartnerNotification'
  | 'RematchRecommended'
  | 'EscalationRequired';

export interface DomainEvent {
  type: DomainEventType;
  memberId: string;
  partnershipId?: string;
  at: Date;
  meta?: Record<string, string | number | boolean>;
}
