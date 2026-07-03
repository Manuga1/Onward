import { createSupabaseServerClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { EggRoomClient } from './EggRoomClient';

// Never cache — pod membership must always be read fresh per request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EggRoomPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/signup');

  // Use service-role client for pod reads — the egg_pod_members RLS policy is
  // self-referential (queries its own table), which Postgres blocks as recursion.
  // We've already authenticated the user via cookie, so reading their own pod is safe.
  const { createSupabaseServiceClient } = await import('@/lib/db/service');
  const serviceSupabase = createSupabaseServiceClient();

  // Fetch member's current pod
  const { data: podMembership } = await serviceSupabase
    .from('egg_pod_members')
    .select(`
      pod_id,
      egg_pods (
        pod_id, starts_at: started_at, ends_at, fight, gender
      )
    `)
    .eq('member_id', user.id)
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const pod = podMembership?.egg_pods as unknown as Record<string, unknown> | null ?? null;

  // Fetch pod members (codenames only — no PII)
  let podMembers: { memberId: string; codename: string }[] = [];
  if (pod) {
    const { data: members } = await serviceSupabase
      .from('egg_pod_members')
      .select('member_id, members(codename)')
      .eq('pod_id', pod.pod_id as string);
    podMembers = (members ?? []).map((m: Record<string, unknown>) => ({
      memberId: m.member_id as string,
      codename: (m.members as Record<string, unknown>)?.codename as string ?? 'Anonymous',
    }));
  }

  // Fetch existing picks (so UI can pre-populate)
  // Uses service-role client because members have no SELECT policy on member_picks
  // (picks are private between members — only the member's own row is safe to read back)
  let existingPicks: string[] = [];
  if (pod) {
    const { data: picksRow } = await serviceSupabase
      .from('member_picks')
      .select('picks')
      .eq('member_id', user.id)
      .eq('pod_id', pod.pod_id as string)
      .maybeSingle();
    existingPicks = (picksRow?.picks as string[] | null) ?? [];
  }

  // Check if already matched
  const { data: partnership } = await supabase
    .from('partnership_members')
    .select('partnership_id')
    .eq('member_id', user.id)
    .limit(1)
    .maybeSingle();

  if (partnership) redirect('/home');

  return (
    <EggRoomClient
      pod={pod}
      podMembers={podMembers}
      myMemberId={user.id}
      existingPicks={existingPicks}
    />
  );
}
