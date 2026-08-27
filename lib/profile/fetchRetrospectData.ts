import { todayKST } from '@/lib/dates';
import { hasEntryContent } from '@/lib/entries/validation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { summarizeByMonth, type MonthlySummary } from './monthlySummary';

export { summarizeByMonth };
export type { MonthlySummary };

export interface FinishedBookExcerpt {
  bookId: string;
  title: string;
  quoteCount: number;
}

export interface RetrospectData {
  finishedBooks: FinishedBookExcerpt[];
  monthly: MonthlySummary[];
}

const RECENT_MONTHS = 6;
const ENTRIES_PAGE_SIZE = 1000;

interface RetrospectEntryRow {
  date: string;
  quote: string | null;
  user_book_id: string;
}

/**
 * PostgREST는 한 요청당 최대 행 수(기본 1,000)를 넘는 결과를 조용히 잘라낸다.
 * 회고 집계는 전체 entries가 필요하므로 range 페이지네이션으로 끝까지 읽는다.
 */
async function fetchAllRetrospectEntries(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userBookIds: string[]
): Promise<RetrospectEntryRow[]> {
  const all: RetrospectEntryRow[] = [];

  for (let offset = 0; ; offset += ENTRIES_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('entries')
      .select('date, quote, user_book_id')
      .in('user_book_id', userBookIds)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true })
      .range(offset, offset + ENTRIES_PAGE_SIZE - 1);

    if (error || !data) return all;
    all.push(...data);
    if (data.length < ENTRIES_PAGE_SIZE) return all;
  }
}

/**
 * 프로필 회고 섹션 데이터 — 완독 책의 발췌집 목록 + 최근 6개월 월별 기록 수.
 * 본인 데이터 전용(비공개 포함) — RLS 하 로그인 사용자 소유 entries만 조회.
 */
export async function fetchRetrospectData(userId: string): Promise<RetrospectData> {
  const supabase = await createSupabaseServerClient();

  const { data: userBooks, error: userBooksError } = await supabase
    .from('user_books')
    .select('id, book_id, is_finished, books(title)')
    .eq('user_id', userId);

  if (userBooksError || !userBooks || userBooks.length === 0) {
    return { finishedBooks: [], monthly: summarizeByMonth([], todayKST(), RECENT_MONTHS) };
  }

  const userBookIds = userBooks.map((b) => b.id);

  const safeEntries = await fetchAllRetrospectEntries(supabase, userBookIds);

  const quoteCountByUserBookId = new Map<string, number>();
  for (const entry of safeEntries) {
    if (hasEntryContent(entry.quote, null)) {
      quoteCountByUserBookId.set(
        entry.user_book_id,
        (quoteCountByUserBookId.get(entry.user_book_id) ?? 0) + 1
      );
    }
  }

  const finishedBooks: FinishedBookExcerpt[] = userBooks.flatMap((b) => {
    if (!b.is_finished || !b.books?.title) return [];
    return [
      {
        bookId: b.book_id,
        title: b.books.title,
        quoteCount: quoteCountByUserBookId.get(b.id) ?? 0,
      },
    ];
  });

  const monthly = summarizeByMonth(
    safeEntries.map((e) => e.date),
    todayKST(),
    RECENT_MONTHS
  );

  return { finishedBooks, monthly };
}
