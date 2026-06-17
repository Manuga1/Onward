// SMS adapter interface. Production: Twilio.
// HUMAN-OWNED: Wire real Twilio credentials before launch.
// No PII or fight content in SMS body — opaque deep links only.

export interface SmsPayload {
  toMemberId: string; // used server-side to look up encrypted phone; never log
  templateId: 'CheckInReminder' | 'PartnerNeedsSupport' | 'StreakMilestone';
  deepLink?: string; // short app URL, no PII
}

export interface SmsAdapter {
  send(payload: SmsPayload): Promise<void>;
}
