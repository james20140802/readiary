import { createSupabaseServerClient } from '@/lib/supabase/server';
import { hasEntryContent } from '@/lib/entries/validation';
import type { FeaturedBookmark } from '@/types/profile';

/** 펼친 페이지에 싣는 인용 수 — 그 아래는 "발췌집 전체 →" */
export const BOOKMARK_PAGE_QUOTES = 4;

/**
 * 책갈피가 가리키는 발췌집 — profiles.bookmark_user_book_id의 책 제목과 최근 인용 몇 토막.
 * RLS가 막으면(친구의 비공개 기록) 인용만 줄어든다. 책 자체가 안 보이면 null — 책갈피를 꽂지 않는다.
 */
export async function fetchFeaturedBookmark(
  userBookId: string | null | undefined
): Promise<FeaturedBookmark | null> {
  if (!userBookId) return null;
  const supabase = await createSupabaseServerClient();

  const { data: ub, error: ubError } = await supabase
    .from('user_books')
    .select('id, book_id, books(title)')
    .eq('id', userBookId)
    .maybeSingle();
  if (ubError || !ub || !ub.books?.title) return null;

  const { data: rows, error: entriesError } = await supabase
    .from('entries')
    .select('quote')
    .eq('user_book_id', userBookId)
    .not('quote', 'is', null)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (entriesError) return null;

  const quotes = (rows ?? []).flatMap((r) => (hasEntryContent(r.quote, null) ? [r.quote!] : []));

  return {
    userBookId: ub.id,
    bookId: ub.book_id,
    title: ub.books.title,
    quoteCount: quotes.length,
    quotes: quotes.slice(0, BOOKMARK_PAGE_QUOTES),
  };
}
