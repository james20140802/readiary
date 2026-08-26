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
        'rounded-md p-5',
        variant === 'default' && 'bg-card border border-hairline',
        variant === 'raised' && 'bg-card border border-hairline-strong',
        variant === 'flat' && 'bg-card-raised border border-hairline',
        variant === 'ghost' && 'bg-transparent',
        hoverable && !disabled && 'transition-colors hover:border-hairline-strong cursor-pointer',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
