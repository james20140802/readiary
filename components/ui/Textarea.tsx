'use client';

import { clsx } from 'clsx';
import React from 'react';
import type { FieldVariant } from '@/components/ui/Input';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  /** `box`(기본): 헤어라인 상자. `line`: 상자 없이 괘선 위에 — Input 의 같은 옵션과 짝 */
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
  return (
    <div className={clsx('space-y-1', fullWidth && 'w-full')}>
      {label && (
        <label htmlFor={props.id} className="block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <textarea
        className={clsx(
          'block leading-relaxed text-ink placeholder:text-ink-faint transition-colors focus:outline-none',
          line
            ? [
                'border-b border-hairline bg-transparent px-0 py-2 text-[15px]',
                'focus:border-hairline-strong',
                error && 'border-danger focus:border-danger',
              ]
            : [
                'px-4 py-3 rounded-md border text-sm bg-card',
                'border-hairline-strong focus:border-accent focus:ring-1 focus:ring-accent',
                error && 'border-danger',
              ],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
