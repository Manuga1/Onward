// HUMAN-OWNED: Replace with real Twilio adapter before launch.
import type { SmsAdapter, SmsPayload } from './interface';

export const stubSmsAdapter: SmsAdapter = {
  async send(payload: SmsPayload): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[SMS stub]', payload.templateId, 'to member', payload.toMemberId);
    }
  },
};
