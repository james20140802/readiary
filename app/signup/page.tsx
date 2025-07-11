'use client';

import { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [signupComplete, setSignupComplete] = useState(false);
  const supabase = createSupabaseClient();

  const errorMap: Record<string, string> = {
    'User already registered': '이미 가입된 이메일입니다.',
    'Invalid email format': '이메일 형식을 확인해주세요.',
    'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.',
  };

  const handleSignup = async () => {
    setError('');
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_EMAIL_REDIRECT_TO,
      },
    });

    if (error) {
      setError(errorMap[error.message] || '회원가입 중 오류가 발생했습니다.');
    } else {
      setSignupComplete(true);
    }
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-full max-w-sm">
        {!signupComplete ? (
          <>
            <h1 className="text-xl font-semibold mb-6 text-center text-gray-900 dark:text-white">
              가입
            </h1>

            {error && (
              <div className="mb-4 p-2 rounded text-sm text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-200">
                {error}
              </div>
            )}

            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mb-3 p-2 border rounded bg-white dark:bg-gray-800 dark:text-white"
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mb-3 p-2 border rounded bg-white dark:bg-gray-800 dark:text-white"
            />
            <input
              type="password"
              placeholder="비밀번호 확인"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full mb-3 p-2 border rounded bg-white dark:bg-gray-800 dark:text-white"
            />
            <button
              onClick={handleSignup}
              className="w-full bg-black text-white p-2 rounded hover:bg-gray-800"
            >
              가입하기
            </button>

            <p className="text-sm text-center mt-4">
              <a href="/login" className="text-gray-500 underline dark:text-gray-400">
                로그인으로 이동
              </a>
            </p>
          </>
        ) : (
          <div className="text-center text-gray-800 dark:text-white space-y-4">
            <h2 className="text-lg font-semibold">회원가입이 완료되었습니다.</h2>
            <p>이메일을 확인해 인증을 완료해주세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
