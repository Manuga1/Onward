import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(_req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Use service-role key for hard-delete (bypasses RLS)
  const serviceSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Deactivate any active partnerships before deletion
  const { data: memberships } = await serviceSupabase
    .from('partnership_members')
    .select('partnership_id')
    .eq('member_id', user.id);

  if (memberships?.length) {
    const ids = memberships.map((m: Record<string, unknown>) => m.partnership_id);
    await serviceSupabase
      .from('partnerships')
      .update({ is_active: false })
      .in('partnership_id', ids);
  }

  // Hard-delete the member row (cascades to check_ins, messages, etc. via FK)
  // The uniqueness_hash row persists as a tombstone to prevent re-registration
  const { error } = await serviceSupabase
    .from('members')
    .delete()
    .eq('member_id', user.id);

  if (error) {
    console.error('[account/delete]', error.code);
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 });
  }

  // Sign out the user
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
