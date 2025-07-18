'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MyBook } from '@/types/book';

export default function MyBookList() {
  const [books, setBooks] = useState<MyBook[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await fetch('/api/books/list');
        if (!res.ok) throw new Error('책 목록을 불러오는 데 실패했습니다.');
        const data = await res.json();
        setBooks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  if (loading) {
    return <p className="text-gray-500">불러오는 중...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!books || books.length === 0)
    return (
      <div className="text-center text-gray-700 dark:text-gray-300 space-y-2">
        <p>아직 등록한 책이 없습니다.</p>
        <Link href="/protected/books/new" className="text-blue-600 dark:text-blue-400 underline">
          책 등록하러 가기
        </Link>
      </div>
    );
  return (
    <ul className="space-y-4">
      {books.map((userBook) => {
        const book = userBook.books;
        const percent = book?.total_pages ? userBook.progress : 0;

        return (
          <li
            key={userBook.id}
            className="rounded-xl border p-4 bg-white dark:bg-gray-800 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {book?.title}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{book?.author}</p>
                <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">
                  📖 {percent}% 진행 중
                </p>
              </div>
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/protected/books/${userBook.book_id}`}
                  className="text-sm px-3 py-1 h-8 min-w-[80px] bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center"
                >
                  상세 보기
                </Link>
                <Link
                  href={`/protected/books/${userBook.book_id}/entry/new`}
                  className="text-sm px-3 py-1 h-8 min-w-[80px] bg-blue-500 text-white rounded flex items-center justify-center"
                >
                  기록하기
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
