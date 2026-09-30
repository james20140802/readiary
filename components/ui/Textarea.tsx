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
  return (
    <div
      className={clsx(
        'space-y-1',
        line && 'writing-field',
        line && label && 'writing-field--labeled',
        fullWidth && 'w-full'
      )}
    >
      {label && (
        <label htmlFor={props.id} className="block text-caption font-medium text-ink">
          {label}
        </label>
      )}
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
      {error && <p className="text-caption text-danger">{error}</p>}
    </div>
  );
}
