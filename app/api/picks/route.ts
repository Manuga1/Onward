// Members submit their ranked partner picks during the egg phase.
// Picks are private — RLS prevents members from reading others' picks.

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/server';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { podId, picks } = await req.json();

  if (!podId) return NextResponse.json({ error: 'podId required' }, { status: 400 });
  if (!Array.isArray(picks) || picks.length > 3) {
    return NextResponse.json({ error: 'picks must be an array of up to 3 memberIds' }, { status: 400 });
  }

  // Verify member is in this pod
  const { data: membership } = await supabase
    .from('egg_pod_members')
    .select('pod_id')
    .eq('pod_id', podId)
    .eq('member_id', user.id)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: 'Not in this pod' }, { status: 403 });

  // Verify all picks are in the same pod
  if (picks.length > 0) {
    const { data: validMembers } = await supabase
      .from('egg_pod_members')
      .select('member_id')
      .eq('pod_id', podId)
      .in('member_id', picks);

    if ((validMembers?.length ?? 0) !== picks.length) {
      return NextResponse.json({ error: 'One or more picks are not in this pod' }, { status: 400 });
    }
  }

  const { error } = await supabase.from('member_picks').upsert({
    pod_id: podId,
    member_id: user.id,
    picks,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'pod_id,member_id' });

  if (error) {
    console.error('[picks]', error.code);
    return NextResponse.json({ error: 'Failed to save picks' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
