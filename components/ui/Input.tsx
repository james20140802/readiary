import { forwardRef, InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = true, className, ...props }, ref) => {
    return (
      <div className={clsx(fullWidth && 'w-full')}>
        {label && <label className="block mb-1 text-sm font-medium text-ink">{label}</label>}
        <input
          ref={ref}
          className={clsx(
            'w-full',
            'rounded-md px-4 py-2 text-sm border transition-colors',
            'bg-card text-ink placeholder:text-ink-faint',
            'border-hairline-strong focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
            error && 'border-danger focus:ring-danger focus:border-danger',
            props.disabled && 'bg-card-raised cursor-not-allowed opacity-60',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
