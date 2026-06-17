import * as Sentry from '@sentry/nextjs';
import { beforeSend } from '@/lib/errors/sentry';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  beforeSend,
});
