import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import AppFrame from '@/components/layouts/AppFrame';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Vertra - Web Game Engine',
  description: 'Professional 3D batch renderer and scene editor',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${plexMono.variable} bg-vertra-bg text-vertra-text antialiased`}
      >
        <AppFrame>
          {children}
        </AppFrame>
      </body>
    </html >
  );
}
