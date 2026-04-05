import { forwardRef, InputHTMLAttributes, useId } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = true, className, id: propId, ...props }, ref) => {
    const generatedId = useId();
    const id = propId ?? generatedId;
    const errorId = `${id}-error`;

    return (
      <div className={clsx(fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={id} className="block mb-1 text-sm font-medium text-label dark:text-label-invert">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={clsx(
            'w-full',
            'rounded-md px-4 py-2 text-sm border transition-colors',
            'bg-background dark:bg-dark-surface text-label dark:text-label-invert',
            'border-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-tint focus:border-tint',
            error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
            props.disabled && 'bg-surface-raised dark:bg-dark-raised cursor-not-allowed opacity-60',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1 text-xs text-red-500">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
