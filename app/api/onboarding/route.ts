import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/db/getUser';
import { createSupabaseServiceClient } from '@/lib/db/service';
import { encryptField, hashForUniqueness } from '@/lib/crypto/fieldEncrypt';

const ADJECTIVES = ['Cedar', 'River', 'Stone', 'Amber', 'Birch', 'Sage', 'Oak', 'Elm', 'Maple', 'Pine'];

function generateCodename(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}-${num}`;
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { gender, intensity, stage, timezone, checkinHour, faithPreference } = body;

    if (!gender || !intensity || !stage || !timezone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const serviceSupabase = createSupabaseServiceClient();

    // Fetch full user via admin API — JWT claims may omit email
    const { data: { user: fullUser } } = await serviceSupabase.auth.admin.getUserById(user.id);
    const identifier = fullUser?.email ?? fullUser?.phone ?? user.email ?? user.phone ?? '';

    const codename = generateCodename();
    const [phoneEncrypted, phoneHash] = await Promise.all([
      encryptField(identifier),
      hashForUniqueness(identifier),
    ]);

    const { error } = await serviceSupabase
      .from('members')
      .upsert({
        member_id: user.id,
        codename,
        phone_encrypted: phoneEncrypted,
        phone_hash: phoneHash,
        fight: 'Porn',
        gender,
        intensity,
        stage,
        timezone,
        checkin_hour: checkinHour ?? 21,
        faith_preference: faithPreference || null,
      }, { onConflict: 'member_id' });

    if (error) {
      console.error('[onboarding] db error', error.code, error.message);
      return NextResponse.json({ error: `DB: ${error.code} — ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[onboarding] crash', msg);
    return NextResponse.json({ error: `Crash: ${msg}` }, { status: 500 });
  }
}
