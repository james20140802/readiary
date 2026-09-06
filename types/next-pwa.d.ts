// next-pwa.d.ts
/* eslint-disable @typescript-eslint/no-unused-vars */
declare module 'next-pwa' {
  import { NextConfig } from 'next';

  /** workbox-build 의 RuntimeCaching 중 이 프로젝트가 쓰는 부분 — 규칙은 문자열로 sw.js 에 복사된다 */
  export type RuntimeCaching = {
    urlPattern: RegExp | string | ((context: { url: URL; sameOrigin: boolean }) => boolean);
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
