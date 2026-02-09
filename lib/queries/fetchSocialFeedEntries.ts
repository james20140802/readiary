'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { transformDetailSocialFeedEntries, transformSocialFeedEntries } from '@/utils/entries';

export async function fetchSocialFeedEntries(page: number = 0, limit: number = 10) {
  const supabase = await createSupabaseServerClient();

  const from = page * limit;
  const to = from + limit - 1;

  // 현재 유저 정보
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) return [];

  // 친구 목록 (accepted 상태) - sent and received
  const { data: sent } = await supabase
    .from('friends')
    .select('friend_id')
    .eq('user_id', user.id)
    .eq('status', 'accepted');

  const { data: received } = await supabase
    .from('friends')
    .select('user_id')
    .eq('friend_id', user.id)
    .eq('status', 'accepted');

  const friendIds = [
    ...(sent?.map((f) => f.friend_id) ?? []),
    ...(received?.map((f) => f.user_id) ?? []),
  ];

  if (friendIds.length === 0) return [];

  const { data: userBooks } = await supabase
    .from('user_books')
    .select('id')
    .in('user_id', friendIds);

  const userBookIds = userBooks?.map((b) => b.id) ?? [];
  if (userBookIds.length === 0) return [];

  // entries + profiles 병렬 fetch
  const [{ data: entries }, { data: profiles }] = await Promise.all([
    supabase
      .from('entries')
      .select(
        `
        id,
        date,
        summary,
        from_page,
        to_page,
        created_at,
        is_private,
        user_book_id,
        user_books (
          id,
          user_id,
          book_id,
          progress,
          created_at,
          books (
            id,
            title,
            author,
            total_pages,
            cover_url
          )
        )
      `
      )
      .in('user_book_id', userBookIds)
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .range(from, to),

    supabase.from('profiles').select('*').in('id', friendIds),
  ]);

  if (!entries || !profiles) return [];

  const enrichedEntries = transformSocialFeedEntries(entries, profiles);

  return enrichedEntries;
}

export async function fetchDetailSocialFeedEntries(page: number = 0, limit: number = 10) {
  const supabase = await createSupabaseServerClient();

  const from = page * limit;
  const to = from + limit - 1;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (!user || userError) return [];

  // 1. 친구 목록 (accepted 상태)
  const [{ data: sent }, { data: received }] = await Promise.all([
    supabase.from('friends').select('friend_id').eq('user_id', user.id).eq('status', 'accepted'),
    supabase.from('friends').select('user_id').eq('friend_id', user.id).eq('status', 'accepted'),
  ]);

  const friendIds = [
    ...(sent?.map((f) => f.friend_id) ?? []),
    ...(received?.map((f) => f.user_id) ?? []),
  ];

  if (friendIds.length === 0) return [];

  // 2. 친구들의 user_book_id
  const { data: userBooks } = await supabase
    .from('user_books')
    .select('id')
    .in('user_id', friendIds);

  const userBookIds = userBooks?.map((b) => b.id) ?? [];
  if (userBookIds.length === 0) return [];

  // 3. 메인 쿼리 (ParserError 해결을 위해 select 구문 단순화)
  const [{ data: entries }, { data: profiles }] = await Promise.all([
    supabase
      .from('entries')
      .select(
        `
        id,
        date,
        summary,
        from_page,
        to_page,
        created_at,
        is_private,
        user_book_id,
        user_books (
          id,
          user_id,
          book_id,
          progress,
          created_at,
          books (
            id,
            title,
            author,
            total_pages,
            cover_url
          )
        ),
        likes (
          user_id
        )
      `
      )
      .in('user_book_id', userBookIds)
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .range(from, to),

    supabase.from('profiles').select('*').in('id', friendIds),
  ]);

  if (!entries || !profiles) return [];

  // 4. 데이터 가공 (initialLiked 여부 판단 로직 포함)
  const enrichedEntries = transformDetailSocialFeedEntries(entries, profiles, user.id);

  return enrichedEntries;
}
