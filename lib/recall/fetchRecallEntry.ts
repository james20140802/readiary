import { todayKST } from '@/lib/dates';
import { selectRecall, type RecallCandidate } from '@/lib/recall/selectRecall';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface RecallEntry {
  id: string;
  date: string;
  quote: string | null;
  note: string | null;
  bookTitle: string;
  yearsAgo: number | null;
}

/**
 * 홈 회상 카드용 기록 선택 — 실패·미로그인·후보 없음은 전부 null (홈이 조용히 숨김).
 * 본인 데이터 전용(비공개 포함) — RLS 하 로그인 사용자 소유 entries만 조회.
 */
export async function fetchRecallEntry(): Promise<RecallEntry | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) return null;

  const { data: userBooks, error: userBooksError } = await supabase
    .from('user_books')
    .select('id, books(title)')
    .eq('user_id', user.id);

  if (userBooksError || !userBooks || userBooks.length === 0) return null;

  const bookIds = userBooks.map((b) => b.id);
  const todayKst = todayKST();

  const { data: entries, error: entriesError } = await supabase
    .from('entries')
    .select('id, date, quote, note, user_book_id')
    .in('user_book_id', bookIds)
    .lt('date', todayKst);

  if (entriesError || !entries || entries.length === 0) return null;

  const candidates: RecallCandidate[] = entries.map((e) => ({ id: e.id, date: e.date }));
  const picked = selectRecall(candidates, todayKst, `${user.id}|${todayKst}`);
  if (!picked) return null;

  const entry = entries.find((e) => e.id === picked.id);
  if (!entry) return null;

  const userBook = userBooks.find((b) => b.id === entry.user_book_id);
  const bookTitle = userBook?.books?.title;
  if (!bookTitle) return null;

  const isSameMonthDay = entry.date.slice(5) === todayKst.slice(5);
  const yearsAgo = isSameMonthDay
    ? Number(todayKst.slice(0, 4)) - Number(entry.date.slice(0, 4))
    : null;

  return {
    id: entry.id,
    date: entry.date,
    quote: entry.quote,
    note: entry.note,
    bookTitle,
    yearsAgo,
  };
}
