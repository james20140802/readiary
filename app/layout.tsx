import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import { maruBuri } from './fonts';

export const metadata: Metadata = {
  title: 'Readiary | 당신의 독서 일기',
  description: '하루하루의 독서를 기록하고, 친구들과 공유하세요.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F3EC' },
    { media: '(prefers-color-scheme: dark)', color: '#1B1612' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={maruBuri.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192-v2.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="overflow-x-hidden bg-paper text-ink">
        <Header />
        <Navbar />
        <main className="flex-1 max-w-screen-md w-full mx-auto px-4 pt-[4rem] pb-[4.75rem] md:pt-[6rem] md:pb-[4rem]">
          {children}
        </main>
        <Toaster
          richColors
          position="top-center"
          duration={3000}
          closeButton
          toastOptions={{
            className:
              'text-sm font-sans text-ink bg-card rounded-md border border-hairline px-4 py-3',
          }}
        />
      </body>
    </html>
  );
}
