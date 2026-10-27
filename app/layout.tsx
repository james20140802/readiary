import ReflectionDraftGuard from '@/components/reflections/ReflectionDraftGuard';
import PushAccountGuard from '@/components/PushAccountGuard';
import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { Toaster } from 'sonner';
import AppShell from '@/components/AppShell';
import MotionProvider from '@/components/MotionProvider';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { noFocusZoom } from '@/lib/browser/viewport';
import { maruBuri, pretendard } from './fonts';

export const metadata: Metadata = {
  title: 'Readiary | 당신의 독서 일기',
  description: '하루하루의 독서를 기록하고, 친구들과 공유하세요.',
  manifest: '/manifest.json',
};

const BASE_VIEWPORT: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // 하단 탭바가 홈 인디케이터 뒤까지 깔리고 safe-area 여백으로 내용을 띄운다
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F0E8' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1714' },
  ],
};

/**
 * iOS는 입력칸을 누르면 화면을 그 칸으로 확대한다. maximum-scale=1은 그 자동 확대만 막고,
 * 손가락 확대는 iOS가 접근성 때문에 그대로 허용한다. Android는 이 값이 손가락 확대까지 막으므로 붙이지 않는다.
 * iPad Safari는 데스크톱 UA(Macintosh)를 보내므로 Macintosh에도 붙인다 — 데스크톱 브라우저는 viewport를 쓰지 않는다.
 */
export async function generateViewport(): Promise<Viewport> {
  const ua = (await headers()).get('user-agent') ?? '';
  return noFocusZoom(ua) ? { ...BASE_VIEWPORT, maximumScale: 1 } : BASE_VIEWPORT;
}

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
  // The badge resolves after hydration; it must not delay the whole route/skeleton.
  const initialUnread = loggedIn ? null : 0;

  return (
    <html lang="ko" className={`${maruBuri.variable} ${pretendard.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192-v2.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="bg-paper text-ink">
        <PushAccountGuard />
        <ReflectionDraftGuard />
        <MotionProvider>
          <AppShell initialLoggedIn={loggedIn} initialUnread={initialUnread}>
            {children}
          </AppShell>
        </MotionProvider>
        <Toaster
          richColors
          position="top-center"
          duration={3000}
          closeButton
          toastOptions={{
            className:
              'text-caption font-sans text-ink bg-card rounded-md border border-hairline px-4 py-3',
          }}
        />
      </body>
    </html>
  );
}
