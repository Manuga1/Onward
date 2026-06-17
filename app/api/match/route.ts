// Automated matching endpoint — runs when an egg pod's window closes.
// Uses the §7 matching engine from /packages/core.
// HUMAN-OWNED: Trigger this via a Supabase scheduled function or cron job, not client calls.
// HUMAN-OWNED: Add operator auth before exposing this endpoint.

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/server';
import { matchPartners } from '@/packages/core/matching';
import { stubPushAdapter } from '@/lib/push/stub';
import { trackServer } from '@/lib/analytics/posthog';
import type { EggPod, Member } from '@/packages/core/types';

export async function POST(req: NextRequest) {
  // HUMAN-OWNED: Verify this is called by an authorized scheduler, not public clients
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { podId } = await req.json();
  if (!podId) return NextResponse.json({ error: 'podId required' }, { status: 400 });

  const supabase = await createSupabaseServerClient();

  // Load pod + members
  const { data: podRow } = await supabase
    .from('egg_pods')
    .select('pod_id, fight, gender, ends_at')
    .eq('pod_id', podId)
    .single();

  if (!podRow) return NextResponse.json({ error: 'Pod not found' }, { status: 404 });

  const { data: podMemberRows } = await supabase
    .from('egg_pod_members')
    .select(`
      member_id,
      members(member_id, codename, fight, gender, intensity, stage, timezone, faith_preference, created_at)
    `)
    .eq('pod_id', podId);

  if (!podMemberRows || podMemberRows.length < 2) {
    return NextResponse.json({ error: 'Not enough members to match' }, { status: 400 });
  }

  // Exclude already-matched members
  const { data: alreadyMatched } = await supabase
    .from('partnership_members')
    .select('member_id');
  const matchedIds = new Set((alreadyMatched ?? []).map((r: { member_id: string }) => r.member_id));

  const eligibleRows = podMemberRows.filter(
    (r: { member_id: string }) => !matchedIds.has(r.member_id)
  );

  if (eligibleRows.length < 2) {
    return NextResponse.json({ message: 'All members already matched', matched: 0 });
  }

  // Build domain types
  const members: Member[] = eligibleRows.map((r: Record<string, unknown>) => {
    const m = r.members as Record<string, unknown>;
    return {
      memberId: m.member_id as string,
      codename: m.codename as string,
      fight: (m.fight as Member['fight']) ?? 'Porn',
      gender: m.gender as Member['gender'],
      intensity: m.intensity as Member['intensity'],
      stage: m.stage as Member['stage'],
      timezone: (m.timezone as string) ?? 'America/New_York',
      faithPreference: m.faith_preference as Member['faithPreference'] | undefined,
      createdAt: new Date(m.created_at as string),
    };
  });

  const pod: EggPod = {
    podId: podRow.pod_id,
    members,
    fight: podRow.fight as Member['fight'],
    gender: podRow.gender as Member['gender'],
    startedAt: new Date(),
    endsAt: new Date(podRow.ends_at),
  };

  // Load picks submitted by members (stored in member_picks table)
  const { data: pickRows } = await supabase
    .from('member_picks')
    .select('member_id, picks')
    .eq('pod_id', podId);

  const picks = new Map<string, string[]>();
  for (const row of (pickRows ?? []) as { member_id: string; picks: string[] }[]) {
    picks.set(row.member_id, row.picks);
  }
  // Members who submitted no picks get an empty list (system will pair them)
  for (const m of members) {
    if (!picks.has(m.memberId)) picks.set(m.memberId, []);
  }

  // Run the matching engine
  const { matches, carryOver } = matchPartners({ pod, picks, now: new Date() });

  // Deduplicate: only create one partnership per pair
  const processed = new Set<string>();
  const created: string[] = [];

  for (const match of matches) {
    const pairKey = [match.memberId, match.partnerId].sort().join(':');
    if (processed.has(pairKey)) continue;
    processed.add(pairKey);

    // Find all members in this grouping (pair or trio)
    const groupMembers = matches
      .filter(m => m.memberId === match.memberId || m.partnerId === match.memberId)
      .flatMap(m => [m.memberId, m.partnerId]);
    const uniqueGroup = [...new Set(groupMembers)];

    // Create partnership
    const { data: partnership, error: pErr } = await supabase
      .from('partnerships')
      .insert({ streak_days: 0 })
      .select('partnership_id')
      .single();

    if (pErr || !partnership) continue;

    await supabase.from('partnership_members').insert(
      uniqueGroup.map(id => ({ partnership_id: partnership.partnership_id, member_id: id }))
    );

    created.push(partnership.partnership_id);

    // Notify each member (opaque push — no partner identity in payload)
    await Promise.allSettled(
      uniqueGroup.map(id => {
        trackServer({ event: 'partner_matched', memberId: id });
        return stubPushAdapter.send({ type: 'MatchReady', memberId: id });
      })
    );
  }

  return NextResponse.json({
    partnershipsCreated: created.length,
    carryOver: carryOver.length,
  });
}
