'use client';

import Image from 'next/image';
import { clsx } from 'clsx';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallbackText?: string;
  className?: string;
}

export function Avatar({ src, alt = '프로필 이미지', fallbackText = '?', className }: AvatarProps) {
  return (
    <div
      className={clsx(
        'w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center overflow-hidden text-sm font-bold text-white',
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
