import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-background dark:bg-darkbg rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4',
        className
      )}
    >
      {children}
    </div>
  );
}
