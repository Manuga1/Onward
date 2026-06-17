// Stripe Identity adapter for age/identity verification.
// HUMAN-OWNED: Provide STRIPE_SECRET_KEY and STRIPE_IDENTITY_WEBHOOK_SECRET before launch.
// HUMAN-OWNED: Review Stripe Identity data handling agreement and DPA.
// HUMAN-OWNED: Decide whether to use liveness-only (faster) or government-ID step-up.
// This adapter is wired but will not function without real credentials.

import Stripe from 'stripe';
import type { VerificationAdapter, VerificationSession, VerificationResult } from './interface';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set. HUMAN-OWNED: Add this before launch.');
  }
  return new Stripe(key, { apiVersion: '2026-05-27.dahlia' });
}

export const stripeIdentityAdapter: VerificationAdapter = {
  async startSession(memberId: string): Promise<VerificationSession> {
    const stripe = getStripe();
    // metadata carries only opaque memberId — no PII
    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: { member_id: memberId },
      options: {
        document: {
          // Require a live capture — no uploads
          require_live_capture: true,
          // HUMAN-OWNED: decide whether to allow_uploading as a fallback
          allowed_types: ['driving_license', 'passport', 'id_card'],
        },
      },
      // Return URL after verification attempt
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/verify/callback`,
    });

    return {
      sessionId: session.id,
      sessionUrl: session.url ?? `${process.env.NEXT_PUBLIC_APP_URL}/verify/error`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };
  },

  async checkResult(sessionId: string): Promise<VerificationResult> {
    const stripe = getStripe();
    const session = await stripe.identity.verificationSessions.retrieve(sessionId);

    const passed = session.status === 'verified';

    // Build uniqueness hash from verified output — we never store raw identity data.
    // Stripe provides a stable `last_verification_report` with hashed outputs.
    // HUMAN-OWNED: Confirm the exact field to hash for uniqueness with Stripe support.
    const reportId = session.last_verification_report as string | null;
    const uniquenessSource = reportId ?? sessionId;
    const uniquenessHash = await sha256(uniquenessSource + (process.env.UNIQUENESS_HASH_SALT ?? ''));

    return {
      passed,
      verifierTxnId: sessionId,
      uniquenessHash,
    };
  },
};

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
