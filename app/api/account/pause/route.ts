import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/server';

const MAX_PAUSE_DAYS = 7;

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { days = 7 } = await req.json().catch(() => ({}));
  if (typeof days !== 'number' || days < 1 || days > MAX_PAUSE_DAYS) {
    return NextResponse.json({ error: `days must be 1–${MAX_PAUSE_DAYS}` }, { status: 400 });
  }

  // Find active partnership
  const { data: membership } = await supabase
    .from('partnership_members')
    .select('partnership_id')
    .eq('member_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: 'No active partnership' }, { status: 404 });

  const resumeAt = new Date(Date.now() + days * 86400_000).toISOString();

  const { error } = await supabase
    .from('partnerships')
    .update({ paused_until: resumeAt })
    .eq('partnership_id', membership.partnership_id);

  if (error) {
    console.error('[account/pause]', error.code);
    return NextResponse.json({ error: 'Could not pause partnership' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, resumeAt });
}
