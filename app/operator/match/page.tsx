// Operator-only page for manual matching during Phase 1 pilot.
// HUMAN-OWNED: Add authentication/authorization before exposing this route.
// In production, protect with Supabase service-role check + operator role.

import { createSupabaseServerClient } from '@/lib/db/server';
import { OperatorMatchClient } from './OperatorMatchClient';

export default async function OperatorMatchPage() {
  const supabase = await createSupabaseServerClient();

  // Fetch unmatched members waiting in pods
  const { data: pods } = await supabase
    .from('egg_pods')
    .select(`
      pod_id, fight, gender, ends_at,
      egg_pod_members(
        member_id,
        members(codename, intensity, stage, timezone, faith_preference)
      )
    `)
    .order('ends_at', { ascending: true });

  // Filter to members who are not yet in an active partnership
  const { data: matchedMembers } = await supabase
    .from('partnership_members')
    .select('member_id');

  const matchedIds = new Set((matchedMembers ?? []).map((m: Record<string, unknown>) => m.member_id as string));

  const unmatchedPods = (pods ?? []).map((pod: Record<string, unknown>) => ({
    ...pod,
    members: ((pod.egg_pod_members as Record<string, unknown>[]) ?? [])
      .filter((epm: Record<string, unknown>) => !matchedIds.has(epm.member_id as string))
      .map((epm: Record<string, unknown>) => ({
        memberId: epm.member_id as string,
        ...((epm.members as Record<string, unknown>) ?? {}),
      })),
  })).filter((pod: Record<string, unknown>) => (pod.members as unknown[]).length >= 2);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <OperatorMatchClient pods={unmatchedPods as any} />;
}
