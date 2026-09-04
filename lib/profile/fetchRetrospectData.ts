import { todayKST } from '@/lib/dates';
import { hasEntryContent } from '@/lib/entries/validation';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { summarizeByMonth, type MonthlySummary } from './monthlySummary';
import type { ProfileFetchOptions } from './fetchFeaturedQuote';

export { summarizeByMonth };
export type { MonthlySummary };

/** 발췌집 한 권 — 완독했고 옮겨 적은 문장이 하나라도 있는 책 */
export interface FinishedBookExcerpt {
  bookId: string;
  title: string;
  coverUrl: string | null;
  quoteCount: number;
}

export interface RetrospectData {
  finishedBooks: FinishedBookExcerpt[];
  monthly: MonthlySummary[];
}

const RECENT_MONTHS = 6;

interface RetrospectEntryRow {
  date: string;
  quote: string | null;
  user_book_id: string;
}

/** finished_at은 완독 행 전부 채워져 있다(20260905 백필). 방어적으로 등록 시각을 대신 쓰고, 둘 다 없으면 맨 뒤 */
function finishedOrder(b: { finished_at: string | null; created_at: string | null }): string {
  return b.finished_at ?? b.created_at ?? '';
}

/**
 * 프로필 책 데이터 — 완독 책의 발췌집 목록(최근 완독부터) + 최근 6개월 월별 기록 수와
 * 그 달의 책 제목·인용 몇 토막(인덱스를 누르면 펼쳐지는 달 페이지).
 * 본인이면 비공개 포함 전부, 친구 프로필(publicOnly)이면 공개 기록만 집계한다 — RLS에 기대지 않는다.
 * 조회 실패 시 부분 집계를 내보내는 대신 null — 호출부가 불러오기 실패 상태로 표시.
 */
export async function fetchRetrospectData(
  userId: string,
  { publicOnly = false }: ProfileFetchOptions = {}
): Promise<RetrospectData | null> {
  const supabase = await createSupabaseServerClient();

  // 책 목록도 행 캡을 넘을 수 있어 페이지네이션 — 여기서 잘리면 이후 entries 조회가 그 책들을 복구하지 못한다.
  const { rows: userBooks, error: userBooksError } = await fetchAllRows<{
    id: string;
    book_id: string;
    is_finished: boolean | null;
    finished_at: string | null;
    created_at: string | null;
    books: { title: string; cover_url: string | null } | null;
  }>((from, to) =>
    supabase
      .from('user_books')
      .select('id, book_id, is_finished, finished_at, created_at, books(title, cover_url)')
      .eq('user_id', userId)
      .order('id', { ascending: true })
      .range(from, to)
  );

  if (userBooksError) return null;
  if (userBooks.length === 0) {
    return { finishedBooks: [], monthly: summarizeByMonth([], todayKST(), RECENT_MONTHS) };
  }

  // 회고 집계는 전체 entries가 필요 — 절단 방지를 위해 페이지네이션으로 끝까지 읽는다.
  // 책 필터는 ID 목록 .in() 대신 user_books 조인으로 — 책이 많아도 요청 URL 크기가 일정하다.
  const { rows: safeEntries, error: entriesError } = await fetchAllRows<RetrospectEntryRow>(
    (from, to) => {
      let query = supabase
        .from('entries')
        .select('date, quote, user_book_id, user_books!inner(user_id)')
        .eq('user_books.user_id', userId);
      if (publicOnly) query = query.eq('is_private', false);
      return query
        .order('date', { ascending: true })
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to);
    }
  );

  // 부분 접두어로 집계하면 발췌 수·월별 수치가 조용히 줄어든다 — 오류는 불러오기 실패로 전파.
  if (entriesError) return null;

  const quoteCountByUserBookId = new Map<string, number>();
  for (const entry of safeEntries) {
    if (hasEntryContent(entry.quote, null)) {
      quoteCountByUserBookId.set(
        entry.user_book_id,
        (quoteCountByUserBookId.get(entry.user_book_id) ?? 0) + 1
      );
    }
  }

  const titleByUserBookId = new Map(userBooks.map((b) => [b.id, b.books?.title ?? null]));

  // 최근에 완독한 책이 앞에 — 공책 더미의 맨 위. 옮겨 적은 문장이 없는 책은 발췌집이 아니다
  const finishedBooks: FinishedBookExcerpt[] = [...userBooks]
    .sort((a, b) => finishedOrder(b).localeCompare(finishedOrder(a)))
    .flatMap((b) => {
      const quoteCount = quoteCountByUserBookId.get(b.id) ?? 0;
      if (!b.is_finished || !b.books?.title || quoteCount === 0) return [];
      return [
        {
          bookId: b.book_id,
          title: b.books.title,
          coverUrl: b.books.cover_url ?? null,
          quoteCount,
        },
      ];
    });

  const monthly = summarizeByMonth(
    safeEntries.map((e) => ({
      date: e.date,
      quote: e.quote,
      bookTitle: titleByUserBookId.get(e.user_book_id) ?? null,
    })),
    todayKST(),
    RECENT_MONTHS
  );

  return { finishedBooks, monthly };
}
