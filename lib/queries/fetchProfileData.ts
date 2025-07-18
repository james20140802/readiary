import { createSupabaseClient } from '@/lib/supabase/client';
import { ProfileFullData } from '@/types/profile';

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
  const supabase = createSupabaseClient();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('nickname', nickname)
    .eq('tag', tag)
    .single();

  if (profileError || !profile) return { profile: null, userBooks: [], userBadges: [] };

  const [{ data: userBooks }, { data: userBadges }] = await Promise.all([
    supabase
      .from('user_books')
      .select('*, books(*)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('user_badges')
      .select('awarded_at, badge:badges!fk_user_badges_badge_id(id, name, description, icon_url)')
      .eq('user_id', profile.id)
      .order('awarded_at', { ascending: false }),
  ]);

  return {
    profile,
    userBooks: userBooks ?? [],
    userBadges: userBadges ?? [],
  };
}

export async function fetchByUserId(userId: string) {
  const supabase = createSupabaseClient();

  const [{ data: profile }, { data: userBooks }, { data: userBadges }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase
      .from('user_books')
      .select('*, books(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),

    supabase
      .from('user_badges')
      .select('awarded_at, badge:badges!fk_user_badges_badge_id(id, name, description, icon_url)')
      .eq('user_id', userId)
      .order('awarded_at', { ascending: false }),
  ]);

  return {
    profile,
    userBooks: userBooks ?? [],
    userBadges: userBadges ?? [],
  };
}
