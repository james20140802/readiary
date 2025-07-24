'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { createSupabaseClient } from '@/lib/supabase/client';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import FormGroup from '@/components/ui/FormGroup';
import FormLabel from '@/components/ui/FormLabel';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupComplete, setSignupComplete] = useState(false);
  const supabase = createSupabaseClient();

  const errorMap: Record<string, string> = {
    'User already registered': '이미 가입된 이메일입니다.',
    'Invalid email format': '이메일 형식을 확인해주세요.',
    'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.',
  };

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.');
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
      toast.error(errorMap[error.message] || '회원가입 중 오류가 발생했습니다.');
    } else {
      setSignupComplete(true);
    }
  };

  return (
    <div className="flex items-center justify-center">
      <div className="w-full">
        {!signupComplete ? (
          <section className="space-y-6">
            <h1 className="text-xl font-semibold mb-6 text-center">가입</h1>
            <div className="space-y-6">
              <FormGroup className="gap-1.5">
                <FormLabel>이메일</FormLabel>
                <Input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormGroup>
              <FormGroup className="gap-1.5">
                <FormLabel>비밀번호</FormLabel>
                <Input
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  비밀번호는 최소 6자 이상이어야 합니다.
                </p>
              </FormGroup>
              <FormGroup className="gap-1.5">
                <FormLabel>비밀번호 확인</FormLabel>
                <Input
                  type="password"
                  placeholder="비밀번호 확인"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </FormGroup>
            </div>
            <div className="pt-2">
              <Button onClick={handleSignup} fullWidth>
                가입하기
              </Button>
            </div>
            <p className="text-sm text-center mt-4 text-secondary">
              <a href="/login" className="underline">
                로그인으로 이동
              </a>
            </p>
          </section>
        ) : (
          <section className="text-center space-y-4">
            <h2 className="text-lg font-semibold">회원가입이 완료되었습니다.</h2>
            <p>이메일을 확인해 인증을 완료해주세요.</p>
          </section>
        )}
      </div>
    </div>
  );
}
