'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 저장이 끝나면 갈 화면을 미리 받아 둔다 — 누른 순간 그 화면의 로딩 자리가 바로 펼쳐지게.
 * 로그인·온보딩·로그아웃처럼 세션이 바뀌기 전에 받으면 proxy의 리다이렉트가 남으므로 그런 곳에는 쓰지 않는다.
 */
export function usePrefetchDestination(href: string | null | undefined) {
  const router = useRouter();
  useEffect(() => {
    if (href) router.prefetch(href);
  }, [href, router]);
}
