'use client';

import { useLayoutEffect, type MouseEvent } from 'react';
import { usePathname } from 'next/navigation';

/*
 * 탭을 눌러 옮겨 간 화면은 맨 위에서 시작한다.
 * 장 넘김(scroll-snap) 화면은 문서가 바뀌어도 브라우저가 이전 스크롤 위치 근처로 다시 붙여서,
 * 책장 서가까지 내린 뒤 '나'로 가면 '나를 만든 책' 장이 먼저 보였다.
 * 뒤로 가기에는 손대지 않는다 — 탭 누름으로 시작한 이동만 맨 위로 올린다.
 */
let pendingTop = false;

function toTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

/** 탭 링크의 onClick — 지금 화면의 탭을 다시 누르면 그 자리에서 맨 위로 */
export function onTabClick(e: MouseEvent, href: string, pathname: string) {
  // 새 탭·새 창으로 여는 누름은 이 화면을 옮기지 않는다
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (href === pathname) toTop();
  else pendingTop = true;
}

/** 셸에 한 번 둔다 — 탭 누름 뒤 주소가 바뀌어 새 화면이 그려진 직후 맨 위로 올린다 */
export function useTopAfterTabNavigation() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    if (!pendingTop) return;
    pendingTop = false;
    toTop();
  }, [pathname]);
}
