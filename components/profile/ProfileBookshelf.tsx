'use client';

import Image from 'next/image';
import Link from 'next/link';

import Card from '@/components/ui/Card';
import { UserBookWithCover } from '@/types/book';

interface ProfileBookshelfProps {
  userBooks: UserBookWithCover[];
  baseLink?: string;
}

export default function ProfileBookshelf({ userBooks, baseLink }: ProfileBookshelfProps) {
  return (
    <section className="my-6">
      <Card hoverable={false}>
        <h2 className="text-lg font-semibold mb-3 text-label dark:text-white">📚 책장</h2>
        <div className="flex overflow-x-auto space-x-3">
          {userBooks.map((userBook) => (
            <Link
              key={userBook.id}
              href={`${baseLink ?? '/protected/books'}/${userBook.book_id}`}
              passHref
            >
              <div
                title={`${userBook.books.title} - ${userBook.books.author}`}
                className="w-20 h-28 bg-gray-200 dark:bg-gray-700 rounded shadow-sm shrink-0 overflow-hidden hover:ring-2 hover:ring-primary transition"
              >
                <Image
                  src={userBook.books?.cover_url || '/images/default-book-cover.png'}
                  alt={userBook.books.title}
                  width={80}
                  height={112}
                  className="w-full h-full object-cover"
                />
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </section>
  );
}
