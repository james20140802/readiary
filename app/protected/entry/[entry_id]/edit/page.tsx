'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { updateProgress } from '@/utils/sync';

export default function EditEntryPage() {
  const params = useParams();
  const router = useRouter();
  const entryId = (Array.isArray(params.entry_id) ? params.entry_id[0] : params.entry_id) ?? '';
  const supabase = createSupabaseClient();

  const [summary, setSummary] = useState('');
  const [fromPage, setFromPage] = useState<number | null>(null);
  const [toPage, setToPage] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, [supabase]);

  useEffect(() => {
    const fetchBookTitle = async () => {
      const { data, error } = await supabase
        .from('entries')
        .select('user_book_id, user_books(book_id, books(title, author))')
        .eq('id', entryId)
        .single();

      if (error || !data?.user_books?.books?.title) {
        setBookTitle('알 수 없는 책');
        setBookAuthor(null);
      } else {
        setBookTitle(data.user_books.books.title);
        setBookAuthor(data.user_books.books.author);
      }
    };

    fetchBookTitle();
  }, [entryId, supabase]);

  useEffect(() => {
    const fetchEntry = async () => {
      const { data, error } = await supabase
        .from('entries')
        .select('summary, from_page, to_page, date')
        .eq('id', entryId)
        .single();

      if (error || !data) {
        setError('기록을 불러오지 못했어요.');
      } else {
        setSummary(data.summary ?? '');
        setFromPage(data.from_page ?? null);
        setToPage(data.to_page ?? null);
        setDate(data.date ?? '');
      }

      setLoading(false);
    };

    fetchEntry();
  }, [entryId, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { error } = await supabase
      .from('entries')
      .update({
        summary,
        from_page: fromPage,
        to_page: toPage,
        date,
      })
      .eq('id', entryId);

    if (error) {
      setError('수정 중 오류가 발생했어요.');
    } else {
      // Fetch book_id for this entry to sync progress
      const { data: entryData, error: fetchError } = await supabase
        .from('entries')
        .select('user_books(book_id)')
        .eq('id', entryId)
        .single();

      if (!fetchError && entryData?.user_books?.book_id && user?.id) {
        await updateProgress(entryData.user_books.book_id, user.id);
      }

      router.push(`/protected/entry/${entryId}`);
    }
  };

  if (loading) return <p className="p-4">로딩 중...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">✍️ 독서 기록 수정</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300">
        📚 {bookTitle}
        {bookAuthor ? ` - ${bookAuthor}` : ''}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          className="w-full h-40 p-3 border border-gray-300 rounded resize-none dark:bg-gray-800 dark:text-white"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="오늘 읽은 내용 요약"
        />
        <div className="flex gap-4">
          <input
            type="number"
            className="w-1/2 p-2 border border-gray-300 rounded dark:bg-gray-800 dark:text-white"
            placeholder="시작 페이지"
            value={fromPage ?? ''}
            onChange={(e) => setFromPage(e.target.value ? parseInt(e.target.value) : null)}
          />
          <input
            type="number"
            className="w-1/2 p-2 border border-gray-300 rounded dark:bg-gray-800 dark:text-white"
            placeholder="끝 페이지"
            value={toPage ?? ''}
            onChange={(e) => setToPage(e.target.value ? parseInt(e.target.value) : null)}
          />
        </div>
        <input
          type="date"
          className="w-full p-2 border border-gray-300 rounded dark:bg-gray-800 dark:text-white opacity-60 cursor-not-allowed"
          value={date}
          disabled
          aria-disabled="true"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            저장하기
          </button>
        </div>
      </form>
    </div>
  );
}
