import { forwardRef, InputHTMLAttributes, ReactNode, useId } from 'react';
import clsx from 'clsx';

export type FieldVariant = 'box' | 'line';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  /** 입력 오른쪽 끝에 얹는 작은 컨트롤(비밀번호 표시 토글 등) — 입력 높이 안에서 세로 가운데 */
  trailing?: ReactNode;
  /**
   * `box`(기본): 카드 표면 + 헤어라인 상자. `line`: 상자 없이 괘선 위에 — 기록·책 등록·인증 화면처럼
   * 종이 문법을 따르는 폼에서 쓴다. 포커스는 괘선이 짙어지는 것으로만 알린다.
   */
  variant?: FieldVariant;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = true, trailing, variant = 'box', className, id, ...props }, ref) => {
    // label·오류문을 입력과 이어 주려면 id가 필요하다 — 안 주면 하나 만든다
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const line = variant === 'line';
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
              'w-full text-ink placeholder:text-ink-faint transition-colors focus:outline-none',
              line
                ? [
                    'border-b border-hairline bg-transparent px-0 py-2 text-[15px]',
                    'focus:border-hairline-strong',
                    error && 'border-danger focus:border-danger',
                    trailing && 'pr-9',
                  ]
                : [
                    'rounded-md px-4 py-2 text-sm border bg-card',
                    'border-hairline-strong focus:border-accent focus:ring-1 focus:ring-accent',
                    error && 'border-danger focus:ring-danger focus:border-danger',
                    trailing && 'pr-11',
                  ],
              props.disabled && 'cursor-not-allowed opacity-60',
              props.disabled && !line && 'bg-card-raised',
              className
            )}
            {...props}
          />
          {trailing && (
            <div
              className={clsx(
                'absolute inset-y-0 flex items-center',
                line ? '-right-2' : 'right-1'
              )}
            >
              {trailing}
            </div>
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
