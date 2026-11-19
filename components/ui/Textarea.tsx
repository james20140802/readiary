'use client';

import { clsx } from 'clsx';
import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { FieldVariant } from '@/components/ui/Input';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  ref?: React.Ref<HTMLTextAreaElement>;
  label?: string;
  error?: string;
  fullWidth?: boolean;
  /** `box`(기본): 헤어라인 상자. `line`: 밑줄 없이 종이 위에, 포커스는 왼쪽의 짧은 accent 표시 */
  variant?: FieldVariant;
  /** 크기 조절 손잡이 없이 쓴 만큼 늘고 줄어든다(rows가 최소 높이). 불러온 초안처럼 값이 바깥에서 바뀌어도 맞춘다 */
  autoGrow?: boolean;
};

const fit = (el: HTMLTextAreaElement) => {
  el.style.height = 'auto';
  // 아직 배치되지 않았으면(시트가 막 열리는 순간 등) 잴 수 없다 — 0으로 고정하지 말고 rows 높이로 두었다가 배치되면 다시 잰다
  if (el.scrollHeight === 0) {
    el.style.height = '';
    return;
  }
  // scrollHeight엔 테두리가 빠져 있다 — box 모양에서 마지막 줄이 잘리지 않게 더한다
  el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
};

export function Textarea({
  label,
  error,
  fullWidth = false,
  variant = 'box',
  autoGrow = false,
  className,
  ref,
  ...props
}: TextareaProps) {
  const line = variant === 'line';
  const own = useRef<HTMLTextAreaElement | null>(null);
  const setRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      own.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) (ref as React.RefObject<HTMLTextAreaElement | null>).current = el;
    },
    [ref]
  );
  useLayoutEffect(() => {
    if (autoGrow && own.current) fit(own.current);
  }, [autoGrow, props.value]);
  // 배치되는 순간과 폭이 바뀔 때(줄바꿈이 달라진다) 다시 맞춘다. 높이만 바뀐 알림은 무시해 되먹임을 막는다
  useEffect(() => {
    const el = own.current;
    if (!autoGrow || !el || typeof ResizeObserver === 'undefined') return;
    let width = -1;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      fit(el);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [autoGrow]);
  const field = (
    <textarea
      ref={setRef}
      className={clsx(
        'block leading-relaxed text-ink placeholder:text-ink-faint transition-colors focus:outline-none',
        line
          ? 'border-0 bg-transparent px-0 py-2 text-input'
          : [
              'px-4 py-3 rounded-md border text-input bg-card',
              'border-hairline-strong focus:border-accent focus:ring-1 focus:ring-accent',
              error && 'border-danger',
            ],
        fullWidth && 'w-full',
        autoGrow && 'resize-none overflow-hidden',
        className
      )}
      {...props}
      onChange={(e) => {
        if (autoGrow) fit(e.currentTarget);
        props.onChange?.(e);
      }}
    />
  );
  return (
    <div className={clsx('space-y-1', line && 'writing-group', fullWidth && 'w-full')}>
      {label && (
        <label
          htmlFor={props.id}
          className={clsx('block text-caption font-medium', line ? 'text-ink-sub' : 'text-ink')}
        >
          {label}
        </label>
      )}
      {/* 포커스 표시는 라벨이 아니라 글이 놓이는 칸 높이 전체에 — 깜빡이는 커서와 같은 줄에서 시작한다 */}
      {line ? <div className="writing-field">{field}</div> : field}
      {error && <p className="text-caption text-danger">{error}</p>}
    </div>
  );
}
