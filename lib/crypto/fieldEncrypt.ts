// App-layer field encryption for sensitive columns.
// HUMAN-OWNED: Choose a KMS provider and implement before launch.
// Options: Supabase Vault, AWS KMS, Google Cloud KMS, HashiCorp Vault.
//
// Fields requiring encryption:
//   members.phone_encrypted
//   members.email_encrypted
//   check_ins.state_encrypted
//   messages.text_encrypted

export class FieldEncryptionNotConfiguredError extends Error {
  constructor() {
    super('Field encryption is not configured. HUMAN-OWNED: wire KMS before launch.');
    this.name = 'FieldEncryptionNotConfiguredError';
  }
}

/**
 * Encrypt a plaintext string for storage in an encrypted column.
 * Returns a base64-encoded ciphertext string.
 *
 * HUMAN-OWNED: Replace with real KMS implementation.
 */
export async function encryptField(plaintext: string): Promise<string> {
  if (process.env.NODE_ENV === 'development' || process.env.SKIP_FIELD_ENCRYPTION === 'true') {
    // Dev-only passthrough — clearly marked, never ship to production without replacing
    return `UNENCRYPTED:${plaintext}`;
  }
  throw new FieldEncryptionNotConfiguredError();
}

/**
 * Decrypt a ciphertext string from an encrypted column.
 *
 * HUMAN-OWNED: Replace with real KMS implementation.
 */
export async function decryptField(ciphertext: string): Promise<string> {
  if (process.env.NODE_ENV === 'development' || process.env.SKIP_FIELD_ENCRYPTION === 'true') {
    if (ciphertext.startsWith('UNENCRYPTED:')) {
      return ciphertext.slice('UNENCRYPTED:'.length);
    }
    return ciphertext;
  }
  throw new FieldEncryptionNotConfiguredError();
}

/**
 * One-way hash for uniqueness checks (phone deduplication, re-registration detection).
 * Uses SHA-256 with a secret salt. Source data is never stored.
 */
export async function hashForUniqueness(value: string): Promise<string> {
  const salt = process.env.UNIQUENESS_HASH_SALT;
  if (!salt && process.env.NODE_ENV === 'production') {
    throw new Error('UNIQUENESS_HASH_SALT must be set in production. HUMAN-OWNED.');
  }
  const input = `${salt ?? 'dev-salt'}:${value}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
