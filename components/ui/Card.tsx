import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
}

export default function Card({ children, className, hoverable = true }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-background dark:bg-darkbg rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4',
        hoverable && 'hover:bg-gray-50 dark:hover:bg-darkbg/80',
        className
      )}
    >
      {children}
    </div>
  );
}
