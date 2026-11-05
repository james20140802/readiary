'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/** 히스토리 보초 항목 표시 */
const SENTINEL_KEY = '__readiaryLeaveGuard';
/** 보초를 걷는 popstate가 오지 않아도 저장·이동을 막지 않는다 */
const POP_TIMEOUT_MS = 1000;
/** 뒤로 갈 곳이 없으면(새 탭에서 바로 연 경우) history.back()은 아무 일도 하지 않는다 */
const LEAVE_FALLBACK_MS = 800;

type Pending = { kind: 'back' } | { kind: 'link'; href: string } | null;

/**
 * 작업 중 이탈 경고. 작업 중일 때만 동작한다.
 * - 새로고침·탭 닫기: beforeunload
 * - 앱 안의 링크(상단 바 뒤로, 탭 바, 사이드바): 캡처 단계에서 눌림을 가로챈다
 * - 브라우저 뒤로 가기·iOS 밀기·Android 뒤로: 같은 주소의 보초 항목을 하나 쌓아 두고 popstate에서 확인을 연다.
 *   이미 지난 뒤에 알게 되므로 머물면 보초를 다시 쌓고, 나가면 한 칸 더 간다.
 * 저장에 성공하면 `release()`를 기다린 뒤 이동한다. 그래야 보초가 히스토리에 남지 않는다.
 */
export function useLeaveGuard(active: boolean, fallbackHref: string) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending>(null);
  /** 지금 자리가 보초 항목인가 */
  const armed = useRef(false);
  /** 보초를 쌓은 화면의 주소. 여러 칸을 건너뛴 뒤로 가기는 이미 다른 화면이라 확인을 열지 않는다. */
  const guardedUrl = useRef('');
  /** 우리가 걷는 중인 보초의 popstate를 기다린다 */
  const popWaiter = useRef<(() => void) | null>(null);
  const popping = useRef<Promise<void> | null>(null);
  /** 저장했거나 나가기로 했다. 더는 막지 않는다. */
  const released = useRef(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeNow = useRef(active);

  const arm = useCallback(() => {
    if (armed.current) return;
    // 주소를 주지 않으면 Next가 라우터 상태를 건드리지 않는다
    window.history.pushState({ ...window.history.state, [SENTINEL_KEY]: true }, '');
    armed.current = true;
    guardedUrl.current = window.location.pathname + window.location.search;
  }, []);

  /** 보초 위에 있으면 걷어 내고, 끝나면 풀리는 약속을 돌려준다 */
  const disarm = useCallback((): Promise<void> => {
    if (!armed.current) return popping.current ?? Promise.resolve();
    armed.current = false;
    const done = new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        popWaiter.current = null;
        resolve();
      }, POP_TIMEOUT_MS);
      popWaiter.current = () => {
        clearTimeout(timer);
        resolve();
      };
      window.history.back();
    }).finally(() => {
      popping.current = null;
    });
    popping.current = done;
    return done;
  }, []);

  useEffect(() => {
    const onPopState = () => {
      if (popWaiter.current) {
        const resolve = popWaiter.current;
        popWaiter.current = null;
        resolve();
        return;
      }
      if (released.current || !activeNow.current) return;
      if (window.history.state?.[SENTINEL_KEY]) {
        // 확인이 열린 채 앞으로 가기로 돌아왔다 — 머무는 것과 같다
        armed.current = true;
        setPending((p) => (p?.kind === 'back' ? null : p));
        return;
      }
      if (!armed.current) return;
      armed.current = false;
      if (window.location.pathname + window.location.search !== guardedUrl.current) return;
      setPending({ kind: 'back' });
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    };
  }, []);

  // 보초는 작업 중에만 둔다. 고른 것을 되돌려 잃을 것이 없어지면 뒤로 가기가 바로 떠나야 한다.
  useEffect(() => {
    activeNow.current = active;
    if (released.current) return;
    if (!active) {
      void disarm();
    } else if (popping.current) {
      void popping.current.then(() => {
        if (activeNow.current && !released.current) arm();
      });
    } else {
      arm();
    }
  }, [active, arm, disarm]);

  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (released.current) return;
      e.preventDefault();
      // 일부 브라우저는 returnValue가 있어야 확인 창을 띄운다
      e.returnValue = '';
    };
    const onClick = (e: MouseEvent) => {
      if (released.current) return;
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
      setPending({ kind: 'link', href: url.pathname + url.search + url.hash });
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [active]);

  const stay = useCallback(() => {
    if (pending?.kind === 'back') arm();
    setPending(null);
  }, [pending, arm]);

  const leave = useCallback(async () => {
    if (released.current || !pending) return;
    released.current = true;
    if (pending.kind === 'link') {
      await disarm();
      router.push(pending.href);
      return;
    }
    leaveTimer.current = setTimeout(() => router.replace(fallbackHref), LEAVE_FALLBACK_MS);
    window.history.back();
  }, [pending, disarm, router, fallbackHref]);

  /** 저장 성공 뒤 이동 전에 기다린다. 보초를 걷고 이후의 확인을 끈다. */
  const release = useCallback(() => {
    released.current = true;
    return disarm();
  }, [disarm]);

  return { pending, stay, leave, release };
}
