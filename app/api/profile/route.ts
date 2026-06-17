import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/server';

const VALID_STAGES = ['Day1', 'Week1', 'ThirtyDays', 'NinetyPlus'];

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const allowed: Record<string, unknown> = {};

  if (body.stage !== undefined) {
    if (!VALID_STAGES.includes(body.stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
    }
    allowed.stage = body.stage;
  }

  if (body.timezone !== undefined) {
    // Validate IANA timezone string
    try { Intl.DateTimeFormat(undefined, { timeZone: body.timezone }); }
    catch { return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 }); }
    allowed.timezone = body.timezone;
  }

  if (body.checkinHour !== undefined) {
    const h = Number(body.checkinHour);
    if (!Number.isInteger(h) || h < 0 || h > 23) {
      return NextResponse.json({ error: 'checkinHour must be 0–23' }, { status: 400 });
    }
    allowed.checkin_hour = h;
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  const { error } = await supabase
    .from('members')
    .update(allowed)
    .eq('member_id', user.id);

  if (error) {
    console.error('[profile]', error.code);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
