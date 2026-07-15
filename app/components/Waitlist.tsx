'use client';

import { useState } from 'react';

export function Waitlist() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        let msg = 'Something went wrong. Try again.';
        try { msg = (await res.json()).error || msg; } catch { /* empty */ }
        setError(msg);
        setStatus('idle');
        return;
      }
      setStatus('done');
    } catch {
      setError('Something went wrong. Try again.');
      setStatus('idle');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-950 p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-teal-600/10 dark:bg-teal-500/10 flex items-center justify-center">
            <span className="text-3xl">🌱</span>
          </div>
          <h1
            className="text-4xl font-semibold text-stone-900 dark:text-stone-100"
            style={{ fontFamily: 'Spectral, serif' }}
          >
            Onward
          </h1>
          <p className="text-stone-500 dark:text-stone-400 leading-relaxed">
            Anonymous, one-on-one accountability for recovery — real human support that
            can&apos;t be silently deleted. We&apos;re opening in small cohorts.
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-sm border border-stone-200 dark:border-stone-800">
          {status === 'done' ? (
            <div className="text-center space-y-3 py-4">
              <div className="text-4xl">✓</div>
              <h2 className="text-lg font-medium text-stone-900 dark:text-stone-100">
                You&apos;re on the list
              </h2>
              <p className="text-stone-500 dark:text-stone-400 text-sm">
                We&apos;ll email you when your cohort is ready. Thank you for your patience.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5 block">
                  Join the waitlist
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
                disabled={status === 'loading' || !email.includes('@')}
                className="w-full py-3 rounded-xl font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors"
              >
                {status === 'loading' ? 'Joining…' : 'Notify me'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-stone-400">
          Your email is stored securely and only used to let you know when a spot opens.
          We never share it.
        </p>
      </div>
    </div>
  );
}
