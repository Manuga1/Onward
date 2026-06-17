import * as Sentry from '@sentry/nextjs';
import { beforeSend } from '@/lib/errors/sentry';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  // Never capture replays — this is a sensitive product
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  beforeSend,
  // Strip PII from breadcrumbs
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
      // Don't log request bodies
      if (breadcrumb.data) {
        delete breadcrumb.data.body;
        delete breadcrumb.data.response;
      }
    }
    return breadcrumb;
  },
});
