import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface SealProps {
  children: ReactNode;
  className?: string;
}

/**
 * 잉크색 날짜/상태 표식 — "1년 전 오늘", "완독" 등.
 * 도장 박스 대신 쓰는 작은 산세리프 레터스페이싱 라벨 (시안 .seal).
 */
export default function Seal({ children, className }: SealProps) {
  return (
    <span className={clsx('inline-block font-sans text-seal text-accent uppercase', className)}>
      {children}
    </span>
  );
}
