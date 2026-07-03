import { createClient } from '@supabase/supabase-js';

export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      // Bypass Next.js fetch data cache — always read fresh from the DB
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  });
}
