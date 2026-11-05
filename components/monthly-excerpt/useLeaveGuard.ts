'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 작업 중 이탈 경고. 새로고침·탭 닫기는 beforeunload로,
 * 앱 안의 링크(상단 바 뒤로, 탭 바, 사이드바)는 캡처 단계에서 눌림을 가로채 확인을 거친다.
 * 브라우저의 뒤로 가기 버튼(popstate)은 막지 못한다 — 임시 저장을 두지 않는 첫 버전의 한계다.
 */
export function useLeaveGuard(active: boolean) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // 일부 브라우저는 returnValue가 있어야 확인 창을 띄운다
      e.returnValue = '';
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (
        !anchor ||
        (anchor.target && anchor.target !== '_self') ||
        anchor.hasAttribute('download')
      ) {
        return;
      }
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search)
        return;
      e.preventDefault();
      e.stopPropagation();
      setPending(url.pathname + url.search + url.hash);
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [active]);

  const stay = useCallback(() => setPending(null), []);
  const leave = useCallback(() => {
    if (pending) router.push(pending);
  }, [pending, router]);

  return { pending, stay, leave };
}
