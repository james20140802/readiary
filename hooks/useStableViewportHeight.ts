'use client';

import { useEffect } from 'react';

/**
 * 장 높이(--vh) = 실제 보이는 화면 높이.
 * 폭이 바뀔 때(회전·분할 화면)만 다시 잰다 — 주소창이 접히는 스크롤 중에는 값을 고정해 장이 출렁이지 않게 한다.
 */
export function useStableViewportHeight(): void {
  useEffect(() => {
    let lastWidth = 0;
    const apply = () => {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      document.documentElement.style.setProperty('--vh', `${window.innerHeight}px`);
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);
}
