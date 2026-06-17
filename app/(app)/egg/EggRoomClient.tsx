'use client';

import { Users, Clock, Heart } from 'lucide-react';

interface EggRoomClientProps {
  pod: Record<string, unknown> | null;
  podMembers: { codename: string }[];
}

export function EggRoomClient({ pod, podMembers }: EggRoomClientProps) {
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
          {podMembers.map(m => (
            <div key={m.codename}
              className="bg-white dark:bg-stone-900 rounded-xl px-4 py-3 border border-stone-200 dark:border-stone-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-teal-700 dark:text-teal-300 text-sm font-mono font-medium">
                {m.codename[0]}
              </div>
              <span className="font-mono text-sm text-stone-700 dark:text-stone-300">{m.codename}</span>
            </div>
          ))}
        </div>

        {/* Not-medical disclaimer as persistent banner */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
          Onward is peer accountability support, not therapy or medical treatment.
        </div>

        {/* What to do */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 space-y-3">
          <h2 className="font-medium text-stone-800 dark:text-stone-200 flex items-center gap-2">
            <Heart className="w-4 h-4 text-teal-500" />
            What to do this week
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
          <p>We'll place you in a small group of {'{'}4–6{'}'} people.</p>
          <p>You'll have a week to talk and choose a partner.</p>
          <p>Matching is mutual — everyone chooses.</p>
        </div>
      </div>
    </div>
  );
}
