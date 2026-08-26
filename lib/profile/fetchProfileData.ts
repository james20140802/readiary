import { ProfileFullData } from '@/types/profile';
import { createSupabaseServerClient } from '../supabase/server';

export function fetchProfileData(userId: string): Promise<ProfileFullData>;
export function fetchProfileData(nickname: string, tag: string): Promise<ProfileFullData>;

export function fetchProfileData(a: string, b?: string): Promise<ProfileFullData> {
  if (b) {
    // nickname + tag 방식
    return fetchByNicknameAndTag(a, b);
  } else {
    // userId 방식
    return fetchByUserId(a);
  }
}

export async function fetchByNicknameAndTag(nickname: string, tag: string) {
  const supabase = await createSupabaseServerClient();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('nickname', nickname)
    .eq('tag', tag)
    .single();

  if (profileError || !profile) return { profile: null, userBooks: [] };

  const { data: userBooks } = await supabase
    .from('user_books')
    .select('*, books(*)')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });

  return {
    profile,
    userBooks: userBooks ?? [],
  };
}

export async function fetchByUserId(userId: string) {
  const supabase = await createSupabaseServerClient();

  const [{ data: profile }, { data: userBooks }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase
      .from('user_books')
      .select('*, books(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  return {
    profile,
    userBooks: userBooks ?? [],
  };
}
