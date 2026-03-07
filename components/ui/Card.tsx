import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  /**
   * 카드 시각적 스타일
   * - default: 기본 흰 카드 (border + shadow-card)
   * - raised : 살짝 떠있는 느낌 (shadow-card-md)
   * - flat   : 테두리만, 그림자 없음
   * - ghost  : 배경 없음, 테두리만 (비활성 영역 등)
   */
  variant?: 'default' | 'raised' | 'flat' | 'ghost';
  hoverable?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  /** aria 역할 명시 */
  role?: string;
  'aria-label'?: string;
}

export default function Card({
  children,
  className,
  variant = 'default',
  hoverable = false,
  onClick,
  disabled,
  ...rest
}: CardProps) {
  const variantClasses = {
    default:
      'bg-surface dark:bg-dark-surface border border-border dark:border-dark-border shadow-card',
    raised:
      'bg-surface dark:bg-dark-surface border border-border dark:border-dark-border shadow-card-md',
    flat: 'bg-surface dark:bg-dark-surface border border-border dark:border-dark-border',
    ghost: 'bg-transparent border border-border dark:border-dark-border',
  };

  return (
    <div
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled}
      tabIndex={onClick && !disabled ? 0 : undefined}
      className={clsx(
        // 기본 구조
        'rounded-md p-card',
        // variant
        variantClasses[variant],
        // hover
        hoverable &&
          !disabled && [
            'cursor-pointer transition-all duration-200',
            'hover:shadow-card-md hover:-translate-y-px',
            'dark:hover:bg-dark-raised',
          ],
        // disabled
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
