import type { Metadata, Viewport } from 'next';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import './globals.css';
import { Toaster } from '@/components/shell';
import { SyncState } from '@/components/sync';
import { TourCard } from '@/components/tour';

export const metadata: Metadata = {
  title: 'Architect 2.0 · Build it. Prove it. Ship it.',
  description:
    'Build agent apps your experts trust and your IT team approves. Build from a prompt or your repo, prove it with your experts’ examples, and ship with sign-off.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F4F2EE',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-ink antialiased">
        {children}
        <Toaster />
        <TourCard />
        <SyncState />
      </body>
    </html>
  );
}
