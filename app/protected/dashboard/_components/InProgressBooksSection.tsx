'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MyBook } from '@/types/book';
import Card from '@/components/ui/Card';

interface Props {
  myBooks: MyBook[];
}

interface BookItem {
  title: string;
  author: string | null;
  cover_url: string | null;
  progress: number;
  book_id: string;
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-caption text-label-muted">진행률</span>
        <span className="text-caption font-bold text-tint">{progress}%</span>
      </div>
      <div className="w-full bg-border dark:bg-dark-border rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-tint h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// 1권: 가로 와이드 카드
function SingleBookCard({ book }: { book: BookItem }) {
  return (
    <Link href={`/protected/books/${book.book_id}`}>
      <Card hoverable className="flex gap-4 items-center p-4">
        <div className="relative w-[72px] h-[100px] shrink-0 rounded-lg overflow-hidden shadow-card-md">
          <Image
            src={book.cover_url ?? '/images/default-book-cover.png'}
            alt={book.title}
            fill
            className="object-cover"
            sizes="72px"
          />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between h-[100px] py-1">
          <div>
            <h3 className="text-body font-semibold text-label dark:text-label-invert line-clamp-2 leading-snug">
              {book.title}
            </h3>
            {book.author && (
              <p className="text-body-sm text-label-muted mt-0.5 line-clamp-1">{book.author}</p>
            )}
          </div>
          <ProgressBar progress={book.progress} />
        </div>
      </Card>
    </Link>
  );
}

// 2권+: 가로 컴팩트 카드 (모바일 친화)
function MultiBookCard({ book }: { book: BookItem }) {
  return (
    <Link href={`/protected/books/${book.book_id}`}>
      <Card hoverable className="flex gap-3 items-center p-3 h-full">
        <div className="relative w-12 h-[68px] shrink-0 rounded-md overflow-hidden shadow-card">
          <Image
            src={book.cover_url ?? '/images/default-book-cover.png'}
            alt={book.title}
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between h-[68px] py-0.5">
          <div>
            <h3 className="text-body-sm font-semibold text-label dark:text-label-invert line-clamp-2 leading-snug">
              {book.title}
            </h3>
            {book.author && (
              <p className="text-caption text-label-muted mt-0.5 line-clamp-1">{book.author}</p>
            )}
          </div>
          <div className="space-y-0.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-label-muted">진행률</span>
              <span className="text-[10px] font-bold text-tint">{book.progress}%</span>
            </div>
            <div className="w-full bg-border dark:bg-dark-border rounded-full h-1 overflow-hidden">
              <div
                className="bg-tint h-full rounded-full transition-all duration-500"
                style={{ width: `${book.progress}%` }}
              />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function InProgressBooksSection({ myBooks }: Props) {
  const books = myBooks.map((b) => ({
    title: b.books.title ?? '(제목 없음)',
    author: b.books.author ?? null,
    cover_url: b.books.cover_url ?? null,
    progress: b.progress ?? 0,
    book_id: b.book_id,
  }));

  if (books.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="text-section-title text-label dark:text-label-invert mb-3">📚 진행 중인 책</h2>

      {books.length === 1 ? (
        // 1권: 와이드 카드
        <SingleBookCard book={books[0]} />
      ) : (
        // 2권+: 1열 컴팩트 카드 (모바일), 2열 그리드 (sm 이상)
        <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
          {books.map((book, idx) => (
            <MultiBookCard key={idx} book={book} />
          ))}
        </div>
      )}
    </section>
  );
}
