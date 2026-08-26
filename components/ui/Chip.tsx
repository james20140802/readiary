'use client';

import { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  /** 앞에 잉크색 점 표시 (선택된 책 칩 등) */
  dot?: boolean;
}

/** 알약형 선택 칩 — 책 선택, 필터 등 (시안 .chip) */
export default function Chip({ selected, dot, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5',
        'font-sans text-caption font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        selected
          ? 'border-ink bg-ink text-ink-invert'
          : 'border-hairline-strong bg-paper text-ink-sub hover:border-ink hover:text-ink',
        className
      )}
      {...props}
    >
      {dot && <span className="h-[7px] w-[7px] rounded-full bg-accent" aria-hidden />}
      {children}
    </button>
  );
}
