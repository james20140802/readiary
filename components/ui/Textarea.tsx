'use client';

import { clsx } from 'clsx';
import React from 'react';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  fullWidth?: boolean;
};

export function Textarea({ label, error, fullWidth = false, className, ...props }: TextareaProps) {
  return (
    <div className={clsx('space-y-1', fullWidth && 'w-full')}>
      {label && (
        <label htmlFor={props.id} className="block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <textarea
        className={clsx(
          'block px-4 py-3 rounded-md border text-sm leading-relaxed transition-colors',
          'bg-card text-ink placeholder:text-ink-faint',
          'border-hairline-strong focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
          fullWidth && 'w-full',
          error && 'border-danger',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
