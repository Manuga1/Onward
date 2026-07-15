// Minimal Resend email sender using the REST API (no SDK dependency).
// Requires RESEND_API_KEY. Sends from the verified onwardct.com domain.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[email] RESEND_API_KEY not set — skipping send');
    return;
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from ?? 'Onward <noreply@onwardct.com>',
      to,
      subject,
      html,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[email] send failed', res.status, body.slice(0, 200));
  }
}
