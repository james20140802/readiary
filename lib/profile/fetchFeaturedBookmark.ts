import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { FeaturedBookmark } from '@/types/profile';
import type { ProfileFetchOptions } from './fetchFeaturedQuote';

export const BOOKMARK_PAGE_QUOTES = 3;

export async function fetchFeaturedBookmark(
  userBookId: string | null | undefined,
  ownerId: string,
  { publicOnly = false }: ProfileFetchOptions = {}
): Promise<FeaturedBookmark | null> {
  if (!userBookId) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_featured_bookmark', {
    p_user_book_id: userBookId,
    p_owner_id: ownerId,
    p_public_only: publicOnly,
  });
  if (error) {
    console.error('Featured bookmark unavailable:', error.code);
    return null;
  }
  return data as unknown as FeaturedBookmark | null;
}
