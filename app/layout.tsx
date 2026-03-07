import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Readiary | 당신의 독서 일기',
  description: '하루하루의 독서를 기록하고, 친구들과 공유하세요.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FAF9F6',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/icon-192x192-v2.png" />
        <link rel="apple-touch-icon" href="/icons/icon-512x512-v2.png" />
        <link rel="icon" href="favicon.ico" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="overflow-x-hidden bg-[var(--color-page-bg)] dark:bg-dark-page">
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
              'text-sm font-sans text-label dark:text-label-invert bg-surface dark:bg-dark-surface rounded-md shadow-card-md border border-border dark:border-dark-border px-4 py-3',
          }}
        />
      </body>
    </html>
  );
}
