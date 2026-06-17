// HUMAN-OWNED: Replace with real Stripe Identity adapter before launch.
// This stub always returns passed=true for local development ONLY.
// NEVER ship this stub to production.

import type { VerificationAdapter, VerificationResult, VerificationSession } from './interface';

export const stubVerificationAdapter: VerificationAdapter = {
  async startSession(memberId: string): Promise<VerificationSession> {
    // HUMAN-OWNED: Replace with Stripe Identity session creation
    return {
      sessionId: `stub_session_${memberId}_${Date.now()}`,
      sessionUrl: '/verify/stub-redirect',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };
  },

  async checkResult(sessionId: string): Promise<VerificationResult> {
    // HUMAN-OWNED: Replace with real Stripe Identity result check
    return {
      passed: true,
      verifierTxnId: `stub_txn_${sessionId}`,
      uniquenessHash: `stub_hash_${sessionId}`,
    };
  },
};
