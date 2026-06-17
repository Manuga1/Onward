'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flame, Heart, AlertTriangle, CheckCircle } from 'lucide-react';
import type { CheckInState } from '@/packages/core/types';

interface CheckInClientProps {
  memberId: string;
  codename: string;
  partnershipId: string;
  streakDays: number;
  timezone: string;
  checkinHour: number;
  alreadyCheckedIn: boolean;
  windowId: string;
}

export function CheckInClient({
  codename,
  partnershipId,
  streakDays,
  alreadyCheckedIn,
  windowId,
}: CheckInClientProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<CheckInState | null>(null);
  const [submitted, setSubmitted] = useState(alreadyCheckedIn);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnershipId, state: selected, windowId }),
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
    return <CheckInDone streakDays={streakDays + (selected ? 1 : 0)} state={selected} onHome={() => router.push('/home')} />;
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 p-6">
      <div className="max-w-md mx-auto space-y-6">
        <header className="space-y-1">
          <p className="text-sm text-stone-400 font-mono">{codename}</p>
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
            How are you doing today?
          </h1>
          <p className="text-stone-500 text-sm">Your partner will know you checked in — not what you shared.</p>
        </header>

        <StreakBadge days={streakDays} />

        <div className="space-y-3">
          {OPTIONS.map(opt => (
            <button
              key={opt.state}
              onClick={() => setSelected(opt.state)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                selected === opt.state
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30'
                  : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-stone-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{opt.emoji}</span>
                <div>
                  <p className="font-medium text-stone-800 dark:text-stone-200">{opt.label}</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{opt.sub}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {selected === 'Fell' && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-2 text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-300">This takes courage.</p>
            <p className="text-amber-700 dark:text-amber-400">
              Checking in honestly keeps your streak. Relapse is part of recovery — not the end of it.
            </p>
            <div className="pt-1 space-y-1 text-amber-700 dark:text-amber-400">
              <p className="font-medium">If you need extra support right now:</p>
              <p>• Text <strong>HOME</strong> to <strong>741741</strong> (Crisis Text Line)</p>
              <p>• SAMHSA: <strong>1-800-662-4357</strong></p>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Onward is peer support, not clinical treatment.
            </p>
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!selected || loading}
          className="w-full py-3.5 rounded-xl font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Submitting…' : 'Check in'}
        </button>
      </div>
    </div>
  );
}

function StreakBadge({ days }: { days: number }) {
  if (days === 0) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl">
      <Flame className="w-5 h-5 text-orange-500" />
      <span className="font-medium text-orange-800 dark:text-orange-300">
        {days} day streak
      </span>
      <span className="text-xs text-orange-500 dark:text-orange-400 ml-auto">keep it going</span>
    </div>
  );
}

function CheckInDone({ streakDays, state, onHome }: { streakDays: number; state: CheckInState | null; onHome: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-950 p-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-teal-600 dark:text-teal-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
            {state === 'Good' ? 'Great. Keep going.' : state === 'Shaky' ? 'Hanging in there counts.' : 'You showed up. That matters.'}
          </h1>
          <p className="text-stone-500 text-sm">Your partner knows you checked in.</p>
        </div>
        {streakDays > 0 && (
          <div className="flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400">
            <Flame className="w-5 h-5" />
            <span className="font-semibold text-lg">{streakDays} day streak</span>
          </div>
        )}
        <button onClick={onHome}
          className="w-full py-3 rounded-xl font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors">
          Back home
        </button>
      </div>
    </div>
  );
}

const OPTIONS: { state: CheckInState; emoji: string; label: string; sub: string }[] = [
  { state: 'Good', emoji: '✅', label: "I'm good", sub: "Feeling solid. Held my ground." },
  { state: 'Shaky', emoji: '⚡', label: "Shaky but here", sub: "Tough day, but I showed up." },
  { state: 'Fell', emoji: '🤍', label: "I fell", sub: "Being honest. That takes courage." },
];
