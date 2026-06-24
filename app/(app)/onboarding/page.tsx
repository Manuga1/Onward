'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/db/client';
import type { Gender, Intensity, Stage, FaithPreference } from '@/packages/core/types';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
];

const CHECK_IN_HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 || 12;
  const ampm = i < 12 ? 'AM' : 'PM';
  return { value: i, label: `${h}:00 ${ampm}` };
});

interface ProfileForm {
  gender: Gender | '';
  intensity: Intensity | '';
  stage: Stage | '';
  timezone: string;
  checkinHour: number;
  faithPreference: FaithPreference | '';
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ProfileForm>({
    gender: '',
    intensity: '',
    stage: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    checkinHour: 21,
    faithPreference: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const steps = [
    <GenderStep key="gender" value={form.gender} onChange={v => setForm(f => ({ ...f, gender: v }))} />,
    <IntensityStep key="intensity" value={form.intensity} onChange={v => setForm(f => ({ ...f, intensity: v }))} />,
    <StageStep key="stage" value={form.stage} onChange={v => setForm(f => ({ ...f, stage: v }))} />,
    <TimezoneStep key="tz" timezone={form.timezone} checkinHour={form.checkinHour}
      onTimezoneChange={v => setForm(f => ({ ...f, timezone: v }))}
      onHourChange={v => setForm(f => ({ ...f, checkinHour: v }))} />,
    <FaithStep key="faith" value={form.faithPreference} onChange={v => setForm(f => ({ ...f, faithPreference: v }))} />,
  ];

  const canProceed = () => {
    if (step === 0) return form.gender !== '';
    if (step === 1) return form.intensity !== '';
    if (step === 2) return form.stage !== '';
    if (step === 3) return form.timezone !== '';
    return true; // faith is optional
  };

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        let msg = 'Failed to save profile';
        try { msg = (await res.json()).error || msg; } catch { /* empty body */ }
        throw new Error(msg);
      }
      router.push('/egg');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-950 p-6">
      <div className="max-w-md w-full space-y-6">
        {/* Progress bar */}
        <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-teal-500' : 'bg-stone-200 dark:bg-stone-700'}`} />
          ))}
        </div>

        {steps[step]}

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        <button
          onClick={handleNext}
          disabled={!canProceed() || loading}
          className="w-full py-3 rounded-xl font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Saving…' : step < steps.length - 1 ? 'Continue' : 'Join the cohort'}
        </button>

        {step === steps.length - 1 && (
          <button onClick={() => setStep(s => s - 1)} className="w-full text-sm text-stone-500 hover:text-stone-700">
            Back
          </button>
        )}
      </div>
    </div>
  );
}

function GenderStep({ value, onChange }: { value: string; onChange: (v: Gender) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">Your gender</h2>
      <p className="text-stone-500 text-sm">We use this to create same-gender accountability groups.</p>
      <OptionGroup options={[
        { value: 'Male', label: 'Man' },
        { value: 'Female', label: 'Woman' },
        { value: 'NonBinary', label: 'Non-binary / Other' },
      ]} selected={value} onSelect={v => onChange(v as Gender)} />
    </div>
  );
}

function IntensityStep({ value, onChange }: { value: string; onChange: (v: Intensity) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">How often?</h2>
      <p className="text-stone-500 text-sm">How frequently were you using pornography before starting this journey?</p>
      <OptionGroup options={[
        { value: 'Occasional', label: 'Occasionally', sub: 'A few times a month' },
        { value: 'Regular', label: 'Regularly', sub: 'A few times a week' },
        { value: 'Daily', label: 'Daily', sub: 'Once or more per day' },
        { value: 'MultipleDaily', label: 'Multiple times a day' },
      ]} selected={value} onSelect={v => onChange(v as Intensity)} />
    </div>
  );
}

function StageStep({ value, onChange }: { value: string; onChange: (v: Stage) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">Where are you?</h2>
      <p className="text-stone-500 text-sm">Roughly how far into this journey are you right now?</p>
      <OptionGroup options={[
        { value: 'Day1', label: 'Just starting', sub: 'Day 1' },
        { value: 'Week1', label: 'First week', sub: 'Days 2–7' },
        { value: 'ThirtyDays', label: 'Building momentum', sub: 'Week 2 – Day 30' },
        { value: 'NinetyPlus', label: 'Deep in it', sub: '30+ days' },
      ]} selected={value} onSelect={v => onChange(v as Stage)} />
    </div>
  );
}

function TimezoneStep({ timezone, checkinHour, onTimezoneChange, onHourChange }: {
  timezone: string; checkinHour: number;
  onTimezoneChange: (v: string) => void; onHourChange: (v: number) => void;
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">Your check-in time</h2>
      <p className="text-stone-500 text-sm">Choose a time that works for you. You'll have a 2-hour window to check in each day.</p>
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-1 block">Timezone</span>
          <select value={timezone} onChange={e => onTimezoneChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500">
            {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-1 block">Check-in window starts at</span>
          <select value={checkinHour} onChange={e => onHourChange(parseInt(e.target.value))}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500">
            {CHECK_IN_HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
          </select>
        </label>
        <p className="text-xs text-stone-400">You can change this anytime in settings.</p>
      </div>
    </div>
  );
}

function FaithStep({ value, onChange }: { value: string; onChange: (v: FaithPreference | '') => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">Faith preference</h2>
      <p className="text-stone-500 text-sm">Optional. We use this to connect you with compatible partners.</p>
      <OptionGroup options={[
        { value: 'Secular', label: 'Secular approach' },
        { value: 'FaithBased', label: 'Faith-based approach' },
        { value: 'NoPreference', label: 'No preference' },
        { value: '', label: 'Prefer not to say' },
      ]} selected={value} onSelect={v => onChange(v as FaithPreference | '')} />
    </div>
  );
}

function OptionGroup({ options, selected, onSelect }: {
  options: { value: string; label: string; sub?: string }[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map(opt => (
        <button key={opt.value} onClick={() => onSelect(opt.value)}
          className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-colors ${
            selected === opt.value
              ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-100'
              : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:border-stone-300'
          }`}>
          <span className="font-medium">{opt.label}</span>
          {opt.sub && <span className="text-sm text-stone-400 dark:text-stone-500 ml-2">{opt.sub}</span>}
        </button>
      ))}
    </div>
  );
}
