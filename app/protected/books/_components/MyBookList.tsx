'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MyBook } from '@/types/book';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function MyBookList({ books }: { books: MyBook[] }) {
  if (!books || books.length === 0)
    return (
      <div className="text-center text-secondary space-y-2">
        <p>아직 등록한 책이 없습니다.</p>
        <Link href="/protected/books/new" className="text-tint underline">
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
          <li key={userBook.id}>
            <Card>
              <div className="flex gap-4">
                <Image
                  src={book.cover_url ?? '/images/default-book-cover.png'}
                  alt="책 표지"
                  width={80}
                  height={112}
                  className="rounded-md object-cover w-[80px] h-[112px]"
                />

                <div className="flex-1 flex items-center justify-between">
                  <div className="flex flex-col justify-center">
                    <h2 className="text-base font-semibold text-label dark:text-white">
                      {book?.title}
                    </h2>
                    <p className="text-sm text-secondary">{book?.author}</p>
                    <p className="text-sm mt-2 text-label dark:text-gray-300">
                      📖 {percent}% 진행 중
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-center sm:items-center gap-2 sm:gap-2">
                    <Button size="sm" variant="secondary" asChild>
                      <Link href={`/protected/books/${userBook.book_id}`}>상세 보기</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link href={`/protected/books/${userBook.book_id}/entry/new`}>기록하기</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
