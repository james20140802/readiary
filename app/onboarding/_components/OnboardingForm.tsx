'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import FormGroup from '@/components/ui/FormGroup';
import FormLabel from '@/components/ui/FormLabel';
import FormAlert from '@/components/ui/FormAlert';
import AuthFrame from '@/components/auth/AuthFrame';
import { validateNickname, MAX_NICKNAME_LENGTH } from '@/lib/profile/nickname';
import { sanitizeRedirectPath } from '@/lib/auth/safeRedirect';

const generateRandomTag = () => Math.floor(1000 + Math.random() * 9000).toString();

/**
 * 프로필이 생긴 직후의 이동은 전체 페이지 이동으로 — 이 화면에 있는 동안 클라이언트 라우터가 받아 둔
 * 보호 라우트 응답은 전부 "프로필 없음 → /onboarding" 리다이렉트라, router.push 로 가면 그 낡은 캐시를
 * 재사용해 온보딩 화면에 그대로 머문다(2026-09-05 프로덕션 재현: 등록 201 뒤 서버 요청 0건).
 */
const leaveOnboarding = (path: string) => {
  window.location.assign(path);
};

interface OnboardingFormProps {
  /** 소셜 로그인이 알려 준 이름 — 있으면 미리 채워 두고, 사용자가 고칠 수 있다 */
  defaultName?: string;
}

export default function OnboardingForm({ defaultName = '' }: OnboardingFormProps) {
  const [name, setName] = useState(defaultName);
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const problem = validateNickname(nickname.trim());
    setNicknameError(problem);
    setFormError(null);
    if (problem) return;

    setLoading(true);
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

        const result = await res.json().catch(() => ({}));

        if (res.ok) {
          // 초대 링크로 가입했다면 서버가 복귀 경로를 함께 준다 — 없으면 홈
          const redirectTo =
            typeof result.redirectTo === 'string' ? sanitizeRedirectPath(result.redirectTo) : null;
          leaveOnboarding(redirectTo ?? '/protected/dashboard');
          return;
        }

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
          setFormError(result.error || '프로필 등록 중 오류가 발생했습니다.');
          return;
        }
      }
      setFormError('태그 생성이 계속 겹칩니다. 닉네임을 바꿔 다시 시도해주세요.');
    } catch (error) {
      setFormError('예기치 않은 오류가 발생했습니다. 나중에 다시 시도해주세요.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = name.trim() !== '' && nickname.trim() !== '';

  return (
    <AuthFrame title="프로필 설정" lead="이름과 닉네임을 정하면 책장이 열립니다.">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError && <FormAlert>{formError}</FormAlert>}

        <FormGroup>
          <FormLabel htmlFor="name">이름</FormLabel>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="친구에게 보이는 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </FormGroup>

        <FormGroup>
          <FormLabel htmlFor="nickname">닉네임</FormLabel>
          <Input
            id="nickname"
            name="nickname"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={MAX_NICKNAME_LENGTH}
            placeholder="영문·숫자·언더스코어"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              if (nicknameError) setNicknameError(null);
            }}
            error={nicknameError ?? undefined}
            required
          />
          <p className="text-caption text-ink-faint">
            영어 알파벳과 숫자, 언더스코어(_)만 쓸 수 있습니다. 친구가 나를 찾을 때 씁니다.
          </p>
        </FormGroup>

        <FormGroup>
          <FormLabel htmlFor="bio">자기소개</FormLabel>
          <Textarea
            id="bio"
            name="bio"
            rows={3}
            placeholder="한 줄이면 충분합니다 (선택)"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            fullWidth
            className="resize-none"
          />
        </FormGroup>

        <Button type="submit" fullWidth loading={loading} disabled={!canSubmit} className="mt-2">
          {loading ? '등록 중...' : '프로필 등록하기'}
        </Button>
      </form>
    </AuthFrame>
  );
}
