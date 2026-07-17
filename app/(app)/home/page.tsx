import { createSupabaseServerClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { PARTNER_DARK_THRESHOLD_DAYS } from '@/packages/core/streak';
import { decryptField } from '@/lib/crypto/fieldEncrypt';
import { HomeClient } from './HomeClient';

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
  const { data: membership } = await supabase
    .from('partnership_members')
    .select(`
      partnership_id,
      partnerships (
        streak_days, last_contact_at, is_active, paused_until
      )
    `)
    .eq('member_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect('/egg');

  const partnershipId = membership.partnership_id;
  const partnershipData = membership.partnerships as unknown as Record<string, unknown> | null;
  const streakDays = (partnershipData?.streak_days as number) ?? 0;
  const isPaused = partnershipData?.paused_until
    ? new Date(partnershipData.paused_until as string) > new Date()
    : false;

  // Get today's check-in status (window_id = local date in member's timezone)
  const todayLocal = new Date().toLocaleDateString('en-CA', { timeZone: member.timezone });
  const { data: todayCheckIn } = await supabase
    .from('check_ins')
    .select('state_encrypted')
    .eq('member_id', user.id)
    .eq('window_id', todayLocal)
    .maybeSingle();

  const checkedInToday = !!todayCheckIn;

  // Detect partner dark: check partner's recent check-ins
  const { data: partnerRows } = await supabase
    .from('partnership_members')
    .select('member_id')
    .eq('partnership_id', partnershipId)
    .neq('member_id', user.id);

  const partnerId = (partnerRows?.[0] as Record<string, unknown> | undefined)?.member_id as string | undefined;

  let partnerDarkDays = 0;
  if (partnerId) {
    // Count how many of the last N windows the partner missed
    const cutoff = new Date(Date.now() - PARTNER_DARK_THRESHOLD_DAYS * 86400_000).toISOString();
    const { data: partnerCheckIns } = await supabase
      .from('check_ins')
      .select('window_id')
      .eq('member_id', partnerId)
      .eq('partnership_id', partnershipId)
      .gte('submitted_at', cutoff);

    if ((partnerCheckIns ?? []).length === 0) {
      // No check-ins in the threshold window — partner may be dark
      const { data: partnerLastCheckIn } = await supabase
        .from('check_ins')
        .select('submitted_at')
        .eq('member_id', partnerId)
        .eq('partnership_id', partnershipId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (partnerLastCheckIn) {
        const daysSince = Math.floor(
          (Date.now() - new Date(partnerLastCheckIn.submitted_at as string).getTime()) / 86400_000
        );
        partnerDarkDays = daysSince;
      }
    }
  }

  const partnerDark = partnerDarkDays >= PARTNER_DARK_THRESHOLD_DAYS;

  // Partner's most recent check-in state (partner sees status, not history — per spec)
  let partnerState: string | null = null;
  let partnerCheckInAt: string | null = null;
  if (partnerId) {
    const { data: latest } = await supabase
      .from('check_ins')
      .select('state_encrypted, submitted_at')
      .eq('member_id', partnerId)
      .eq('partnership_id', partnershipId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest) {
      try { partnerState = await decryptField(latest.state_encrypted as string); } catch { /* skip */ }
      partnerCheckInAt = latest.submitted_at as string;
    }
  }

  return (
    <HomeClient
      codename={member.codename}
      streakDays={streakDays}
      checkedInToday={checkedInToday}
      partnershipId={partnershipId}
      partnerDark={partnerDark}
      isPaused={isPaused}
      partnerState={partnerState}
      partnerCheckInAt={partnerCheckInAt}
    />
  );
}
