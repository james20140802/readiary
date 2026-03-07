import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  variant?: 'default' | 'raised' | 'flat' | 'ghost';
  onClick?: () => void;
  disabled?: boolean;
  [key: string]: unknown;
}

export default function Card({
  children,
  className,
  hoverable = true,
  variant = 'default',
  onClick,
  disabled,
  ...props
}: CardProps) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      className={clsx(
        'rounded-xl p-4',
        // variant별 스타일
        variant === 'default' &&
          'bg-surface dark:bg-dark-surface border border-border dark:border-dark-border shadow-card',
        variant === 'raised' &&
          'bg-surface dark:bg-dark-surface border border-border dark:border-dark-border shadow-card-md',
        variant === 'flat' &&
          'bg-surface dark:bg-dark-surface border border-border dark:border-dark-border',
        variant === 'ghost' && 'bg-transparent',
        // hover
        hoverable && !disabled && 'transition-shadow hover:shadow-card-md cursor-pointer',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
