import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import AppShell from '@/components/AppShell';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { maruBuri } from './fonts';

export const metadata: Metadata = {
  title: 'Readiary | 당신의 독서 일기',
  description: '하루하루의 독서를 기록하고, 친구들과 공유하세요.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // 하단 탭바가 홈 인디케이터 뒤까지 깔리고 safe-area 여백으로 내용을 띄운다
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F3EC' },
    { media: '(prefers-color-scheme: dark)', color: '#1B1612' },
  ],
};

/** GNB용 로그인 여부 — 쿠키의 토큰을 검증해 판정. 보호는 proxy가 하고 여기서는 표시만 정한다 */
async function isLoggedIn(): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getClaims();
    return !!data?.claims;
  } catch {
    return false;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const loggedIn = await isLoggedIn();

  return (
    <html lang="ko" className={maruBuri.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192-v2.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="overflow-x-hidden bg-paper text-ink">
        <AppShell initialLoggedIn={loggedIn}>{children}</AppShell>
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
