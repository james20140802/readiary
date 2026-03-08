'use client';

import { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import BackButton from '@/components/ui/BackButton';
import FormGroup from '@/components/ui/FormGroup';
import FormLabel from '@/components/ui/FormLabel';
import { toast } from 'sonner';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseClient();

  const handleUpdate = async () => {
    if (password.length < 6) {
      toast.error('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(
        error.message === 'New password should be different from the old password.'
          ? '새 비밀번호는 기존 비밀번호와 달라야 합니다.'
          : '비밀번호 변경 중 오류가 발생했습니다.'
      );
    } else {
      toast.success('비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.');
      await supabase.auth.signOut();
      router.push('/login');
    }
  };

  return (
    <main>
      <header className="flex items-center mb-6">
        <BackButton />
        <h1 className="text-page-title font-black text-label dark:text-label-invert ml-4">
          비밀번호 변경
        </h1>
      </header>

      <div className="space-y-6">
        <p className="text-sm text-label-sub dark:text-label-muted">
          새로운 비밀번호를 입력해주세요. 성공하면 다시 로그인해야 합니다.
        </p>

        <FormGroup>
          <FormLabel>새 비밀번호</FormLabel>
          <Input
            type="password"
            placeholder="새 비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-label-sub dark:text-label-muted mt-1">
            비밀번호는 최소 6자 이상이어야 합니다.
          </p>
        </FormGroup>

        <FormGroup>
          <FormLabel>새 비밀번호 확인</FormLabel>
          <Input
            type="password"
            placeholder="새 비밀번호 다시 입력"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
          />
        </FormGroup>

        <Button
          onClick={handleUpdate}
          loading={loading}
          disabled={loading || !password || !confirmPassword}
          fullWidth
        >
          {loading ? '변경 중...' : '비밀번호 변경하기'}
        </Button>
      </div>
    </main>
  );
}
