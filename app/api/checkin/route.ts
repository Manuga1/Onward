import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/server';
import { computeStreak } from '@/packages/core/streak';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { partnershipId, state, windowId } = await req.json();

  if (!['Good', 'Shaky', 'Fell'].includes(state)) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
  }

  // Verify user is in this partnership
  const { data: membership } = await supabase
    .from('partnership_members')
    .select('partnership_id')
    .eq('member_id', user.id)
    .eq('partnership_id', partnershipId)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: 'Not in this partnership' }, { status: 403 });

  // No duplicate check-ins for the same window
  const { data: existing } = await supabase
    .from('check_ins')
    .select('check_in_id')
    .eq('member_id', user.id)
    .eq('window_id', windowId)
    .maybeSingle();

  if (existing) return NextResponse.json({ error: 'Already checked in for this window' }, { status: 409 });

  // HUMAN-OWNED: encrypt state before storing (app-layer field encryption)
  // For Phase 1 pilot, storing plaintext with a note — replace with KMS encryption before launch
  const stateEncrypted = state; // HUMAN-OWNED: encrypt this field

  const { error } = await supabase.from('check_ins').insert({
    member_id: user.id,
    partnership_id: partnershipId,
    state_encrypted: stateEncrypted,
    window_id: windowId,
  });

  if (error) {
    console.error('[checkin]', error.code);
    return NextResponse.json({ error: 'Failed to save check-in' }, { status: 500 });
  }

  // Recompute streak and update partnership
  const { data: allCheckIns } = await supabase
    .from('check_ins')
    .select('*')
    .eq('member_id', user.id)
    .eq('partnership_id', partnershipId);

  const { data: partnership } = await supabase
    .from('partnerships')
    .select('started_at')
    .eq('partnership_id', partnershipId)
    .single();

  if (allCheckIns && partnership) {
    const domainCheckIns = allCheckIns.map((c: Record<string, unknown>) => ({
      checkInId: c.check_in_id as string,
      memberId: c.member_id as string,
      partnershipId: c.partnership_id as string,
      state: c.state_encrypted as 'Good' | 'Shaky' | 'Fell',
      windowId: c.window_id as string,
      at: new Date(c.submitted_at as string),
    }));

    const now = new Date();
    const { streakDays } = computeStreak({
      checkIns: domainCheckIns,
      memberId: user.id,
      partnershipStartedAt: new Date(partnership.started_at),
      clock: { now: () => now },
    });

    await supabase
      .from('partnerships')
      .update({ streak_days: streakDays, last_contact_at: now.toISOString() })
      .eq('partnership_id', partnershipId);
  }

  return NextResponse.json({ ok: true });
}
