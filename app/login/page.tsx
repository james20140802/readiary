'use client';

import { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createSupabaseClient();

  const errorMap: Record<string, string> = {
    'Invalid login credentials': '이메일 또는 비밀번호가 일치하지 않습니다.',
    'Email not confirmed': '이메일 인증이 완료되지 않았습니다.',
  };

  const handleLogin = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(errorMap[error.message] || '로그인 중 오류가 발생했습니다.');
    } else {
      router.push('/protected/dashboard');
    }
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-full max-w-sm mx-auto">
        <h1 className="text-section-title font-semibold mb-6 text-center text-gray-900 dark:text-white">
          로그인
        </h1>

        {error && (
          <div className="mb-4 p-2 rounded text-sm text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-200">
            {error}
          </div>
        )}

        <Input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-3"
        />
        <Button onClick={handleLogin} className="w-full mt-4">
          로그인하기
        </Button>

        <p className="text-sm text-center mt-4">
          <a href="/signup" className="text-gray-500 underline dark:text-gray-400">
            아직 회원이 아니신가요?
          </a>
        </p>
      </div>
    </div>
  );
}
