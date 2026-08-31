'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MyBook } from '@/types/book';

interface Props {
  myBooks: MyBook[];
}

/**
 * 진행 중인 책 — 시안 어휘의 조용한 리스트.
 * 게이지 대신 세리프 숫자 한 점("책장이 성취를 말해줍니다" — 시안 §책장).
 */
export function InProgressBooksSection({ myBooks }: Props) {
  const books = myBooks.map((b) => ({
    title: b.books.title ?? '(제목 없음)',
    author: b.books.author ?? null,
    cover_url: b.books.cover_url ?? null,
    progress: b.progress,
    last_read_page: b.last_read_page,
    book_id: b.book_id,
  }));

  if (books.length === 0) return null;

  return (
    <section>
      <h2 className="text-section-title text-ink mb-2">진행 중인 책</h2>

      <ul className="divide-y divide-hairline border-y border-hairline">
        {books.map((book) => (
          <li key={book.book_id}>
            <Link
              href={`/protected/books/${book.book_id}`}
              className="group flex items-center gap-4 py-3.5"
            >
              <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-sm border border-hairline">
                <Image
                  src={book.cover_url ?? '/images/default-book-cover.png'}
                  alt={book.title}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-[15px] font-bold text-ink group-hover:text-accent transition-colors">
                  {book.title}
                </p>
                {book.author && (
                  <p className="truncate text-caption text-ink-faint">{book.author}</p>
                )}
              </div>
              <span className="shrink-0 font-serif text-[13px] text-ink-faint">
                {book.progress != null
                  ? `${book.progress}%`
                  : book.last_read_page != null
                    ? `${book.last_read_page}쪽`
                    : ''}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
