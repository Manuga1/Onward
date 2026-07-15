import { redirect } from 'next/navigation';
import { Waitlist } from './components/Waitlist';

// Toggle the public front door between waitlist and live signup via env var.
// Set WAITLIST_MODE=true in Vercel to show the waitlist; remove it (or set false) to go live.
// /signup stays directly reachable either way, so you can still log in and onboard pilots.
export const dynamic = 'force-dynamic';

export default function Root() {
  if (process.env.WAITLIST_MODE === 'true') {
    return <Waitlist />;
  }
  redirect('/signup');
}
