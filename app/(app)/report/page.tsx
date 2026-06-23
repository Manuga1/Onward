'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Flag, ArrowLeft } from 'lucide-react';
import type { ReportCategory } from '@/packages/core/types';

const CATEGORIES: { value: ReportCategory; label: string; sub: string }[] = [
  { value: 'Harassment', label: 'Harassment', sub: 'Threatening, intimidating, or hostile messages' },
  { value: 'InappropriateContent', label: 'Inappropriate content', sub: 'Content that violates community standards' },
  { value: 'PredatoryBehavior', label: 'Predatory behavior', sub: 'Grooming, exploitation, or targeting vulnerable people' },
  { value: 'Spam', label: 'Spam', sub: 'Unsolicited promotions or repetitive messages' },
  { value: 'Other', label: 'Other', sub: 'Something else not listed above' },
];

function ReportForm() {
  const params = useSearchParams();
  const router = useRouter();
  const targetCodename = params.get('targetCodename') ?? 'your partner';

  const [category, setCategory] = useState<ReportCategory | ''>('');
  const [possibleMinor, setPossibleMinor] = useState(false);
  const [blockToo, setBlockToo] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetCodename, category, possibleMinorInvolved: possibleMinor, blockToo }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-950 p-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
            <Flag className="w-7 h-7 text-teal-600" />
          </div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Report received</h1>
          <p className="text-stone-500 text-sm">
            Our team will review this report. You can end this partnership at any time from settings.
          </p>
          <button onClick={() => router.push('/home')}
            className="w-full py-3 rounded-xl font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors">
            Back home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 p-6">
      <div className="max-w-md mx-auto space-y-6">
        <header className="flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="Back">
            <ArrowLeft className="w-5 h-5 text-stone-400 hover:text-stone-600" />
          </button>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Report a concern</h1>
        </header>

        <p className="text-stone-500 text-sm">
          Reports are reviewed by our team. This will not notify{' '}
          <span className="font-mono text-stone-700 dark:text-stone-300">{targetCodename}</span>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            {CATEGORIES.map(cat => (
              <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-colors ${
                  category === cat.value
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30'
                    : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-stone-300'
                }`}>
                <p className="font-medium text-stone-800 dark:text-stone-200 text-sm">{cat.label}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{cat.sub}</p>
              </button>
            ))}
          </div>

          {category === 'PredatoryBehavior' && (
            <label className="flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 cursor-pointer">
              <input type="checkbox" checked={possibleMinor} onChange={e => setPossibleMinor(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-red-600 focus:ring-red-500" />
              <span className="text-sm text-red-800 dark:text-red-300">
                I believe this may involve a minor (under 18)
              </span>
            </label>
          )}

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={blockToo} onChange={e => setBlockToo(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500" />
            <span className="text-sm text-stone-700 dark:text-stone-300">
              Also block this person and end the partnership
            </span>
          </label>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button type="submit" disabled={!category || loading}
            className="w-full py-3 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors">
            {loading ? 'Submitting…' : 'Submit report'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense>
      <ReportForm />
    </Suspense>
  );
}
