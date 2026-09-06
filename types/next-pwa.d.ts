// next-pwa.d.ts
/* eslint-disable @typescript-eslint/no-unused-vars */
declare module 'next-pwa' {
  import { NextConfig } from 'next';

  /** workbox-build 의 RuntimeCaching 중 이 프로젝트가 쓰는 부분 — 규칙은 문자열로 sw.js 에 복사된다 */
  export type RuntimeCaching = {
    urlPattern:
      | RegExp
      | string
      | ((context: { url: URL; request: Request; sameOrigin: boolean }) => boolean);
    handler: 'CacheFirst' | 'CacheOnly' | 'NetworkFirst' | 'NetworkOnly' | 'StaleWhileRevalidate';
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
    options: {
      cacheName?: string;
      networkTimeoutSeconds?: number;
      rangeRequests?: boolean;
      expiration?: { maxEntries?: number; maxAgeSeconds?: number };
    };
  };

  export type PWAConfig = {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    runtimeCaching?: RuntimeCaching[];
    /** 시작 URL 을 프리캐시·별도 'start-url' 런타임 캐시에 넣을지 — 기본 true */
    cacheStartUrl?: boolean;
    /** 시작 URL 이 로그인 여부로 리다이렉트되면 true — 기본 true, runtimeCaching 맨 앞에 NetworkFirst 규칙을 끼운다 */
    dynamicStartUrl?: boolean;
  };

  const withPWA =
    (config: PWAConfig): ((nextConfig: NextConfig) => NextConfig) =>
    (nextConfig: NextConfig) =>
      NextConfig;

  export default withPWA;
}

declare module 'next-pwa/cache' {
  import type { RuntimeCaching } from 'next-pwa';

  const defaultCache: RuntimeCaching[];
  export default defaultCache;
}
