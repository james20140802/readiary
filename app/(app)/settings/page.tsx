import { notFound } from 'next/navigation';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import SettingsScreen from '@/components/settings/SettingsScreen';
import { maskEmail } from '@/components/settings/maskEmail';
import { hasPasswordIdentity } from '@/lib/account/deletion';
import { fetchSentenceRule } from '@/lib/monthly-sentence/server';

export default async function SettingsPage() {
  const {
    data: { user },
    error: userError,
  } = await getServerUser();

  if (!user || userError) {
    return <p className="mt-10 text-center text-danger">로그인이 필요합니다.</p>;
  }

  const supabase = await createSupabaseServerClient();
  // 일기장 기준은 다른 구역과 따로 실패한다 — 못 불러와도 설정은 열린다
  const [{ data: profile }, sentenceRule] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    fetchSentenceRule(user.id).catch(() => null),
  ]);
  if (!profile) return notFound();

  return (
    <SettingsScreen
      profile={profile}
      email={maskEmail(user.email)}
      hasPassword={hasPasswordIdentity(user)}
      sentenceRule={sentenceRule}
    />
  );
}
