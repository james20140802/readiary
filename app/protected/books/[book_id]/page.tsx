'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import Image from 'next/image';
import EntryCard from '@/components/EntryCard';

export default function BookDetailPage() {
  const rawBookId = useParams().book_id;
  const bookId = Array.isArray(rawBookId) ? rawBookId[0] : rawBookId;
  const supabase = createSupabaseClient();
  const router = useRouter();

  const [data, setData] = useState<{
    book: Database['public']['Tables']['books']['Row'] | null;
    userBook: Database['public']['Tables']['user_books']['Row'] | null;
    entries: Database['public']['Tables']['entries']['Row'][] | null;
  }>({ book: null, userBook: null, entries: null });

  const [loading, setLoading] = useState(true);

  const handleMarkAsFinished = async () => {
    if (!data.userBook) return;

    const { error } = await supabase
      .from('user_books')
      .update({ is_finished: true })
      .eq('id', data.userBook.id);

    if (!error) {
      setData((prev) =>
        prev
          ? {
              ...prev,
              userBook: {
                ...prev.userBook!,
                is_finished: true,
              },
            }
          : prev
      );
      router.refresh(); // 페이지 새로고침
    }
  };

  useEffect(() => {
    const fetchDetail = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user.id;
      if (!userId || !bookId) return;

      const { data, error } = await supabase
        .from('user_books')
        .select(
          `
            id, progress, started_at, last_read_page, is_finished,
            book:books (
              id,
              title,
              author,
              cover_url,
              isbn,
              total_pages
            ),
            entries:entries (
              id,
              summary,
              from_page,
              to_page,
              date,
              created_at,
              user_book_id
            )
          `
        )
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .single();

      if (!error && data) {
        setData({
          book: data.book,
          userBook: {
            id: data.id,
            progress: data.progress,
            started_at: data.started_at,
            last_read_page: data.last_read_page,
            is_finished: data.is_finished,
            book_id: bookId as string,
            user_id: userId,
            created_at: null,
          },
          entries: data.entries ?? [],
        });
      }

      setLoading(false);
    };

    fetchDetail();
  }, [bookId, supabase]);

  if (loading) {
    return <p className="p-4 text-gray-600">Loading...</p>;
  }

  if (!data.book) {
    return <p className="p-4 text-red-500">Book not found or not registered.</p>;
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* 책 정보 카드 */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:gap-6">
        <div className="flex-shrink-0 self-center sm:self-start">
          <Image
            src={data.book.cover_url ?? '/images/default-book-cover.png'}
            alt="Book cover"
            width={128}
            height={192}
            className="rounded shadow object-cover w-full sm:w-auto"
          />
        </div>
        <div className="flex-1 space-y-2">
          <h1 className="text-3xl font-bold">{data.book.title}</h1>
          <p className="text-sm text-gray-500">{data.book.author}</p>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-2">
            <div
              className="bg-green-500 h-2 rounded"
              style={{
                width: `${data.userBook?.progress ?? 0}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>
              {data.userBook?.last_read_page ?? 0} / {data.book.total_pages} 페이지
            </span>
            <span>{data.userBook?.progress ?? 0}%</span>
          </div>
          {data.userBook && !data.userBook.is_finished && (data.userBook.progress ?? 0) >= 90 && (
            <button
              onClick={handleMarkAsFinished}
              className="bg-emerald-500 text-white px-4 py-2 rounded hover:bg-emerald-600 text-sm mt-2"
            >
              📘 책 읽기 완료!
            </button>
          )}
        </div>
      </div>

      {/* 기록 섹션 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">📓 독서 기록</h2>
        <a
          href={`/protected/books/${bookId}/entry/new`}
          className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
        >
          ➕ 기록 추가하기
        </a>
      </div>

      {/* 기록 목록 */}
      {data.entries && data.entries.length > 0 ? (
        <ul className="space-y-4">
          {data.entries.map((entry) => (
            <li key={entry.id}>
              <EntryCard id={entry.id} summary={entry.summary ?? ''} date={entry.date} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">아직 작성된 기록이 없습니다.</p>
      )}
    </div>
  );
}
