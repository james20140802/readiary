'use client';

import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { MyBook } from '@/types/book';

export default function MyBooksPage() {
  const [books, setBooks] = useState<MyBook[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    const fetchBooks = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user.id;

      if (!userId) return;

      const { data, error } = await supabase
        .from('user_books')
        .select(
          'id, progress, book_id, started_at, last_read_page, is_finished, books(title, author, total_pages)'
        )
        .eq('user_id', userId);

      if (!error && data) {
        setBooks(data);
      }
      setLoading(false);
    };

    fetchBooks();
  }, [supabase]);

  return (
    <div className="h-full flex justify-center">
      <div className="w-full max-w-2xl">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">📚 내 책장</h1>
          <button
            onClick={() => router.push('/protected/books/new')}
            className="bg-black text-white px-4 py-2 rounded-md text-sm shadow hover:bg-gray-800"
          >
            + 책 등록
          </button>
        </header>

        {loading ? (
          <p className="text-center text-gray-600 dark:text-gray-400">책 정보를 불러오는 중...</p>
        ) : books.length === 0 ? (
          <div className="text-center text-gray-700 dark:text-gray-300 space-y-2">
            <p>아직 등록한 책이 없습니다.</p>
            <button
              onClick={() => router.push('/protected/books/new')}
              className="text-blue-600 dark:text-blue-400 underline"
            >
              책 등록하러 가기
            </button>
          </div>
        ) : (
          <ul className="space-y-4">
            {books.map((userBook) => {
              const book = userBook.books;
              const percent = book.total_pages
                ? Math.floor(((userBook.progress || 0) / book.total_pages) * 100)
                : 0;

              return (
                <li
                  key={userBook.id}
                  className="rounded-xl border p-4 bg-white dark:bg-gray-800 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {book.title}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{book.author}</p>
                      <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">
                        📖 {percent}% 진행 중
                      </p>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => router.push(`/protected/books/${userBook.book_id}`)}
                        className="text-sm px-3 py-1 h-8 min-w-[80px] bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center"
                      >
                        상세 보기
                      </button>
                      <button
                        onClick={() =>
                          router.push(`/protected/books/${userBook.book_id}/entry/new`)
                        }
                        className="text-sm px-3 py-1 h-8 min-w-[80px] bg-blue-500 text-white rounded flex items-center justify-center"
                      >
                        기록하기
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
