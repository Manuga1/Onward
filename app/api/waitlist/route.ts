import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/db/service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (typeof email !== 'string' || !email.includes('@') || email.length > 254) {
      return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();
    const service = createSupabaseServiceClient();

    const { error } = await service
      .from('waitlist')
      .upsert({ email: normalized }, { onConflict: 'email' });

    if (error) {
      console.error('[waitlist]', error.code, error.message);
      return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[waitlist] crash', msg);
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
  }
}
