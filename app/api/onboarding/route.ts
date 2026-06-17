import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/db/getUser';
import { encryptField, hashForUniqueness } from '@/lib/crypto/fieldEncrypt';

const ADJECTIVES = ['Cedar', 'River', 'Stone', 'Amber', 'Birch', 'Sage', 'Oak', 'Elm', 'Maple', 'Pine'];

function generateCodename(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}-${num}`;
}

export async function POST(req: NextRequest) {
  const { user, supabase } = await getUserFromRequest(req);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { gender, intensity, stage, timezone, checkinHour, faithPreference } = body;

  if (!gender || !intensity || !stage || !timezone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const codename = generateCodename();
  const phone = user.phone ?? '';
  const [phoneEncrypted, phoneHash] = await Promise.all([
    encryptField(phone),
    hashForUniqueness(phone),
  ]);

  const { error } = await supabase
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
    console.error('[onboarding]', error.code);
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
