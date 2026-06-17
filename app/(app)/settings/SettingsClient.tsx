'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authFetch } from '@/lib/db/authFetch';

interface SettingsClientProps {
  codename: string;
  timezone: string;
  checkinHour: number;
  stage: string;
}

export function SettingsClient({ codename, timezone, checkinHour, stage }: SettingsClientProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');

  async function handlePause() {
    setPausing(true);
    setError('');
    try {
      const res = await authFetch('/api/account/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 7 }),
      });
      if (res.ok) {
        setPaused(true);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Could not pause. Try again.');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setPausing(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleting(true);
    setError('');
    try {
      const res = await authFetch('/api/account/delete', { method: 'POST' });
      if (res.ok) {
        router.push('/signup');
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Deletion failed. Try again.');
        setDeleting(false);
        setDeleteConfirm(false);
      }
    } catch {
      setError('Network error. Try again.');
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 p-6">
      <div className="max-w-md mx-auto space-y-6">
        <header className="flex items-center gap-3">
          <Link href="/home" className="text-stone-400 hover:text-stone-600 text-sm">← Back</Link>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Settings</h1>
        </header>

        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800">
          <Row label="Codename" value={codename} mono />
          <Row label="Timezone" value={timezone} />
          <Row label="Check-in hour" value={formatHour(checkinHour)} />
          <Row label="Stage" value={stage} />
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        {/* Pause / delete */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800">
          <div className="px-4 py-4">
            <p className="font-medium text-stone-800 dark:text-stone-200 text-sm">Pause</p>
            <p className="text-xs text-stone-400 mt-0.5">Pause your partnership for up to 7 days. Instant, no explanation needed.</p>
            {paused ? (
              <p className="mt-2 text-sm text-teal-600 dark:text-teal-400">✓ Partnership paused for 7 days.</p>
            ) : (
              <button
                onClick={handlePause}
                disabled={pausing}
                className="mt-2 text-sm text-amber-600 hover:text-amber-700 font-medium disabled:opacity-50"
              >
                {pausing ? 'Pausing…' : 'Pause my partnership'}
              </button>
            )}
          </div>
          <div className="px-4 py-4">
            <p className="font-medium text-red-600 text-sm">Delete account</p>
            <p className="text-xs text-stone-400 mt-0.5">Permanently deletes your account and all data. This can't be undone.</p>
            {deleteConfirm ? (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-red-600 font-medium">Are you sure? This is permanent.</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-1.5 rounded-lg font-medium"
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete everything'}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="text-sm text-stone-500 hover:text-stone-700 px-3 py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleDelete}
                className="mt-2 text-sm text-red-500 hover:text-red-700 font-medium"
              >
                Request account deletion
              </button>
            )}
          </div>
        </div>

        {/* Not-medical disclaimer */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
          <p>Onward is peer accountability support, not medical or clinical treatment.</p>
          <p>Crisis resources: <strong>988</strong> · Text HOME to <strong>741741</strong> · SAMHSA <strong>1-800-662-4357</strong></p>
        </div>

        {/* HUMAN-OWNED: Link to ToS and Privacy Policy */}
        <p className="text-center text-xs text-stone-400">
          Terms of Service · Privacy Policy — pending legal review
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-stone-500 dark:text-stone-400">{label}</span>
      <span className={`text-sm text-stone-800 dark:text-stone-200 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function formatHour(h: number): string {
  const hour = h % 12 || 12;
  return `${hour}:00 ${h < 12 ? 'AM' : 'PM'}`;
}
