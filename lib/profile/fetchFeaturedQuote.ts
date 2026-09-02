import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { FeaturedQuote } from '@/types/profile';

/**
 * 뒷표지 인용 — profiles.featured_entry_id가 가리키는 기록의 문장과 출처.
 * RLS가 막으면(친구가 비공개 기록을 골라 둔 경우) 조용히 null — 뒷표지는 비운다.
 * 마이그레이션 전이라 id가 없어도 null.
 */
export async function fetchFeaturedQuote(
  entryId: string | null | undefined
): Promise<FeaturedQuote | null> {
  if (!entryId) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('entries')
    .select('id, quote, user_books(books(title, author))')
    .eq('id', entryId)
    .maybeSingle();
  if (error || !data || typeof data.quote !== 'string' || data.quote.trim() === '') return null;

  const book = data.user_books?.books ?? null;
  return {
    entryId: data.id,
    quote: data.quote,
    bookTitle: book?.title ?? null,
    author: book?.author ?? null,
  };
}
