import { createSupabaseServerClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { SettingsClient } from './SettingsClient';

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/signup');

  const { data: member } = await supabase
    .from('members')
    .select('codename, timezone, checkin_hour, stage')
    .eq('member_id', user.id)
    .maybeSingle();

  if (!member) redirect('/onboarding');

  return (
    <SettingsClient
      codename={member.codename}
      timezone={member.timezone}
      checkinHour={member.checkin_hour}
      stage={member.stage}
    />
  );
}
