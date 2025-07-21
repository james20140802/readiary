'use client';

import Image from 'next/image';
import { clsx } from 'clsx';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallbackText?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-base',
};

export function Avatar({
  src,
  alt = '프로필 이미지',
  fallbackText = '?',
  className,
  size = 'md',
}: AvatarProps) {
  return (
    <div
      className={clsx(
        'rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center overflow-hidden font-bold text-white',
        sizeClasses[size],
        className
      )}
    >
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover" />
      ) : (
        <span>{fallbackText}</span>
      )}
    </div>
  );
}
