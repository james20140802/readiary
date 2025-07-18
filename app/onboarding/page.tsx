// /app/onboarding/page.tsx
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import OnboardingForm from './_components/OnboardingForm';

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/');

  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();

  if (profile) {
    redirect('/protected/dashboard');
  }

  return <OnboardingForm />;
}
