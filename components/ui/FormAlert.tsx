import { ReactNode } from 'react';
import clsx from 'clsx';

interface FormAlertProps {
  children: ReactNode;
  className?: string;
}

/** 폼 위에 놓는 서버 오류 안내 — 입력 하나에 매달 수 없는 실패(자격 불일치·레이트리밋 등) */
export default function FormAlert({ children, className }: FormAlertProps) {
  return (
    <div
      role="alert"
      className={clsx(
        'rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-body-sm text-danger',
        className
      )}
    >
      {children}
    </div>
  );
}
