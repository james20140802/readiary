import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function GreetingHeader() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user?.id)
    .single();

  return (
    <h1 className="text-page-title text-label dark:text-white mb-4" aria-label="인사말">
      👋 반가워요! <span className="font-bold">{profile?.name ?? '사용자'}</span>님
    </h1>
  );
}
