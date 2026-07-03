'use client';

import { useState } from 'react';
import { Users, Clock, Heart, Check } from 'lucide-react';

interface EggRoomClientProps {
  pod: Record<string, unknown> | null;
  podMembers: { memberId: string; codename: string }[];
  myMemberId: string;
  existingPicks: string[]; // memberIds already submitted
}

export function EggRoomClient({ pod, podMembers, myMemberId, existingPicks }: EggRoomClientProps) {
  if (!pod) {
    return <WaitingForPod />;
  }

  const endsAt = new Date(pod.ends_at as string);
  const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86400000));

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 p-6">
      <div className="max-w-md mx-auto space-y-6">
        <header className="space-y-1">
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-sm font-medium">Founding cohort · Week 1</span>
          </div>
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">Your group</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            Get to know each other this week. At the end, you'll each choose a partner.
          </p>
        </header>

        {/* Countdown */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 flex items-center gap-3">
          <Clock className="text-stone-400 w-5 h-5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
              {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} to choose` : 'Matching today'}
            </p>
            <p className="text-xs text-stone-400">Matching happens at the end of the week</p>
          </div>
        </div>

        {/* Pod members */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            In your group
          </h2>
          {podMembers.filter(m => m.memberId !== myMemberId).map(m => (
            <div key={m.codename}
              className="bg-white dark:bg-stone-900 rounded-xl px-4 py-3 border border-stone-200 dark:border-stone-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-teal-700 dark:text-teal-300 text-sm font-mono font-medium">
                {m.codename[0]}
              </div>
              <span className="font-mono text-sm text-stone-700 dark:text-stone-300">{m.codename}</span>
            </div>
          ))}
        </div>

        {/* Picks */}
        <PicksSection
          podMembers={podMembers.filter(m => m.memberId !== myMemberId)}
          podId={pod.pod_id as string}
          existingPicks={existingPicks}
        />

        {/* Not-medical disclaimer */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
          Onward is peer accountability support, not therapy or medical treatment.
        </div>

        {/* What to do */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 space-y-3">
          <h2 className="font-medium text-stone-800 dark:text-stone-200 flex items-center gap-2">
            <Heart className="w-4 h-4 text-teal-500" />
            What to do these few days
          </h2>
          <ul className="space-y-2 text-sm text-stone-600 dark:text-stone-400">
            <li>• Introduce yourself using your codename</li>
            <li>• Share what brought you here (as much as you're comfortable with)</li>
            <li>• Think about who you'd want as your accountability partner</li>
            <li>• Choices are private — no one knows who you picked</li>
          </ul>
        </div>

        <p className="text-center text-xs text-stone-400">
          Matching is handled by our team this week. You'll hear from us on{' '}
          {endsAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.
        </p>
      </div>
    </div>
  );
}

function PicksSection({
  podMembers,
  podId,
  existingPicks,
}: {
  podMembers: { memberId: string; codename: string }[];
  podId: string;
  existingPicks: string[];
}) {
  const [selected, setSelected] = useState<string[]>(existingPicks);
  const [saved, setSaved] = useState(existingPicks.length > 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const MAX_PICKS = 3;

  function toggle(memberId: string) {
    if (saved) return;
    setSelected(prev => {
      if (prev.includes(memberId)) return prev.filter(id => id !== memberId);
      if (prev.length >= MAX_PICKS) return prev;
      return [...prev, memberId];
    });
  }

  async function submit() {
    if (selected.length === 0) { setError('Choose at least one person.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ podId, picks: selected }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Could not save picks. Try again.');
      } else {
        setSaved(true);
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-2xl p-4 flex items-center gap-3">
        <Check className="w-5 h-5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-teal-700 dark:text-teal-300">Picks submitted</p>
          <p className="text-xs text-teal-600 dark:text-teal-400">Private — only used for matching, never shared.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 space-y-3">
      <div>
        <h2 className="font-medium text-stone-800 dark:text-stone-200 text-sm">Choose your partner</h2>
        <p className="text-xs text-stone-400 mt-0.5">
          Pick up to {MAX_PICKS} people in order of preference. This is completely private.
        </p>
      </div>
      <div className="space-y-2">
        {podMembers.map((m, i) => {
          const isSelected = selected.includes(m.memberId);
          const rank = selected.indexOf(m.memberId) + 1;
          return (
            <button
              key={m.memberId}
              onClick={() => toggle(m.memberId)}
              className={`w-full text-left rounded-xl px-4 py-3 border flex items-center gap-3 transition-colors ${
                isSelected
                  ? 'border-teal-400 bg-teal-50 dark:bg-teal-950/40 dark:border-teal-600'
                  : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                isSelected ? 'bg-teal-500 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-400'
              }`}>
                {isSelected ? rank : i + 1}
              </div>
              <span className="font-mono text-sm text-stone-700 dark:text-stone-300">{m.codename}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={submit}
        disabled={saving || selected.length === 0}
        className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
      >
        {saving ? 'Saving…' : 'Submit picks'}
      </button>
      <p className="text-center text-xs text-stone-400">
        You can change picks until matching runs.
      </p>
    </div>
  );
}

function WaitingForPod() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-950 p-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
          <Users className="w-8 h-8 text-teal-600 dark:text-teal-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">You're on the list</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed">
            We launch new cohorts weekly. We'll send you a text when your group is ready —
            usually within a few days.
          </p>
        </div>
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4 text-sm text-stone-600 dark:text-stone-400 space-y-1">
          <p className="font-medium text-stone-800 dark:text-stone-200">What happens next</p>
          <p>We'll place you in a small group of 4–6 people.</p>
          <p>You'll have a week to talk and choose a partner.</p>
          <p>Matching is mutual — everyone chooses.</p>
        </div>
      </div>
    </div>
  );
}
