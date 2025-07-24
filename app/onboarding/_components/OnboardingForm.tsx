'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import FormLabel from '@/components/ui/FormLabel';
import { toast } from 'sonner';

const generateRandomTag = () => Math.floor(1000 + Math.random() * 9000).toString();

export default function OnboardingForm() {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);

    if (!/^[a-zA-Z0-9_]+$/.test(nickname)) {
      const errorMessage = '닉네임은 영어 알파벳과 숫자, 언더스코어(_)만 사용할 수 있습니다.';
      toast.error(errorMessage);
      setLoading(false);
      return;
    }

    let tag = generateRandomTag();
    let tries = 0;
    const maxTries = 5;

    while (tries < maxTries) {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nickname, tag, bio }),
      });

      if (res.ok) {
        router.push('/protected/dashboard');
        return;
      }

      const result = await res.json();

      if (res.status === 500 && result.error?.includes('duplicate key')) {
        tag = generateRandomTag();
        tries++;
      } else {
        const errorMessage = result.error || '프로필 등록 중 오류가 발생했습니다.';
        toast.error(errorMessage);
        setLoading(false);
        return;
      }
    }

    const errorMessage = '중복 태그가 너무 많습니다. 닉네임을 바꿔보세요.';
    toast.error(errorMessage);
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center">
      <div className="w-full space-y-4">
        <h1 className="text-xl font-semibold text-center text-gray-900 dark:text-white">
          프로필 설정
        </h1>

        <FormLabel htmlFor="name">이름</FormLabel>
        <Input
          id="name"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border p-2 rounded bg-white dark:bg-gray-800 dark:text-white"
        />
        <FormLabel htmlFor="nickname">닉네임</FormLabel>
        <Input
          id="nickname"
          placeholder="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full border p-2 rounded bg-white dark:bg-gray-800 dark:text-white"
        />
        <p className="mt-1 text-sm text-muted-foreground">
          닉네임은 영어 알파벳과 숫자, 언더스코어(_)만 사용할 수 있습니다.
        </p>
        <FormLabel htmlFor="bio">자기소개</FormLabel>
        <Textarea
          id="bio"
          placeholder="자기소개 (선택)"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full border p-2 rounded bg-white dark:bg-gray-800 dark:text-white resize-none"
        />

        <Button className="w-full" onClick={handleSubmit} disabled={loading} variant="primary">
          {loading ? '등록 중...' : '프로필 등록하기'}
        </Button>
      </div>
    </div>
  );
}
