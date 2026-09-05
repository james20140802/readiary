// /app/onboarding/page.tsx
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
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
    redirect('/protected/dashboard');
  }

  return <OnboardingForm defaultName={nameFromMetadata(user.user_metadata)} />;
}
