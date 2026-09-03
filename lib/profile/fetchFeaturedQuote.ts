import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { FeaturedQuote } from '@/types/profile';

export interface ProfileFetchOptions {
  /** 친구 프로필 — 공개 기록만. RLS에 기대지 않고 쿼리에서 비공개를 거른다(다른 친구용 조회와 같은 규칙) */
  publicOnly?: boolean;
}

/**
 * 뒷표지 인용 — profiles.featured_entry_id가 가리키는 기록의 문장과 출처.
 * 친구가 비공개 기록을 골라 둔 경우 null — 뒷표지는 비운다. 마이그레이션 전이라 id가 없어도 null.
 */
export async function fetchFeaturedQuote(
  entryId: string | null | undefined,
  { publicOnly = false }: ProfileFetchOptions = {}
): Promise<FeaturedQuote | null> {
  if (!entryId) return null;
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('entries')
    .select('id, quote, user_books(books(title, author))')
    .eq('id', entryId);
  if (publicOnly) query = query.eq('is_private', false);
  const { data, error } = await query.maybeSingle();
  if (error || !data || typeof data.quote !== 'string' || data.quote.trim() === '') return null;

  const book = data.user_books?.books ?? null;
  return {
    entryId: data.id,
    quote: data.quote,
    bookTitle: book?.title ?? null,
    author: book?.author ?? null,
  };
}
