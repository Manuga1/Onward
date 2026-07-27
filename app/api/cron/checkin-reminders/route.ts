import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/db/service';
import { decryptField } from '@/lib/crypto/fieldEncrypt';
import { sendEmail } from '@/lib/email/resend';

export const dynamic = 'force-dynamic';

// Runs nightly (see vercel.json). For every 'ai_daily' member, emails them
// tomorrow's optimized check-in time so they know it the night before.
// Secured with CRON_SECRET (Vercel cron sends it as a Bearer token).

function fmt(hour: number, minute: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${String(minute).padStart(2, '0')} ${ampm}`;
}

// The member's "tomorrow" as a YYYY-MM-DD string in their own timezone.
function tomorrowLocal(timezone: string): string {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86_400_000);
  return tomorrow.toLocaleDateString('en-CA', { timeZone: timezone });
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createSupabaseServiceClient();

  const { data: members } = await service
    .from('members')
    .select('member_id, codename, timezone, phone_encrypted')
    .eq('checkin_mode', 'ai_daily');

  let sent = 0;

  for (const m of members ?? []) {
    const memberId = m.member_id as string;
    const timezone = (m.timezone as string) || 'America/New_York';
    const targetDate = tomorrowLocal(timezone);

    const { data: reco } = await service
      .from('checkin_recommendations')
      .select('hour, minute, notified_at')
      .eq('member_id', memberId)
      .eq('window_date', targetDate)
      .maybeSingle();

    if (!reco || reco.notified_at) continue;

    // Decrypt the stored contact email (identifier lives in phone_encrypted).
    let email = '';
    try { email = await decryptField(m.phone_encrypted as string); } catch { /* skip */ }
    if (!email || !email.includes('@')) continue;

    const time = fmt(reco.hour as number, (reco.minute as number) ?? 0);
    await sendEmail({
      to: email,
      subject: `Tomorrow's check-in: ${time}`,
      html: `
        <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto; color: #1c1917;">
          <h1 style="font-size: 20px;">Your check-in tomorrow is at ${time}</h1>
          <p style="color: #57534e; line-height: 1.6;">
            Based on your calendar, this is when you&apos;re most likely to have a free moment.
            You&apos;ll have a 2-hour window to check in with your partner.
          </p>
          <p style="color: #a8a29e; font-size: 13px; margin-top: 20px;">
            Prefer a fixed time? You can switch anytime in Settings.
          </p>
        </div>
      `,
    });

    await service
      .from('checkin_recommendations')
      .update({ notified_at: new Date().toISOString() })
      .eq('member_id', memberId)
      .eq('window_date', targetDate);

    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
