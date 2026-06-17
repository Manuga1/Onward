import { createSupabaseServerClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/signup');

  const { data: member } = await supabase
    .from('members')
    .select('codename, timezone, checkin_hour, stage')
    .eq('member_id', user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 p-6">
      <div className="max-w-md mx-auto space-y-6">
        <header className="flex items-center gap-3">
          <Link href="/home" className="text-stone-400 hover:text-stone-600 text-sm">← Back</Link>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Settings</h1>
        </header>

        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800">
          <Row label="Codename" value={member?.codename ?? '—'} mono />
          <Row label="Timezone" value={member?.timezone ?? '—'} />
          <Row label="Check-in hour" value={member ? formatHour(member.checkin_hour) : '—'} />
          <Row label="Stage" value={member?.stage ?? '—'} />
        </div>

        {/* Pause / delete */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800">
          <div className="px-4 py-4">
            <p className="font-medium text-stone-800 dark:text-stone-200 text-sm">Pause</p>
            <p className="text-xs text-stone-400 mt-0.5">Pause your partnership for up to 7 days. Instant, no explanation needed.</p>
            <button className="mt-2 text-sm text-amber-600 hover:text-amber-700 font-medium">Pause my partnership</button>
          </div>
          <div className="px-4 py-4">
            <p className="font-medium text-red-600 text-sm">Delete account</p>
            <p className="text-xs text-stone-400 mt-0.5">Permanently deletes your account and all data within 24 hours. This can't be undone.</p>
            <button className="mt-2 text-sm text-red-500 hover:text-red-700 font-medium">Request account deletion</button>
          </div>
        </div>

        {/* Not-medical disclaimer */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
          <p>Onward is peer accountability support, not medical or clinical treatment.</p>
          <p>Crisis resources: <strong>988</strong> · Text HOME to <strong>741741</strong> · SAMHSA <strong>1-800-662-4357</strong></p>
        </div>

        {/* HUMAN-OWNED: Link to ToS and Privacy Policy */}
        <p className="text-center text-xs text-stone-400">
          {/* HUMAN-OWNED: Replace with links to finalized ToS and Privacy Policy */}
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
