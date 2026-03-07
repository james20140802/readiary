'use client';

import { ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * primary : 주요 액션 (파란색)
   * secondary: 보조 액션 (아웃라인)
   * ghost   : 텍스트형 버튼
   * danger  : 삭제/경고
   * success : 완료/확인
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  asChild?: boolean;
  loading?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  type = 'button',
  className,
  asChild,
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base = clsx(
    'inline-flex items-center justify-center gap-2',
    'font-medium rounded-md transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'active:scale-[0.97]',
    'disabled:opacity-50 disabled:pointer-events-none'
  );

  const variants = {
    primary: clsx(
      'bg-tint text-white',
      'hover:bg-tint-hover',
      'focus-visible:ring-tint',
      'shadow-sm hover:shadow-tint'
    ),
    secondary: clsx(
      'bg-transparent text-label dark:text-label-invert',
      'border border-border dark:border-dark-border',
      'hover:bg-surface-raised dark:hover:bg-dark-raised',
      'focus-visible:ring-label'
    ),
    ghost: clsx(
      'bg-transparent text-label-sub dark:text-label-muted',
      'hover:bg-surface-raised dark:hover:bg-dark-raised',
      'hover:text-label dark:hover:text-label-invert',
      'focus-visible:ring-label'
    ),
    danger: clsx('bg-danger text-white', 'hover:bg-red-600', 'focus-visible:ring-danger'),
    success: clsx('bg-success text-white', 'hover:bg-green-600', 'focus-visible:ring-success'),
  };

  const sizes = {
    sm: 'h-8  px-3 text-caption gap-1.5',
    md: 'h-10 px-4 text-button',
    lg: 'h-12 px-6 text-button text-base',
  };

  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      type={asChild ? undefined : type}
      disabled={disabled || loading}
      className={clsx(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}
