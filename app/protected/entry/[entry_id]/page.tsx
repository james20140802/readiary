'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import Image from 'next/image';

export default function EntryDetailPage() {
  const rawEntryId = useParams().entry_id;
  const entryId = Array.isArray(rawEntryId) ? rawEntryId[0] : rawEntryId;
  const supabase = createSupabaseClient();

  const [entry, setEntry] = useState<Database['public']['Tables']['entries']['Row'] | null>(null);
  const [book, setBook] = useState<Database['public']['Tables']['books']['Row'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEntry = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user.id;
      if (!userId || !entryId) return;

      const { data, error } = await supabase
        .from('entries')
        .select(
          `
            id,
            summary,
            from_page,
            to_page,
            date,
            created_at,
            user_book_id,
            user_books (
              book_id,
              books (
                id,
                title,
                author,
                cover_url,
                total_pages,
                isbn
              )
            )
          `
        )
        .eq('id', entryId)
        .single();

      if (!error && data) {
        setEntry({
          id: data.id,
          summary: data.summary,
          from_page: data.from_page,
          to_page: data.to_page,
          date: data.date,
          created_at: data.created_at,
          user_book_id: data.user_book_id,
        });
        setBook(data.user_books.books);
      }

      setLoading(false);
    };

    fetchEntry();
  }, [entryId, supabase]);

  if (loading) {
    return <p className="p-4 text-gray-600">로딩 중...</p>;
  }

  if (!entry || !book) {
    return <p className="p-4 text-red-500">기록을 찾을 수 없습니다.</p>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* 책 요약 정보 */}
      <div className="flex items-center gap-4">
        <Image
          src={book.cover_url ?? '/images/default-book-cover.png'}
          alt="Book cover"
          width={48}
          height={72}
          className="rounded shadow object-cover"
        />
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{book.title}</h2>
          <p className="text-sm text-gray-500">{book.author}</p>
        </div>
      </div>

      {/* 독서 기록 박스 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">✍️ 오늘의 독서 기록</h1>
        <p className="text-base text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
          {entry.summary}
        </p>
        <hr className="border-t border-gray-200 dark:border-gray-700" />
        <p className="text-sm text-gray-500">
          📅 {new Date(entry.date).toLocaleDateString()} | 📖 {entry.from_page}~{entry.to_page}쪽
        </p>
      </div>
    </div>
  );
}
