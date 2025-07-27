import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Readiary | 당신의 독서 일기',
  description: '하루하루의 독서를 기록하고, 친구들과 공유하세요.',
  manifest: '/manifest.json',
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
        <meta name="theme-color" content="#0f172a" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-512x512-v2.png" />
        <link rel="icon" href="favicon.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} overflow-x-hidden bg-white dark:bg-gray-900`}
      >
        <Header />
        <Navbar />
        <main className="flex-1 max-w-screen-md w-full mx-auto px-4 pt-[5rem] pb-[4.75rem] md:pt-[6rem] md:pb-[4rem]">
          {children}
        </main>
        <Toaster
          richColors
          position="top-center"
          duration={3000}
          closeButton
          toastOptions={{
            className:
              'text-sm font-sans text-label dark:text-white bg-background dark:bg-darkbg rounded-md shadow-md border border-gray-200 dark:border-gray-700 px-4 py-3',
          }}
        />
      </body>
    </html>
  );
}
