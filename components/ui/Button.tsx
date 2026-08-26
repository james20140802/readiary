'use client';

import { ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * primary : 주요 액션 (먹 배경)
   * secondary: 보조 액션 (헤어라인 아웃라인)
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
    'font-sans font-bold rounded-full transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
    'active:opacity-80',
    'disabled:opacity-50 disabled:pointer-events-none'
  );

  const variants = {
    primary: 'bg-ink text-ink-invert hover:opacity-90',
    secondary: 'bg-transparent text-ink border border-hairline-strong hover:bg-card-raised',
    ghost: 'bg-transparent text-ink-sub hover:bg-card-raised hover:text-ink',
    danger: 'bg-danger text-ink-invert hover:opacity-90',
    success: 'bg-success text-ink-invert hover:opacity-90',
  };

  const sizes = {
    sm: 'h-8  px-4 text-caption gap-1.5',
    md: 'h-10 px-5 text-button',
    lg: 'h-12 px-7 text-button text-base',
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
