'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import FormLabel from '@/components/ui/FormLabel';
import { toast } from 'sonner';
import AnimatedSection from '@/components/ui/AnimatedSection';
import { validateNickname } from '@/lib/profile/nickname';

const generateRandomTag = () => Math.floor(1000 + Math.random() * 9000).toString();

/**
 * 프로필이 생긴 직후의 이동은 전체 페이지 이동으로 — 이 화면에 있는 동안 클라이언트 라우터가 받아 둔
 * 보호 라우트 응답은 전부 "프로필 없음 → /onboarding" 리다이렉트라, router.push 로 가면 그 낡은 캐시를
 * 재사용해 온보딩 화면에 그대로 머문다(2026-09-05 프로덕션 재현: 등록 201 뒤 서버 요청 0건).
 */
const leaveOnboarding = (path: string) => {
  window.location.assign(path);
};

export default function OnboardingForm() {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);

    const nicknameError = validateNickname(nickname);
    if (nicknameError) {
      toast.error(nicknameError);
      setLoading(false);
      return;
    }

    let tag = generateRandomTag();
    let tries = 0;
    const maxTries = 5;

    try {
      while (tries < maxTries) {
        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, nickname, tag, bio }),
        });

        if (res.ok) {
          leaveOnboarding('/protected/dashboard');
          return;
        }

        const result = await res.json().catch(() => ({}));

        if (res.status === 409 && result.code === 'tag_conflict') {
          tag = generateRandomTag();
          tries++;
        } else if (res.status === 409 && result.code === 'profile_exists') {
          toast.info(result.error || '이미 프로필이 존재합니다.');
          leaveOnboarding('/protected/dashboard');
          return;
        } else if (res.status === 401) {
          toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
          router.push('/login');
          return;
        } else {
          toast.error(result.error || '프로필 등록 중 오류가 발생했습니다.');
          setLoading(false);
          return;
        }
      }
      toast.error('태그 생성이 계속 겹칩니다. 닉네임을 바꿔 다시 시도해주세요.');
    } catch (error) {
      toast.error('예기치 않은 오류가 발생했습니다. 나중에 다시 시도해주세요.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center">
      <div className="w-full space-y-4">
        <h1 className="text-xl font-semibold text-center text-ink">프로필 설정</h1>
        <AnimatedSection>
          <FormLabel htmlFor="name">이름</FormLabel>
          <Input
            id="name"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border p-2 rounded bg-card"
          />
          <FormLabel htmlFor="nickname">닉네임</FormLabel>
          <Input
            id="nickname"
            placeholder="닉네임"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full border p-2 rounded bg-card"
          />
          <p className="mt-1 text-sm text-ink-faint">
            닉네임은 영어 알파벳과 숫자, 언더스코어(_)만 사용할 수 있습니다.
          </p>
          <FormLabel htmlFor="bio">자기소개</FormLabel>
          <Textarea
            id="bio"
            placeholder="자기소개 (선택)"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full border p-2 rounded bg-card resize-none"
          />
          <Button className="w-full" onClick={handleSubmit} disabled={loading} variant="primary">
            {loading ? '등록 중...' : '프로필 등록하기'}
          </Button>
        </AnimatedSection>
      </div>
    </div>
  );
}
