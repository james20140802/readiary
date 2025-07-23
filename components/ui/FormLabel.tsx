import { LabelHTMLAttributes } from 'react';
import { clsx } from 'clsx';

type FormLabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export default function FormLabel({ className, ...props }: FormLabelProps) {
  return (
    <label
      {...props}
      className={clsx('block text-sm font-medium text-label dark:text-white mb-1', className)}
    />
  );
}
