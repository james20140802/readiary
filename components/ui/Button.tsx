'use client';

import { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
}

export default function Button({
  variant = 'primary',
  fullWidth = false,
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  const base =
    'px-4 py-2 rounded-md text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantClasses = {
    primary: 'bg-tint text-white hover:bg-blue-600 focus:ring-tint',
    secondary: 'bg-secondary text-white hover:bg-gray-600 focus:ring-secondary',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      className={clsx(base, variantClasses[variant], widthClass, className)}
      {...props}
    />
  );
}
