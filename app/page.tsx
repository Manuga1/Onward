import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/db/server';
import { Waitlist } from './components/Waitlist';

// Toggle the public front door between waitlist and live signup via env var.
// Set WAITLIST_MODE=true in Vercel to show the waitlist; remove it (or set false) to go live.
// /signup stays directly reachable either way, so you can still log in and onboard pilots.
export const dynamic = 'force-dynamic';

export default async function Root() {
  // Logged-in users always go into the app, even while the waitlist is up —
  // this covers magic-link redirects that land on the root instead of /auth/callback.
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/home');

  if (process.env.WAITLIST_MODE === 'true') {
    return <Waitlist />;
  }
  redirect('/signup');
}
