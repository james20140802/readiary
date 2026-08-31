import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface RecentEntry {
  id: string;
  quote: string | null;
  note: string | null;
  date: string;
  createdAt: string;
  userBookId: string;
  bookTitle: string;
  bookAuthor: string | null;
}

interface RawRecentEntry {
  id: string;
  quote: string | null;
  note: string | null;
  date: string;
  created_at: string | null;
  user_book_id: string;
  user_books: { user_id: string; books: { title: string | null; author: string | null } | null };
}

/**
 * 본인 최신 기록 목록 — 홈의 문장 보드(앞쪽 몇 개)와
 * 책 더미의 "책마다 마지막 문장"(user_book별 첫 등장) 둘 다 이걸로 만든다.
 */
export async function fetchRecentEntries(limit = 50): Promise<RecentEntry[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (!user || userError) return [];

  const { data, error } = await supabase
    .from('entries')
    .select(
      'id, quote, note, date, created_at, user_book_id, user_books!inner(user_id, books(title, author))'
    )
    .eq('user_books.user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const rows = data as unknown as RawRecentEntry[];
  return rows.map((e) => ({
    id: e.id,
    quote: e.quote,
    note: e.note,
    date: e.date,
    createdAt: e.created_at ?? e.date,
    userBookId: e.user_book_id,
    bookTitle: e.user_books.books?.title ?? '(제목 없음)',
    bookAuthor: e.user_books.books?.author ?? null,
  }));
}

/** user_book id → 그 책에 마지막으로 남긴 글(인용 우선). 최신순 목록에서 첫 등장만 남긴다. */
export function latestTextByUserBook(entries: RecentEntry[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const e of entries) {
    if (map[e.userBookId] != null) continue;
    const text = e.quote ?? e.note;
    if (text != null) map[e.userBookId] = text;
  }
  return map;
}
