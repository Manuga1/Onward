// Push notification adapter interface.
// Production implementation: OneSignal (web push + SMS fallback).
// HUMAN-OWNED: Wire real OneSignal credentials before launch.

export type PushNotificationType =
  | 'CheckInReminder'
  | 'PartnerNeedsSupport'
  | 'StreakMilestone'
  | 'MatchReady';

export interface PushPayload {
  type: PushNotificationType;
  memberId: string; // opaque — no PII in push payloads
  // No streak content, no fight values, no partner identity in the payload
  meta?: Record<string, string | number>;
}

export interface PushAdapter {
  send(payload: PushPayload): Promise<void>;
}
