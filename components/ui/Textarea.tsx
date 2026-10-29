'use client';

import { clsx } from 'clsx';
import React from 'react';
import type { FieldVariant } from '@/components/ui/Input';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  /** `box`(기본): 헤어라인 상자. `line`: 밑줄 없이 종이 위에, 포커스는 왼쪽의 짧은 accent 표시 */
  variant?: FieldVariant;
};

export function Textarea({
  label,
  error,
  fullWidth = false,
  variant = 'box',
  className,
  ...props
}: TextareaProps) {
  const line = variant === 'line';
  const field = (
    <textarea
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
        className
      )}
      {...props}
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
