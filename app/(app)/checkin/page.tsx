import { createSupabaseServerClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { CheckInClient } from './CheckInClient';

export default async function CheckInPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/signup');

  // Get member's partnership and today's check-in
  const { data: member } = await supabase
    .from('members')
    .select('codename, timezone, checkin_hour, checkin_mode')
    .eq('member_id', user.id)
    .maybeSingle();

  if (!member) redirect('/onboarding');

  const { data: partnership } = await supabase
    .from('partnership_members')
    .select('partnership_id, partnerships(streak_days, last_contact_at, is_active)')
    .eq('member_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!partnership) redirect('/egg');

  const partnershipData = partnership.partnerships as unknown as Record<string, unknown> | null;
  const streakDays = (partnershipData?.streak_days as number) ?? 0;

  // Get today's window ID in member's local timezone (must match home page logic)
  const windowId = new Date().toLocaleDateString('en-CA', {
    timeZone: member?.timezone ?? 'America/New_York',
  });

  // For 'ai_daily' members, today's window starts at the calendar-optimized hour.
  let effectiveHour = member?.checkin_hour ?? 21;
  if (member?.checkin_mode === 'ai_daily') {
    const { createSupabaseServiceClient } = await import('@/lib/db/service');
    const { data: reco } = await createSupabaseServiceClient()
      .from('checkin_recommendations')
      .select('hour')
      .eq('member_id', user.id)
      .eq('window_date', windowId)
      .maybeSingle();
    if (reco?.hour !== undefined && reco?.hour !== null) effectiveHour = reco.hour as number;
  }

  // Check if already checked in today
  const { data: todayCheckIn } = await supabase
    .from('check_ins')
    .select('check_in_id, state_encrypted')
    .eq('member_id', user.id)
    .eq('window_id', windowId)
    .maybeSingle();

  return (
    <CheckInClient
      memberId={user.id}
      codename={member?.codename ?? 'Anonymous'}
      partnershipId={partnership.partnership_id}
      streakDays={streakDays}
      timezone={member?.timezone ?? 'America/New_York'}
      checkinHour={effectiveHour}
      alreadyCheckedIn={!!todayCheckIn}
      windowId={windowId}
    />
  );
}
