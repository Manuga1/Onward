import { createSupabaseServerClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { EggRoomClient } from './EggRoomClient';

export default async function EggRoomPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/signup');

  // Fetch member's current pod
  const { data: podMembership } = await supabase
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
    const { data: members } = await supabase
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
    const { createSupabaseServiceClient } = await import('@/lib/db/service');
    const serviceSupabase = createSupabaseServiceClient();
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
