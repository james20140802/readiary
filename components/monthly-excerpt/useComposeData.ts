'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, SessionExpiredError } from '@/lib/api/fetch';
import type { Candidate, MonthBook, MonthKey } from '@/lib/monthly-excerpt/types';

export interface CandidatePage {
  items: Candidate[];
  hasMore: boolean;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`request failed: ${res.status}`);
  return (await res.json()) as T;
}

/**
 * 책 칩. 칩은 목록과 따로 불러오고 따로 실패한다.
 * initial이 null이면 서버가 불러오지 못한 것이라 오류 상태에서 시작한다.
 */
export function useMonthBooks(month: MonthKey, initial: MonthBook[] | null) {
  const [books, setBooks] = useState<MonthBook[] | null>(initial);
  const [status, setStatus] = useState<'ready' | 'loading' | 'error'>(initial ? 'ready' : 'error');
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const mine = ++seq.current;
    setStatus('loading');
    try {
      const body = await getJson<{ books: MonthBook[] }>(
        `/api/monthly-excerpts/books?month=${month}`
      );
      if (mine !== seq.current) return;
      setBooks(body.books);
      setStatus('ready');
    } catch (error) {
      if (mine !== seq.current || error instanceof SessionExpiredError) return;
      setStatus('error');
    }
  }, [month]);

  return { books, status, reload };
}

/**
 * 후보 목록. 책 칩 전환(select)·더 보기(loadMore)·다시 불러오기(reload)를 한곳에서 맡는다.
 * 늦게 도착한 옛 응답이 새 칩의 목록을 덮지 않도록 요청마다 번호를 매긴다.
 * 책 칩의 수와 달리 목록의 로딩·실패·재시도는 칩과 독립이다.
 */
export function useCandidates(month: MonthKey, initial: CandidatePage | null) {
  const [userBookId, setUserBookId] = useState<string | null>(null);
  const [page, setPage] = useState<CandidatePage>(initial ?? { items: [], hasMore: false });
  const [status, setStatus] = useState<'ready' | 'loading' | 'error'>(initial ? 'ready' : 'error');
  const [moreStatus, setMoreStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const nextPage = useRef(1);
  const seq = useRef(0);
  // 여러 렌더에 걸쳐 같은 값을 읽어야 하는 최신 상태
  const current = useRef({ userBookId, page });
  useEffect(() => {
    current.current = { userBookId, page };
  });

  const fetchPage = useCallback(
    (book: string | null, n: number) => {
      const qs = new URLSearchParams({ month, page: String(n) });
      if (book) qs.set('userBookId', book);
      return getJson<CandidatePage>(`/api/monthly-excerpts/candidates?${qs}`);
    },
    [month]
  );

  const load = useCallback(
    async (book: string | null) => {
      const mine = ++seq.current;
      setUserBookId(book);
      setStatus('loading');
      setMoreStatus('idle');
      try {
        const body = await fetchPage(book, 0);
        if (mine !== seq.current) return;
        nextPage.current = 1;
        setPage(body);
        setStatus('ready');
      } catch (error) {
        if (mine !== seq.current || error instanceof SessionExpiredError) return;
        setStatus('error');
      }
    },
    [fetchPage]
  );

  const select = useCallback((book: string | null) => void load(book), [load]);
  const reload = useCallback(() => void load(current.current.userBookId), [load]);

  const loadMore = useCallback(async () => {
    const mine = ++seq.current;
    const book = current.current.userBookId;
    setMoreStatus('loading');
    try {
      const body = await fetchPage(book, nextPage.current);
      if (mine !== seq.current) return;
      nextPage.current += 1;
      setPage((prev) => {
        // 그사이 기록이 바뀌어 쪽이 겹쳐도 같은 문장이 두 번 나오지 않게 한다
        const seen = new Set(prev.items.map((c) => c.entryId));
        return {
          items: [...prev.items, ...body.items.filter((c) => !seen.has(c.entryId))],
          hasMore: body.hasMore,
        };
      });
      setMoreStatus('idle');
    } catch (error) {
      if (mine !== seq.current || error instanceof SessionExpiredError) return;
      setMoreStatus('error');
    }
  }, [fetchPage]);

  return { userBookId, ...page, status, moreStatus, select, reload, loadMore };
}
