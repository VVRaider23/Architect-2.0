import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from '@/components/shell';
import { SyncState } from '@/components/sync';
import { TourCard } from '@/components/tour';
import { CommandPalette } from '@/components/palette';
import { NavProgress } from '@/components/nav-progress';

export const metadata: Metadata = {
  title: 'Architect 2.0 · Build it. Prove it. Ship it.',
  description:
    'Build AI agent apps your experts trust. Describe the app or import your repo; Architect builds it, checks it with your experts, and ships it with IT’s sign-off.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B0C10',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-bg font-sans text-ink antialiased">
        <NavProgress />
        {children}
        <Toaster />
        <CommandPalette />
        <TourCard />
        <SyncState />
      </body>
    </html>
  );
}
