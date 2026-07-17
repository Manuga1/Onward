'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Flame, AlertTriangle } from 'lucide-react';
import { authFetch } from '@/lib/db/authFetch';

interface HomeClientProps {
  codename: string;
  streakDays: number;
  checkedInToday: boolean;
  partnershipId: string;
  partnerDark: boolean;
  isPaused: boolean;
  partnerState: string | null;
  partnerCheckInAt: string | null;
}

export function HomeClient({
  codename,
  streakDays,
  checkedInToday,
  partnerDark,
  isPaused,
  partnerState,
  partnerCheckInAt,
}: HomeClientProps) {
  const [rematchDismissed, setRematchDismissed] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);

  async function requestRematch() {
    setRematchLoading(true);
    try {
      await authFetch('/api/account/rematch', { method: 'POST' });
      setRematchRequested(true);
    } finally {
      setRematchLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 p-6">
      <div className="max-w-md mx-auto space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400 font-mono">{codename}</p>
            <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
              {greeting()}
            </h1>
          </div>
          <Link href="/settings" className="text-sm text-stone-400 hover:text-stone-600">Settings</Link>
        </header>

        {/* Partner dark alert */}
        {partnerDark && !rematchDismissed && !rematchRequested && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Your partner hasn't checked in for a few days.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Would you like us to find you a new partner? Your streak carries over.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={requestRematch}
                disabled={rematchLoading}
                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-xl py-2 text-sm font-medium transition-colors"
              >
                {rematchLoading ? 'Requesting…' : 'Find me a new partner'}
              </button>
              <button
                onClick={() => setRematchDismissed(true)}
                className="flex-1 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-xl py-2 text-sm transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/20"
              >
                Keep waiting
              </button>
            </div>
          </div>
        )}

        {rematchRequested && (
          <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-2xl p-4 text-sm text-teal-700 dark:text-teal-300">
            ✓ Rematch requested. We'll place you with a new partner shortly.
          </div>
        )}

        {/* Paused banner */}
        {isPaused && (
          <div className="bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-4 text-sm text-stone-600 dark:text-stone-400">
            ⏸ Partnership paused. Your streak is safe.
          </div>
        )}

        {/* Streak card */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              streakDays > 0 ? 'bg-orange-100 dark:bg-orange-900' : 'bg-stone-100 dark:bg-stone-800'
            }`}>
              <Flame className={`w-6 h-6 ${streakDays > 0 ? 'text-orange-500' : 'text-stone-400'}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                {streakDays} <span className="text-base font-normal text-stone-400">days</span>
              </p>
              <p className="text-xs text-stone-400">Partnership streak</p>
            </div>
          </div>
        </div>

        {/* Partner's latest check-in */}
        {partnerState && (
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${partnerStateStyle(partnerState)}`}>
              {partnerStateEmoji(partnerState)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
                Your partner checked in{partnerStateLabel(partnerState)}
              </p>
              {partnerCheckInAt && (
                <p className="text-xs text-stone-400">{relativeTime(partnerCheckInAt)}</p>
              )}
            </div>
          </div>
        )}

        {/* Check-in CTA */}
        {checkedInToday ? (
          <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-2xl p-5 text-center space-y-1">
            <p className="text-teal-700 dark:text-teal-300 font-medium">✓ Checked in today</p>
            <p className="text-teal-600 dark:text-teal-400 text-sm">Your partner knows you showed up.</p>
          </div>
        ) : (
          <Link href="/checkin"
            className="block bg-teal-600 hover:bg-teal-700 text-white rounded-2xl p-5 text-center space-y-1 transition-colors">
            <p className="font-semibold text-lg">Check in</p>
            <p className="text-teal-100 text-sm">Let your partner know how you're doing.</p>
          </Link>
        )}

        {/* Chat link */}
        <Link href="/chat"
          className="block bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 flex items-center gap-3 hover:border-teal-300 dark:hover:border-teal-700 transition-colors">
          <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center flex-shrink-0">
            <span className="text-teal-600 dark:text-teal-400 text-lg">💬</span>
          </div>
          <div>
            <p className="font-medium text-stone-800 dark:text-stone-200 text-sm">Message your partner</p>
            <p className="text-xs text-stone-400">Text only · Private · Encrypted</p>
          </div>
        </Link>

        {/* Founding cohort banner */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-600 dark:text-stone-400">
          <span className="font-medium text-stone-800 dark:text-stone-200">Founding cohort</span>
          {' '}— You're part of our research pilot. Your experience shapes what Onward becomes.
        </div>

        {/* Not-medical disclaimer */}
        <p className="text-center text-xs text-stone-400">
          Onward is peer accountability support, not medical or clinical treatment.{' '}
          <a href="tel:988" className="underline">Get help now (988)</a>
        </p>
      </div>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning.';
  if (h < 17) return 'Good afternoon.';
  return 'Good evening.';
}

function partnerStateEmoji(state: string): string {
  if (state === 'Good') return '🟢';
  if (state === 'Shaky') return '🟡';
  if (state === 'Fell') return '🤎';
  return '💬';
}

function partnerStateStyle(state: string): string {
  if (state === 'Good') return 'bg-teal-100 dark:bg-teal-900';
  if (state === 'Shaky') return 'bg-amber-100 dark:bg-amber-900';
  if (state === 'Fell') return 'bg-stone-100 dark:bg-stone-800';
  return 'bg-stone-100 dark:bg-stone-800';
}

function partnerStateLabel(state: string): string {
  if (state === 'Good') return ' — doing good.';
  if (state === 'Shaky') return ' — feeling shaky.';
  if (state === 'Fell') return ' — had a fall, but showed up honestly.';
  return '.';
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}
