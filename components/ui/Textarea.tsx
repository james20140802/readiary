'use client';

import { clsx } from 'clsx';
import React, { useId } from 'react';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  fullWidth?: boolean;
};

export function Textarea({
  label,
  error,
  fullWidth = false,
  className,
  id,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id || generatedId;
  const errorId = `${textareaId}-error`;

  return (
    <div className={clsx('space-y-1', fullWidth && 'w-full')}>
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-label dark:text-label-invert"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={clsx(
          'block px-3 py-2 rounded-md shadow-sm border border-border dark:border-dark-border text-sm text-label dark:text-label-invert bg-background dark:bg-dark-surface placeholder-secondary focus:outline-none focus:ring-2 focus:ring-tint focus:border-tint transition',
          fullWidth && 'w-full',
          error && 'border-red-500 dark:border-red-400',
          className
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
