import { NextRequest, NextResponse } from 'next/server';

// US-only geofence: block EU + other regions before they can interact with the service.
// HUMAN-OWNED: Verify the blocked country list with legal counsel before launch.
// This list is conservative (EU + EEA); expand as needed.
const BLOCKED_COUNTRIES = new Set([
  // EU member states
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE',
  'IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
  // EEA non-EU
  'IS','LI','NO',
  // UK (post-Brexit, still has GDPR-equivalent)
  'GB',
  // Switzerland (FADP)
  'CH',
]);

const UNAVAILABLE_PATH = '/unavailable';
const API_PATHS = ['/api/'];
const STATIC_PATHS = ['/_next/', '/favicon', '/icon-', '/manifest.json', UNAVAILABLE_PATH];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Never block static assets, the unavailable page itself, or API health checks
  if (STATIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const country = (req as unknown as { geo?: { country?: string } }).geo?.country ?? req.headers.get('x-vercel-ip-country');

  if (country && BLOCKED_COUNTRIES.has(country)) {
    // API calls get a JSON 451
    if (API_PATHS.some(p => pathname.startsWith(p))) {
      return NextResponse.json(
        { error: 'Service not available in your region.' },
        { status: 451 }
      );
    }
    // UI pages get a redirect
    return NextResponse.redirect(new URL(UNAVAILABLE_PATH, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon-|manifest.json).*)',
  ],
};
