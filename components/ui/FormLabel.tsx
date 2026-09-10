import { LabelHTMLAttributes } from 'react';
import { clsx } from 'clsx';

type FormLabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  /** `line`: 괘선 입력(Input variant="line") 위에 얹는 작은 보조 라벨 — 책 등록 폼과 같은 문법 */
  variant?: 'default' | 'line';
};

export default function FormLabel({ className, variant = 'default', ...props }: FormLabelProps) {
  return (
    <label
      {...props}
      className={clsx(
        'block font-medium',
        variant === 'line' ? 'text-[11.5px] text-ink-sub' : 'text-sm text-ink mb-1',
        className
      )}
    />
  );
}
