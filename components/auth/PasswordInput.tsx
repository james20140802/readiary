'use client';

import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, type InputProps } from '@/components/ui/Input';

type PasswordInputProps = Omit<InputProps, 'type' | 'trailing'>;

/** 비밀번호 입력 + 표시 토글. 토글은 눌러도 폼을 제출하지 않고, 상태를 스크린리더에도 알린다 */
const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>((props, ref) => {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      ref={ref}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? '비밀번호 숨기기' : '비밀번호 표시'}
          aria-pressed={visible}
          className="rounded-full p-2 text-ink-faint transition-colors hover:text-ink-sub"
        >
          {visible ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
        </button>
      }
      {...props}
    />
  );
});

PasswordInput.displayName = 'PasswordInput';
export default PasswordInput;
