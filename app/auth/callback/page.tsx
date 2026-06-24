'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/db/client';

// Supabase magic link redirects here with tokens in the URL hash.
// We exchange them for server-side HttpOnly cookies then go to onboarding.
export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handle = async () => {
      // getSession() picks up the tokens from the URL hash automatically
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setErrorMsg(error?.message ?? 'No session found. Try signing in again.');
        setStatus('error');
        return;
      }

      const res = await fetch('/api/auth/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }),
      });

      if (!res.ok) {
        setErrorMsg('Failed to save session. Please try again.');
        setStatus('error');
        return;
      }

      window.location.href = '/onboarding';
    };

    handle();
  }, []);

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-950 p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <p className="text-red-600">{errorMsg}</p>
          <a href="/signup" className="text-teal-600 underline text-sm">Back to sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-950 p-6">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-stone-500 text-sm">Signing you in…</p>
      </div>
    </div>
  );
}
