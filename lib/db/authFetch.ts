'use client';

import { supabase } from './client';

// Wrapper around fetch that injects the Supabase Bearer token into every request
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(input, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  });
}
