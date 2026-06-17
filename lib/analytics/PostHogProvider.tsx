'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Sensitive routes — autocapture OFF on these paths
const SENSITIVE_PATHS = ['/onboarding', '/checkin', '/chat', '/signup', '/verify'];

function isSensitivePath(path: string): boolean {
  return SENSITIVE_PATHS.some(p => path.startsWith(p));
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return; // PostHog not configured

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      // Autocapture OFF globally; we only fire explicit events
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      // No session recording — this is a sensitive product
      disable_session_recording: true,
      persistence: 'memory', // no localStorage persistence — re-identified on each session
    });
  }, []);

  useEffect(() => {
    // Manual pageview — skip sensitive paths
    if (!isSensitivePath(pathname)) {
      posthog.capture('$pageview', { $current_url: pathname });
    }
  }, [pathname]);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
