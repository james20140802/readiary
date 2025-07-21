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
        {label && (
          <label className="block mb-1 text-sm font-medium text-label dark:text-white">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            'rounded-md px-4 py-2 text-sm border transition-colors',
            'bg-background dark:bg-darkbg text-label dark:text-white',
            'border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-tint focus:border-tint',
            error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
            props.disabled && 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-60',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
