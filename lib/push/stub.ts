// HUMAN-OWNED: Replace with real OneSignal adapter before launch.
import type { PushAdapter, PushPayload } from './interface';

export const stubPushAdapter: PushAdapter = {
  async send(payload: PushPayload): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Push stub]', payload.type, 'to member', payload.memberId);
    }
  },
};
