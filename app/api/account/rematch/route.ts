import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/server';
import { createClient } from '@supabase/supabase-js';
import { carryStreakToNewPartnership } from '@/packages/core/streak';

export async function POST(_req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find and deactivate current partnership, capturing streak
  const { data: membership } = await supabase
    .from('partnership_members')
    .select('partnership_id, partnerships(streak_days)')
    .eq('member_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: 'No active partnership' }, { status: 404 });

  const currentStreak = ((membership.partnerships as unknown as Record<string, unknown>)?.streak_days as number) ?? 0;
  const carriedStreak = carryStreakToNewPartnership(currentStreak);

  await serviceSupabase
    .from('partnerships')
    .update({ is_active: false })
    .eq('partnership_id', membership.partnership_id);

  // Mark member as requesting rematch (re-add to matching queue via a flag)
  await serviceSupabase
    .from('members')
    .update({ rematch_requested: true, carried_streak: carriedStreak })
    .eq('member_id', user.id);

  return NextResponse.json({ ok: true, carriedStreak });
}
