import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export default function Card({
  children,
  className,
  hoverable = true,
  onClick,
  disabled,
}: CardProps) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      className={clsx(
        'bg-background dark:bg-darkbg rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4',
        hoverable && !disabled && 'hover:bg-gray-50 dark:hover:bg-darkbg/80',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      {children}
    </div>
  );
}
