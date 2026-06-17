import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/server';
import { stripeIdentityAdapter } from '@/lib/verify/stripe';
import { trackServer } from '@/lib/analytics/posthog';

// Start a verification session
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check if already verified
  const { data: member } = await supabase
    .from('members')
    .select('verified')
    .eq('member_id', user.id)
    .maybeSingle();

  if (member?.verified) {
    return NextResponse.json({ alreadyVerified: true });
  }

  try {
    const session = await stripeIdentityAdapter.startSession(user.id);
    trackServer({ event: 'verify_started', memberId: user.id });
    return NextResponse.json({ sessionUrl: session.sessionUrl, sessionId: session.sessionId });
  } catch (e) {
    // HUMAN-OWNED: Stripe Identity not yet configured — expected in dev
    console.error('[verify] start failed:', e instanceof Error ? e.message : 'unknown');
    return NextResponse.json({ error: 'Verification not configured. HUMAN-OWNED: add STRIPE_SECRET_KEY.' }, { status: 503 });
  }
}

// Webhook / callback to record result — called after Stripe redirects back
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) return NextResponse.json({ error: 'session_id required' }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await stripeIdentityAdapter.checkResult(sessionId);

    if (result.passed) {
      // Check uniqueness hash — prevent re-registration
      const { data: existing } = await supabase
        .from('members')
        .select('member_id')
        .eq('uniqueness_hash', result.uniquenessHash)
        .neq('member_id', user.id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: 'An account already exists with this identity.' }, { status: 409 });
      }

      await supabase.from('members').update({
        verified: true,
        verified_at: new Date().toISOString(),
        verifier_txn_id: result.verifierTxnId,
        uniqueness_hash: result.uniquenessHash,
      }).eq('member_id', user.id);

      trackServer({ event: 'verify_passed', memberId: user.id });
    } else {
      trackServer({ event: 'verify_failed', memberId: user.id });
    }

    return NextResponse.json({ passed: result.passed });
  } catch (e) {
    console.error('[verify] check failed:', e instanceof Error ? e.message : 'unknown');
    return NextResponse.json({ error: 'Failed to check verification result' }, { status: 500 });
  }
}
