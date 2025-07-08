'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { Database } from '@/types/supabase';

export default function BookDetailPage() {
  const rawBookId = useParams().book_id;
  const bookId = Array.isArray(rawBookId) ? rawBookId[0] : rawBookId;
  const supabase = createSupabaseClient();

  const [data, setData] = useState<{
    book: Database['public']['Tables']['books']['Row'] | null;
    userBook: Database['public']['Tables']['user_books']['Row'] | null;
    entries: Database['public']['Tables']['entries']['Row'][] | null;
  }>({ book: null, userBook: null, entries: null });

  const [loading, setLoading] = useState(true);

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
            books (
              id,
              title,
              author,
              cover_url,
              isbn,
              total_pages
            ),
            entries (
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
          book: data.books,
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
    <div className="max-w-2xl mx-auto p-4 text-gray-800 dark:text-white">
      <h1 className="text-2xl font-bold">{data.book.title}</h1>
      <p className="text-sm text-gray-500 mb-2">{data.book.author}</p>

      <p className="mt-2 text-sm">
        Progress: {data.userBook?.progress ?? 0} / {data.book.total_pages} pages
      </p>

      <h2 className="mt-6 font-semibold">📓 Entries</h2>
      {data.entries && data.entries.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {data.entries.map((entry) => (
            <li key={entry.id} className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
              <p className="text-sm">{entry.summary}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(entry.date).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">No entries yet.</p>
      )}
    </div>
  );
}
