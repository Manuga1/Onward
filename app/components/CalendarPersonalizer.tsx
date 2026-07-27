'use client';

import { useState } from 'react';
import { CalendarClock, Sparkles, Upload, ShieldCheck } from 'lucide-react';
import { parseIcsToBusyBlocks } from '@/lib/schedule/ics';
import {
  computeConsistentTime,
  computeDailyTimes,
  type DailyRecommendation,
} from '@/packages/core';

export type CheckinMode = 'fixed' | 'ai_consistent' | 'ai_daily';

interface Props {
  checkinHour: number;
  onHourChange: (h: number) => void;
  mode: CheckinMode;
  onModeChange: (m: CheckinMode) => void;
  onRecommendationsChange: (recs: DailyRecommendation[]) => void;
}

function fmt(hour: number, minute = 0): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${String(minute).padStart(2, '0')} ${ampm}`;
}

export function CalendarPersonalizer({
  checkinHour,
  onHourChange,
  mode,
  onModeChange,
  onRecommendationsChange,
}: Props) {
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [consistent, setConsistent] = useState<{ hour: number; minute: number } | null>(null);
  const [daily, setDaily] = useState<DailyRecommendation[] | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setParsing(true);
    try {
      const text = await file.text();
      const now = new Date();
      // All parsing + optimization happens here, on-device. Only times are used.
      const busy = parseIcsToBusyBlocks(text, now, 14);
      const clock = { now: () => now };
      const best = computeConsistentTime(busy, clock);
      const perDay = computeDailyTimes(busy, clock);
      setConsistent(best);
      setDaily(perDay);
      onRecommendationsChange(perDay);
      // Default to the consistent recommendation once we have one.
      onModeChange('ai_consistent');
      onHourChange(best.hour);
    } catch {
      setError('Could not read that file. Make sure it\'s a .ics calendar export.');
    } finally {
      setParsing(false);
      e.target.value = ''; // allow re-upload of same file
    }
  }

  return (
    <div className="space-y-4">
      {/* Manual time picker (always available) */}
      <label className="block">
        <span className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-1 block">
          Check-in window starts at
        </span>
        <select
          value={checkinHour}
          onChange={e => { onHourChange(parseInt(e.target.value)); if (mode !== 'fixed') onModeChange('fixed'); }}
          className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>{fmt(i)}</option>
          ))}
        </select>
      </label>

      {/* Calendar personalization (optional add-on) */}
      <div className="rounded-2xl border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20 p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
              Let AI pick your best time <span className="text-teal-600 dark:text-teal-400">(recommended)</span>
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Upload your calendar and we&apos;ll find when you&apos;re actually free.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs text-stone-500 dark:text-stone-400 bg-white/60 dark:bg-stone-900/40 rounded-lg px-3 py-2">
          <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
          <span>
            Your calendar is read <strong>on your device only</strong>. We keep just the free/busy
            times — never event names, locations, or people. Nothing is uploaded.
          </span>
        </div>

        <label className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-teal-300 dark:border-teal-700 text-sm font-medium text-teal-700 dark:text-teal-300 cursor-pointer hover:bg-teal-100/50 dark:hover:bg-teal-900/20 transition-colors">
          <Upload className="w-4 h-4" />
          {parsing ? 'Reading…' : consistent ? 'Upload a different calendar' : 'Upload calendar (.ics)'}
          <input type="file" accept=".ics,text/calendar" onChange={handleFile} className="hidden" />
        </label>
        {error && <p className="text-xs text-red-500">{error}</p>}

        <p className="text-[11px] text-stone-400 leading-relaxed">
          Export from Google Calendar (Settings → Import &amp; export) or Apple Calendar (File → Export).
        </p>

        {/* Recommendations */}
        {consistent && daily && (
          <div className="space-y-2 pt-1">
            <ModeOption
              active={mode === 'ai_consistent'}
              onClick={() => { onModeChange('ai_consistent'); onHourChange(consistent.hour); }}
              icon={<CalendarClock className="w-4 h-4" />}
              title={`One consistent time — ${fmt(consistent.hour, consistent.minute)}`}
              desc="Best for building a habit. Same time every day, when you're usually free."
            />
            <ModeOption
              active={mode === 'ai_daily'}
              onClick={() => onModeChange('ai_daily')}
              icon={<Sparkles className="w-4 h-4" />}
              title="Optimized each day"
              desc="A tailored time per day around your schedule. We tell you the night before."
            />
            <ModeOption
              active={mode === 'fixed'}
              onClick={() => onModeChange('fixed')}
              icon={<CalendarClock className="w-4 h-4" />}
              title={`Keep my own time — ${fmt(checkinHour)}`}
              desc="Ignore the suggestion and use the time I picked above."
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ModeOption({
  active, onClick, icon, title, desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl px-3 py-2.5 border flex items-start gap-2.5 transition-colors ${
        active
          ? 'border-teal-400 bg-white dark:bg-stone-900 dark:border-teal-600'
          : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
      }`}
    >
      <div className={`mt-0.5 flex-shrink-0 ${active ? 'text-teal-600 dark:text-teal-400' : 'text-stone-400'}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{title}</p>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{desc}</p>
      </div>
    </button>
  );
}
