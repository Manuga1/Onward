// PostHog analytics — behavioral events only, opaque IDs only.
// Autocapture is OFF on sensitive screens (onboarding, check-in, chat).
// No PII, no fight values, no check-in content ever reaches PostHog.

import { PostHog } from 'posthog-node';

let _client: PostHog | null = null;

export function getPostHogServer(): PostHog {
  if (!_client) {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) {
      // Return a no-op client if not configured
      return new NoopPostHog() as unknown as PostHog;
    }
    _client = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      // Flush immediately in serverless context
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return _client;
}

// Allowed event names — exhaustive list prevents accidental sensitive-data events
export type TrackableEvent =
  | 'signup_started'
  | 'signup_completed'
  | 'verify_started'
  | 'verify_passed'
  | 'verify_failed'
  | 'onboarding_completed'
  | 'egg_joined'
  | 'partner_matched'
  | 'checkin_submitted'     // properties: { state: 'Good'|'Shaky'|'Fell' } — state enum only
  | 'streak_milestone'      // properties: { days: number }
  | 'report_submitted'
  | 'block_created'
  | 'partnership_ended';

export interface TrackParams {
  event: TrackableEvent;
  memberId: string; // opaque UUID — no codename, no phone
  properties?: Record<string, string | number | boolean>;
}

export function trackServer(params: TrackParams): void {
  const ph = getPostHogServer();
  ph.capture({
    distinctId: params.memberId,
    event: params.event,
    properties: {
      ...params.properties,
      // Explicitly scrub anything that could be PII — belt-and-suspenders
      $ip: null,
    },
  });
}

// No-op fallback when PostHog is not configured (dev/test)
class NoopPostHog {
  capture() {}
  identify() {}
  shutdown() {}
}
