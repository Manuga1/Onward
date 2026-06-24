'use client';

import { useState } from 'react';
import { supabase } from '@/lib/db/client';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

type Step = 'email' | 'sent';

export function PhoneSignup() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${APP_URL}/auth/callback` },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setStep('sent');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-950 p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold text-stone-900 dark:text-stone-100">
            {step === 'email' ? 'Your email address' : 'Check your inbox'}
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            {step === 'email'
              ? "We'll send you a sign-in link. Your email is stored encrypted and never shared."
              : `We sent a sign-in link to ${email}. Click it to continue — check spam if you don't see it.`}
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-sm border border-stone-200 dark:border-stone-800">
          {step === 'email' ? (
            <form onSubmit={handleSendLink} className="space-y-4">
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
                {loading ? 'Sending…' : 'Send sign-in link'}
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="text-5xl">📬</div>
              <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed">
                Open the email from Onward and click the sign-in link. This tab will stay open — after clicking the link you'll be brought back automatically.
              </p>
              <button
                type="button"
                onClick={() => { setStep('email'); setError(''); }}
                className="w-full py-2 text-sm text-stone-500 hover:text-stone-700"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-stone-400">
          Check your spam folder if the email doesn't arrive within a minute.
        </p>
      </div>
    </div>
  );
}
