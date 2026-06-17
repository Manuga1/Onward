import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from './server';
import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Resolves the authenticated user from either:
// 1. Authorization: Bearer <token> header (client-side sessions)
// 2. Supabase session cookie (SSR sessions)
export async function getUserFromRequest(req: NextRequest): Promise<{
  user: User | null;
  supabase: SupabaseClient;
}> {
  const supabase = await createSupabaseServerClient();
  const authHeader = req.headers.get('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data } = await supabase.auth.getUser(token);
    return { user: data.user, supabase };
  }

  const { data } = await supabase.auth.getUser();
  return { user: data.user, supabase };
}
