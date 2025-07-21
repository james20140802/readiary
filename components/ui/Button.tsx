'use client';

import { ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
  asChild?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({
  variant = 'primary',
  fullWidth = false,
  size = 'md',
  type = 'button',
  className,
  asChild,
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

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      type={asChild ? undefined : type}
      className={clsx(base, sizeClasses[size], variantClasses[variant], widthClass, className)}
      {...props}
    />
  );
}
