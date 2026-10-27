// /app/onboarding/page.tsx
import { emailConsentAvailable } from '@/lib/email/server';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { hasConsented } from '@/lib/auth/consent';
import OnboardingForm from './_components/OnboardingForm';

/** 소셜 로그인(Google)이 남긴 이름 — full_name이 먼저, 없으면 name. 문자열이 아니면 무시 */
function nameFromMetadata(metadata: Record<string, unknown> | undefined): string {
  for (const key of ['full_name', 'name']) {
    const value = metadata?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();

  if (profile) {
    redirect('/today');
  }

  // 처음 온 사람은 이메일·Google 가입 모두 여기서 만 14세 확인을 받는다
  return (
    <OnboardingForm
      defaultName={nameFromMetadata(user.user_metadata)}
      email={user.email ?? null}
      accountId={user.id}
      emailConsentAvailable={emailConsentAvailable() && !!user.email_confirmed_at}
      requireConsent={!hasConsented(user.user_metadata)}
    />
  );
}
