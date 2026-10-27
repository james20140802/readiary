'use client';

import { useEffect, useState } from 'react';

/** 이보다 오래 화면이 바뀌지 않으면 직접 누를 링크를 보인다(ms) */
export const ACTION_NAVIGATION_DELAY = 3000;

/**
 * 끝난 저장을 다시 하지 않도록, 이동이 늦을 때 직접 누를 링크.
 * 평소에는 곧 다음 화면(로딩 화면)으로 넘어가므로 보이지 않고, 화면 읽기 프로그램에만 완료를 알린다.
 * 3초가 지나도 그대로면 링크가 나타난다.
 */
export default function ActionNavigation({ href }: { href?: string | null }) {
  const [late, setLate] = useState<string | null>(null);

  useEffect(() => {
    if (!href) return;
    const id = window.setTimeout(() => setLate(href), ACTION_NAVIGATION_DELAY);
    return () => window.clearTimeout(id);
  }, [href]);

  if (!href) return null;
  if (late !== href) {
    return (
      <p role="status" className="sr-only">
        완료했어요. 화면을 이동하는 중입니다.
      </p>
    );
  }
  return (
    <p role="status" className="mt-3 text-caption text-ink-sub">
      완료했어요. 화면을 이동하는 중입니다.{' '}
      <a href={href} className="underline">
        이동이 늦으면 여기를 눌러 주세요
      </a>
    </p>
  );
}
