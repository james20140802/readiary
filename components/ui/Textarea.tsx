'use client';

import { clsx } from 'clsx';
import React, { useId } from 'react';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  fullWidth?: boolean;
};

export function Textarea({ label, error, fullWidth = false, className, id: explicitId, ...props }: TextareaProps) {
  const generatedId = useId();
  const id = explicitId || generatedId;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={clsx('space-y-1', fullWidth && 'w-full')}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-label dark:text-label-invert">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={clsx(
          'block px-3 py-2 rounded-md shadow-sm border border-border dark:border-dark-border text-sm text-label dark:text-label-invert bg-background dark:bg-dark-surface placeholder-secondary focus:outline-none focus:ring-2 focus:ring-tint focus:border-tint transition',
          fullWidth && 'w-full',
          error && 'border-red-500 dark:border-red-400',
          className
        )}
        aria-invalid={!!error}
        aria-describedby={errorId}
        {...props}
      />
      {error && <p id={errorId} className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
