import type { NextConfig } from 'next';
import withPWA from 'next-pwa';
import { buildRuntimeCaching } from './lib/pwa/runtime-caching';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'search1.kakaocdn.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 't1.daumcdn.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('https://', ''),
        // 환경 변수를 활용하여 실제 경로 허용
        pathname: `${process.env.NEXT_PUBLIC_PROFILE_IMAGE_URL}**`,
      },
    ],
  },

  outputFileTracingIncludes: {
    '/share/e/[entry_id]/opengraph-image': ['./app/fonts/MaruBuri-Regular.woff'],
  },
};

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // 로그인 뒤 화면·/api·Supabase 응답은 기기에 캐시하지 않는다 — 개인정보처리방침 제7조 3항
  runtimeCaching: buildRuntimeCaching(process.env.NEXT_PUBLIC_SUPABASE_URL),
  // next-pwa 는 기본으로 시작 URL(/)만 따로 NetworkFirst 'start-url' 캐시에 넣는 규칙을 runtimeCaching 맨 앞에
  // 끼워 넣는다. 로그인 상태의 / 는 proxy.ts 가 대시보드로 보내므로 그 규칙이 개인화 응답을 잡을 수 있어 끈다 —
  // / 는 위 규칙(AUTH_REDIRECT_PATH_PATTERN)이 NetworkOnly 로 처리한다.
  cacheStartUrl: false,
  dynamicStartUrl: false,
});

export default pwaConfig(nextConfig);
