import { todayKST } from '@/lib/dates';
import { selectRecall, type RecallCandidate } from '@/lib/recall/selectRecall';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
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

  // 책 목록도 행 캡을 넘을 수 있어 페이지네이션 — 잘리면 그 책들의 기록이 후보에서 통째로 빠진다.
  const { rows: userBooks, error: userBooksError } = await fetchAllRows<{
    id: string;
    books: { title: string } | null;
  }>((from, to) =>
    supabase
      .from('user_books')
      .select('id, books(title)')
      .eq('user_id', user.id)
      .order('id', { ascending: true })
      .range(from, to)
  );

  if (userBooksError || userBooks.length === 0) return null;

  const bookIds = userBooks.map((b) => b.id);
  const todayKst = todayKST();

  // 후보 전량 필요 — 절단되면 같은 월-일 우선 선택이 페이지 밖 기록을 놓친다. 페이지네이션으로 끝까지 읽는다.
  const { rows: entries, error: entriesError } = await fetchAllRows<{
    id: string;
    date: string;
    quote: string | null;
    note: string | null;
    user_book_id: string;
  }>((from, to) =>
    supabase
      .from('entries')
      .select('id, date, quote, note, user_book_id')
      .in('user_book_id', bookIds)
      .lt('date', todayKst)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true })
      .range(from, to)
  );

  if (entriesError || entries.length === 0) return null;

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
