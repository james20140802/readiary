import { notFound } from 'next/navigation';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import SettingsScreen from '@/components/settings/SettingsScreen';
import { maskEmail } from '@/components/settings/maskEmail';

export default async function SettingsPage() {
  const {
    data: { user },
    error: userError,
  } = await getServerUser();

  if (!user || userError) {
    return <p className="mt-10 text-center text-danger">로그인이 필요합니다.</p>;
  }

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) return notFound();

  return <SettingsScreen profile={profile} email={maskEmail(user.email)} />;
}
