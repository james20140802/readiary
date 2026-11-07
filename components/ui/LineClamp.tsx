'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';

interface LineClampProps {
  lines: number;
  className: string;
  children: ReactNode;
}

/**
 * 긴 글은 정해진 줄 수에서 접고 "더 보기"로 펼친다. 실제로 잘렸을 때만 버튼을 보인다.
 * 한 편이 화면을 몇 장씩 차지하지 않게 하되, 글은 언제든 끝까지 읽을 수 있다.
 */
export default function LineClamp({ lines, className, children }: LineClampProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [expanded, children]);

  return (
    <>
      <p
        ref={ref}
        data-skeleton
        className={className}
        style={
          expanded
            ? undefined
            : {
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: lines,
                overflow: 'hidden',
              }
        }
      >
        {children}
      </p>
      {(clamped || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className={clsx(
            'mt-1 min-h-11 self-start font-sans text-[15px] font-semibold text-accent',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
          )}
        >
          {expanded ? '접기' : '더 보기'}
        </button>
      )}
    </>
  );
}
