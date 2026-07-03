'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/db/client';

// Supabase magic link redirects here with tokens in the URL hash.
// onAuthStateChange fires as soon as the SDK processes the hash fragment.
export default function AuthCallbackPage() {
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe();

        const res = await fetch('/api/auth/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }),
        });

        if (!res.ok) {
          setErrorMsg('Failed to save session. Please try signing in again.');
          return;
        }

        window.location.href = '/home';
      }

      if (event === 'INITIAL_SESSION' && !session) {
        // No session in hash — link may be expired or already used
        setErrorMsg('This sign-in link is invalid or has expired. Please request a new one.');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-950 p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <p className="text-red-600 text-sm">{errorMsg}</p>
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
