import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { EntryDetailData } from '@/types/entry';

export async function fetchEntryDetail(entryId: string): Promise<EntryDetailData | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await getServerUser();

  if (!user || userError) return null;

  const { data, error } = await supabase
    .from('entries')
    .select(
      `
            id,
            note,
            quote,
            from_page,
            to_page,
            date,
            created_at,
            user_book_id,
            is_private,
            user_books (
              book_id,
              user_id,
              books (
                id,
                title,
                author,
                cover_url,
                total_pages,
                isbn
              )
            ),
            likes (
             user_id
            ),
            comments:comments (count)
          `
    )
    .eq('id', entryId)
    .single();

  if (error || !data || user.id !== data.user_books.user_id) return null;

  // 이 기록을 그 달의 문장으로 골랐는가 — 날짜가 다른 달로 옮겨졌거나 문장이 지워진 선택은 무효다(DB의 읽기 규칙과 같다).
  // 곁다리라 읽지 못해도 기록은 그대로 보인다.
  const { data: pick } = await supabase
    .from('monthly_sentence_picks')
    .select('month')
    .eq('entry_id', entryId)
    // 날짜를 옮기기 전 달의 무효 선택이 함께 남아 있을 수 있어 기록의 달로 좁힌다
    .eq('month', `${data.date.slice(0, 7)}-01`)
    .maybeSingle();
  const isMonthlySentence = !!pick && !!data.quote?.trim();

  const isLiked = data.likes?.some((like) => like.user_id === user.id) ?? false;
  const likeCount = data.likes?.length ?? 0;

  return {
    entry: {
      id: data.id,
      note: data.note,
      quote: data.quote,
      from_page: data.from_page,
      to_page: data.to_page,
      date: data.date,
      is_private: data.is_private,
      book: data.user_books.books,
      created_at: data.created_at ?? data.date,
    },
    userId: user.id,
    initialLiked: isLiked,
    initialLikeCount: likeCount,
    initialCommentCount: data.comments[0]?.count ?? 0,
    isMonthlySentence,
  };
}
