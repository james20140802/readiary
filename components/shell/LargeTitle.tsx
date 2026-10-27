'use client';

import { useEffect, useRef } from 'react';
import { useTopBarState } from './TopBarContext';

/**
 * 화면 위쪽의 큰 제목. 바로 위에 눈에 보이지 않는 감지용 표식을 두고,
 * 그 표식이 화면 밖으로 나가면(스크롤로 큰 제목이 가려지면) 상단 바를 간지 재질로 바꾼다.
 */
export function LargeTitle({ children }: { children: React.ReactNode }) {
  const { setScrolled, claimScroll } = useTopBarState();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const release = claimScroll();
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    observer.observe(el);
    return () => {
      observer.disconnect();
      release();
      setScrolled(false);
    };
  }, [setScrolled, claimScroll]);

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" />
      <h1 className="font-sans text-page-title lg:text-page-title-lg">{children}</h1>
    </>
  );
}
