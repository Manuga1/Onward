import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/server';

const ADJECTIVES = ['Cedar', 'River', 'Stone', 'Amber', 'Birch', 'Sage', 'Oak', 'Elm', 'Maple', 'Pine'];
const NOUNS = ['Trail', 'Peak', 'Valley', 'Ridge', 'Meadow', 'Creek', 'Glen', 'Cove', 'Bluff', 'Forge'];

function generateCodename(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}-${num}`;
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { gender, intensity, stage, timezone, checkinHour, faithPreference } = body;

  if (!gender || !intensity || !stage || !timezone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Upsert member profile (uses auth user ID as memberId)
  const codename = generateCodename();
  const { error } = await supabase
    .from('members')
    .upsert({
      member_id: user.id,
      codename,
      phone_encrypted: 'PENDING', // HUMAN-OWNED: encrypt phone before storing
      phone_hash: 'PENDING',       // HUMAN-OWNED: hash phone before storing
      fight: 'Porn',
      gender,
      intensity,
      stage,
      timezone,
      checkin_hour: checkinHour ?? 21,
      faith_preference: faithPreference || null,
    }, { onConflict: 'member_id' });

  if (error) {
    console.error('[onboarding]', error.code); // no PII in logs
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
