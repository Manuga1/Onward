// HUMAN-OWNED: Wire to Stripe Identity (or chosen vendor) before launch.
// Do NOT implement real verification logic here — this is scaffolding only.
// A human must review vendor contract, data handling, and legal requirements first.

export interface VerificationResult {
  passed: boolean;
  verifierTxnId: string;
  /** One-way hash of the verified identity. Used to prevent re-registration under a new account.
   *  The source data (ID, selfie, DOB) is NEVER stored — only this hash. */
  uniquenessHash: string;
}

export interface VerificationSession {
  sessionId: string;
  sessionUrl: string;
  expiresAt: Date;
}

export interface VerificationAdapter {
  /** Create a new verification session for the member. Returns a redirect URL. */
  startSession(memberId: string): Promise<VerificationSession>;
  /** Poll or webhook-callback to retrieve the result of a session. */
  checkResult(sessionId: string): Promise<VerificationResult>;
}
