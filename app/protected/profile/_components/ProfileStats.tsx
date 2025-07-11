'use client';

import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';

export default function ProfileStats() {
  const [bookCount, setBookCount] = useState<number | null>(null);
  const [entryCount, setEntryCount] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createSupabaseClient();

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [{ count: bookCnt }, { count: entryCnt }, { data: entries }] = await Promise.all([
          supabase.from('user_books').select('*', { count: 'exact', head: true }),
          supabase.from('entries').select('*', { count: 'exact', head: true }),
          supabase.from('entries').select('from_page, to_page'),
        ]);

        setBookCount(typeof bookCnt === 'number' ? bookCnt : 0);
        setEntryCount(typeof entryCnt === 'number' ? entryCnt : 0);

        const total = (entries ?? []).reduce(
          (acc: number, entry: { from_page: number | null; to_page: number | null }) => {
            const from = entry.from_page ?? 0;
            const to = entry.to_page ?? 0;
            return acc + Math.max(to - from, 0);
          },
          0
        );
        setTotalPages(total);
      } catch (e: unknown) {
        if (e instanceof Error) {
          console.error(e.message);
        }
        setBookCount(0);
        setEntryCount(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-300 dark:border-gray-700">
      <h2 className="text-lg font-semibold mb-3">📊 독서 요약</h2>
      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
        <p>
          총 읽은 책: <span className="font-bold">{loading ? '...' : `${bookCount ?? 0}권`}</span>
        </p>
        <p>
          총 엔트리 수:{' '}
          <span className="font-bold">{loading ? '...' : `${entryCount ?? 0}개`}</span>
        </p>
        <p>
          총 읽은 페이지:{' '}
          <span className="font-bold">{loading ? '...' : `${totalPages ?? 0}p`}</span>
        </p>
      </div>
    </div>
  );
}
