'use client';

import { useRef } from 'react';
import clsx from 'clsx';

interface SegmentedProps<T extends string> {
  label: string;
  items: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** 탭 i가 조종하는 패널의 id */
  panelId: (value: T) => string;
  className?: string;
}

/**
 * 시안 .seg2 — 회색 홈 안에서 고른 칸만 종이색으로 떠오르는 탭.
 * 탭 목록 문법: 고른 탭만 Tab 순서에 들고, 좌우 화살표·Home·End로 옮긴다.
 */
export default function Segmented<T extends string>({
  label,
  items,
  value,
  onChange,
  panelId,
  className,
}: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (to: number) => {
    const i = (to + items.length) % items.length;
    onChange(items[i].value);
    refs.current[i]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={clsx(
        'grid h-11 auto-cols-fr grid-flow-col rounded-[10px] bg-[rgb(127_127_127/.14)] p-0.5 lg:h-9',
        className
      )}
    >
      {items.map((it, i) => {
        const on = it.value === value;
        return (
          <button
            key={it.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${panelId(it.value)}-tab`}
            aria-selected={on}
            aria-controls={panelId(it.value)}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(it.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') move(i + 1);
              else if (e.key === 'ArrowLeft') move(i - 1);
              else if (e.key === 'Home') move(0);
              else if (e.key === 'End') move(items.length - 1);
              else return;
              e.preventDefault();
            }}
            className={clsx(
              'flex items-center justify-center rounded-[8px] font-sans text-[14px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
              on
                ? 'bg-sheet text-ink shadow-[0_1px_3px_rgb(0_0_0/.12)]'
                : 'text-ink-sub hover:text-ink'
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
