import { forwardRef, InputHTMLAttributes, ReactNode, useId } from 'react';
import clsx from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  /** 입력 오른쪽 끝에 얹는 작은 컨트롤(비밀번호 표시 토글 등) — 입력 높이 안에서 세로 가운데 */
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = true, trailing, className, id, ...props }, ref) => {
    // label·오류문을 입력과 이어 주려면 id가 필요하다 — 안 주면 하나 만든다
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    return (
      <div className={clsx(fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={inputId} className="block mb-1 text-sm font-medium text-ink">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={clsx(
              'w-full',
              'rounded-md px-4 py-2 text-sm border transition-colors',
              'bg-card text-ink placeholder:text-ink-faint',
              'border-hairline-strong focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
              error && 'border-danger focus:ring-danger focus:border-danger',
              props.disabled && 'bg-card-raised cursor-not-allowed opacity-60',
              trailing && 'pr-11',
              className
            )}
            {...props}
          />
          {trailing && (
            <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
