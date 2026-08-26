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
          'block px-3 py-2 rounded-md shadow-sm border border-hairline text-sm text-ink bg-card placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition',
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
