import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { PostHogProvider } from '@/lib/analytics/PostHogProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Onward — Accountability Partner',
  description: 'Anonymous 1-on-1 accountability for your recovery journey.',
  manifest: '/manifest.json',
  applicationName: 'Onward',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Onward',
  },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#0d9488',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full flex flex-col bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
        <PostHogProvider>
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
