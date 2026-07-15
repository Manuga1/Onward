import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/db/service';
import { sendEmail } from '@/lib/email/resend';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'admin@onwardct.com';

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

    // Fire confirmation + admin notification. Best-effort — never block or fail
    // the signup if email delivery has a hiccup.
    await Promise.allSettled([
      sendEmail({
        to: normalized,
        subject: "You're on the Onward waitlist",
        html: `
          <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto; color: #1c1917;">
            <h1 style="font-size: 22px;">You're on the list 🌱</h1>
            <p style="color: #57534e; line-height: 1.6;">
              Thanks for joining the Onward waitlist. Onward is anonymous, one-on-one
              accountability for recovery — real human support that can't be silently deleted.
            </p>
            <p style="color: #57534e; line-height: 1.6;">
              We're opening in small cohorts and will email you the moment a spot is ready for you.
              You don't need to do anything else for now.
            </p>
            <p style="color: #a8a29e; font-size: 13px; margin-top: 24px;">
              If you didn't sign up, you can safely ignore this email.
            </p>
          </div>
        `,
      }),
      sendEmail({
        to: ADMIN_EMAIL,
        subject: `New waitlist signup: ${normalized}`,
        html: `<p>New Onward waitlist signup:</p><p><strong>${normalized}</strong></p>`,
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[waitlist] crash', msg);
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
  }
}
