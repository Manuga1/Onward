'use client';

import { useState } from 'react';
import { supabase } from '@/lib/db/client';

// Full page reload (window.location.href) is intentional — forces server to read new session cookie.
type Step = 'email' | 'otp';

export function PhoneSignup() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setStep('otp');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { data, error: err } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });
    if (err) {
      setLoading(false);
      setError(err.message);
      return;
    }

    // Exchange tokens into server-side HttpOnly cookies so API routes see the session
    await fetch('/api/auth/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
      }),
    });

    setLoading(false);
    window.location.href = '/onboarding';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-950 p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold text-stone-900 dark:text-stone-100">
            {step === 'email' ? 'Your email address' : 'Enter the code'}
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            {step === 'email'
              ? "We'll send you a one-time code to verify your account. Your email is stored encrypted and never shared."
              : `We sent a 6-digit code to ${email}. Check your spam folder if you don't see it.`}
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-sm border border-stone-200 dark:border-stone-800">
          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5 block">
                  Email address
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </label>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || !email.includes('@')}
                className="w-full py-3 rounded-xl font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Sending…' : 'Send code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5 block">
                  6-digit code
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-center text-2xl tracking-[0.5em] font-mono"
                />
              </label>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 rounded-xl font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Verifying…' : 'Verify'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                className="w-full py-2 text-sm text-stone-500 hover:text-stone-700"
              >
                Use a different email
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-stone-400">
          Check your spam folder if the code doesn't arrive within a minute.
        </p>
      </div>
    </div>
  );
}
