import { createSupabaseServerClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Flame } from 'lucide-react';

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/signup');

  const { data: member } = await supabase
    .from('members')
    .select('codename, timezone, checkin_hour')
    .eq('member_id', user.id)
    .maybeSingle();

  if (!member) redirect('/onboarding');

  // Get partnership + streak
  const { data: partnership } = await supabase
    .from('partnership_members')
    .select(`
      partnership_id,
      partnerships (
        streak_days, last_contact_at, is_active
      )
    `)
    .eq('member_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!partnership) redirect('/egg');

  const partnershipData = partnership.partnerships as unknown as Record<string, unknown> | null;
  const streakDays = (partnershipData?.streak_days as number) ?? 0;

  // Get today's check-in status
  const windowId = new Date().toISOString().slice(0, 10);
  const { data: todayCheckIn } = await supabase
    .from('check_ins')
    .select('state_encrypted')
    .eq('member_id', user.id)
    .eq('window_id', windowId)
    .maybeSingle();

  const checkedInToday = !!todayCheckIn;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 p-6">
      <div className="max-w-md mx-auto space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400 font-mono">{member.codename}</p>
            <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
              {greeting()}
            </h1>
          </div>
          <Link href="/settings" className="text-sm text-stone-400 hover:text-stone-600">Settings</Link>
        </header>

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

        {/* Founding cohort banner */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-600 dark:text-stone-400">
          <span className="font-medium text-stone-800 dark:text-stone-200">Founding cohort</span>
          {' '}— You're part of our research pilot. Your experience shapes what Onward becomes.
        </div>

        {/* Not-medical disclaimer */}
        <p className="text-center text-xs text-stone-400">
          Onward is peer accountability support, not medical or clinical treatment.{' '}
          <span className="underline cursor-pointer">Get help now</span>
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
