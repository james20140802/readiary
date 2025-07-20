'use client';
'use client';

import Link from 'next/link';

import { MyBook } from '@/types/book';

interface Props {
  myBooks: MyBook[];
}

export function InProgressBooksSection({ myBooks }: Props) {
  const books = myBooks.map((b) => ({
    title: b.books.title ?? '(제목 없음)',
    author: b.books.author ?? null,
    progress: b.progress ?? 0,
    started_at: b.started_at ?? null,
    book_id: b.book_id,
  }));

  if (books.length === 0) return null;

  return (
    <section className="mb-6 space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">📚 진행 중인 책</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {books.map((book, idx) => (
          <Link key={idx} href={`/protected/books/${book.book_id}`}>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              <h3 className="text-md font-bold text-gray-800 dark:text-white">{book.title}</h3>
              {book.author && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{book.author}</p>
              )}
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                📈 진행률: {book.progress}%
              </p>
              {book.started_at && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  등록일: {new Date(book.started_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
