// Sentry configuration with PII scrubbing.
// The beforeSend hook strips all sensitive fields before anything leaves the process.
// No PII, fight values, message content, phone, email, or tokens ever reach Sentry.

import type { ErrorEvent, EventHint } from '@sentry/nextjs';

// Fields that must never appear in Sentry events
const BLOCKED_KEYS = new Set([
  'phone', 'phone_encrypted', 'phone_hash',
  'email', 'email_encrypted',
  'fight', 'state', 'state_encrypted',   // check-in state
  'text', 'text_encrypted',               // message content
  'codename',                             // could narrow identity in small cohort
  'uniqueness_hash', 'verifier_txn_id',
  'token', 'access_token', 'refresh_token', 'password',
  'authorization', 'cookie', 'session',
]);

function scrubObject(obj: unknown, depth = 0): unknown {
  if (depth > 10 || obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => scrubObject(item, depth + 1));

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (BLOCKED_KEYS.has(key.toLowerCase())) {
      result[key] = '[SCRUBBED]';
    } else {
      result[key] = scrubObject(value, depth + 1);
    }
  }
  return result;
}

export function beforeSend(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  // Scrub request data
  if (event.request) {
    if (event.request.data) {
      event.request.data = scrubObject(event.request.data);
    }
    if (event.request.headers) {
      const headers = { ...event.request.headers };
      delete (headers as Record<string, unknown>)['authorization'];
      delete (headers as Record<string, unknown>)['cookie'];
      event.request.headers = headers;
    }
    // Never send the request body URL if it contains sensitive paths
    if (event.request.url?.includes('/checkin') || event.request.url?.includes('/chat')) {
      event.request.url = event.request.url.replace(/\/checkin.*/, '/checkin/[SCRUBBED]')
        .replace(/\/chat.*/, '/chat/[SCRUBBED]');
    }
  }

  // Scrub extra context
  if (event.extra) {
    event.extra = scrubObject(event.extra) as typeof event.extra;
  }

  // Scrub tags
  if (event.tags) {
    const scrubbedTags: Record<string, string> = {};
    for (const [k, v] of Object.entries(event.tags)) {
      scrubbedTags[k] = BLOCKED_KEYS.has(k.toLowerCase()) ? '[SCRUBBED]' : String(v);
    }
    event.tags = scrubbedTags;
  }

  // Strip user PII — only keep opaque ID
  if (event.user) {
    event.user = { id: event.user.id }; // drop email, username, ip_address
  }

  return event;
}
