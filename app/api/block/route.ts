import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/server';
import { trackServer } from '@/lib/analytics/posthog';

// One-tap block — no explanation required, no notification to partner.
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { targetMemberId } = await req.json();
  if (!targetMemberId) return NextResponse.json({ error: 'targetMemberId required' }, { status: 400 });

  // Two-way block
  const { error } = await supabase.from('blocks').upsert([
    { blocker_id: user.id, blocked_id: targetMemberId },
    { blocker_id: targetMemberId, blocked_id: user.id },
  ], { onConflict: 'blocker_id,blocked_id' });

  if (error) {
    console.error('[block]', error.code);
    return NextResponse.json({ error: 'Failed to create block' }, { status: 500 });
  }

  // Deactivate any shared active partnership — silent, no notification to partner
  const { data: myMembership } = await supabase
    .from('partnership_members')
    .select('partnership_id')
    .eq('member_id', user.id)
    .maybeSingle();

  if (myMembership) {
    const { data: shared } = await supabase
      .from('partnership_members')
      .select('partnership_id')
      .eq('member_id', targetMemberId)
      .eq('partnership_id', myMembership.partnership_id)
      .maybeSingle();

    if (shared) {
      await supabase
        .from('partnerships')
        .update({ is_active: false })
        .eq('partnership_id', myMembership.partnership_id);
    }
  }

  trackServer({ event: 'block_created', memberId: user.id });

  return NextResponse.json({ ok: true });
}
