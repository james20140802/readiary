'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import { updateProgress } from '@/utils/sync';
import { useBadgeAwarder } from '@/hooks/useBadgeAwarder';

export default function NewEntryPage() {
  const { book_id } = useParams();
  const router = useRouter();
  const supabase = createSupabaseClient();

  const awardBadges = useBadgeAwarder();

  const [fromPage, setFromPage] = useState<number | ''>('');
  const [toPage, setToPage] = useState<number | ''>('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user.id;
    if (!userId || typeof book_id !== 'string') return;

    const { data: userBook } = await supabase
      .from('user_books')
      .select('id')
      .eq('user_id', userId)
      .eq('book_id', book_id)
      .single();

    if (!userBook) {
      setError('책 등록 정보가 없습니다.');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('entries').insert({
      user_book_id: userBook.id,
      from_page: fromPage || null,
      to_page: toPage || null,
      summary,
      date: new Date().toISOString().split('T')[0],
    });

    if (insertError) {
      setError('기록 저장 중 오류가 발생했습니다.');
    } else {
      // 진행도 자동 업데이트
      console.log('📡 calling RPC with:', {
        p_book_id: book_id,
        p_user_id: userId,
      });
      await updateProgress(book_id, userId);
      // 배지 조건 검사 및 수여
      await awardBadges(userId);
      router.push(`/protected/books/${book_id}`);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">📓 오늘의 독서 기록</h1>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-base font-semibold text-gray-700 dark:text-gray-300">
            시작 페이지
          </label>
          <input
            type="number"
            name="from_page"
            value={fromPage}
            onChange={(e) => setFromPage(e.target.value === '' ? '' : Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white shadow-sm px-3 py-2"
            placeholder="예: 10"
          />
        </div>
        <div>
          <label className="block text-base font-semibold text-gray-700 dark:text-gray-300">
            종료 페이지
          </label>
          <input
            type="number"
            name="to_page"
            value={toPage}
            onChange={(e) => setToPage(e.target.value === '' ? '' : Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white shadow-sm px-3 py-2"
            placeholder="예: 25"
          />
        </div>
      </div>

      <div>
        <label className="block text-base font-semibold text-gray-700 dark:text-gray-300">
          줄거리 요약
        </label>
        <textarea
          name="summary"
          rows={6}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white shadow-sm px-3 py-2 resize-none"
          placeholder="오늘 읽은 내용을 간단히 정리해 보세요."
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 text-sm disabled:opacity-50"
        disabled={loading}
      >
        {loading ? '저장 중...' : '➕ 기록 저장하기'}
      </button>
    </form>
  );
}
