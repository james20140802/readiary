import { createSupabaseServerClient } from '@/lib/supabase/server';
import { hasEntryContent } from '@/lib/entries/validation';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import type { FeaturedBookmark } from '@/types/profile';
import type { ProfileFetchOptions } from './fetchFeaturedQuote';

/** 펼친 페이지에 싣는 인용 수 — 그 아래는 "발췌집 전체 →" */
export const BOOKMARK_PAGE_QUOTES = 3;

/**
 * 책갈피가 가리키는 발췌집 — profiles.bookmark_user_book_id의 책 제목과 인용 몇 토막.
 * 순서는 발췌집 전체 페이지와 같게 옮겨 적은 순(date asc) — 책갈피 면이 발췌집의 첫 면이 된다.
 * 책은 프로필 주인(ownerId)의 **완독한** 책이어야 한다 — FK는 존재만 보장하므로 남의 책 id를
 * 써 넣거나 완독을 취소한 뒤에는 null(책갈피를 꽂지 않는다). 친구 프로필이면 공개 기록의 인용만 센다.
 * 인용 수는 행 캡에 잘리지 않도록 끝까지 읽어 센다(다른 집계와 같이 fetchAllRows).
 */
export async function fetchFeaturedBookmark(
  userBookId: string | null | undefined,
  ownerId: string,
  { publicOnly = false }: ProfileFetchOptions = {}
): Promise<FeaturedBookmark | null> {
  if (!userBookId) return null;
  const supabase = await createSupabaseServerClient();

  const { data: ub, error: ubError } = await supabase
    .from('user_books')
    .select('id, book_id, books(title)')
    .eq('id', userBookId)
    .eq('user_id', ownerId)
    .eq('is_finished', true)
    .maybeSingle();
  if (ubError || !ub || !ub.books?.title) return null;

  const { rows, error: entriesError } = await fetchAllRows<{ quote: string | null }>((from, to) => {
    let query = supabase
      .from('entries')
      .select('quote')
      .eq('user_book_id', userBookId)
      .not('quote', 'is', null);
    if (publicOnly) query = query.eq('is_private', false);
    return query
      .order('date', { ascending: true })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);
  });
  if (entriesError) return null;

  const quotes = rows.flatMap((r) => (hasEntryContent(r.quote, null) ? [r.quote!] : []));

  return {
    userBookId: ub.id,
    bookId: ub.book_id,
    title: ub.books.title,
    quoteCount: quotes.length,
    quotes: quotes.slice(0, BOOKMARK_PAGE_QUOTES),
  };
}
