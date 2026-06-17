// HUMAN-OWNED: Add operator authentication before launch.
// This route creates a partnership between 2–3 members (manual matching for Phase 1 pilot).

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/server';
import { stubPushAdapter } from '@/lib/push/stub';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  // HUMAN-OWNED: Verify caller is an authorized operator before proceeding
  // e.g., check for a service-role key or operator session

  const { memberIds } = await req.json();

  if (!Array.isArray(memberIds) || memberIds.length < 2 || memberIds.length > 3) {
    return NextResponse.json({ error: 'Must provide 2–3 memberIds' }, { status: 400 });
  }

  // Create the partnership
  const { data: partnership, error: pErr } = await supabase
    .from('partnerships')
    .insert({ streak_days: 0 })
    .select('partnership_id')
    .single();

  if (pErr || !partnership) {
    return NextResponse.json({ error: 'Failed to create partnership' }, { status: 500 });
  }

  // Add all members
  const { error: mErr } = await supabase.from('partnership_members').insert(
    memberIds.map((id: string) => ({
      partnership_id: partnership.partnership_id,
      member_id: id,
    }))
  );

  if (mErr) {
    // Rollback partnership
    await supabase.from('partnerships').delete().eq('partnership_id', partnership.partnership_id);
    return NextResponse.json({ error: 'Failed to add members' }, { status: 500 });
  }

  // Notify members they've been matched
  await Promise.allSettled(
    memberIds.map((id: string) =>
      stubPushAdapter.send({ type: 'MatchReady', memberId: id })
    )
  );

  return NextResponse.json({ ok: true, partnershipId: partnership.partnership_id });
}
