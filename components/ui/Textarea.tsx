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
        <label htmlFor={props.id} className="block text-sm font-medium text-label dark:text-white">
          {label}
        </label>
      )}
      <textarea
        className={clsx(
          'block px-3 py-2 rounded-md shadow-sm border border-gray-300 dark:border-gray-600 text-sm text-label dark:text-white bg-background dark:bg-darkbg placeholder-secondary focus:outline-none focus:ring-2 focus:ring-tint focus:border-tint transition',
          fullWidth && 'w-full',
          error && 'border-red-500 dark:border-red-400',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
