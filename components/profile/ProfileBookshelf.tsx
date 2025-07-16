'use client';

import Image from 'next/image';
import Link from 'next/link';

import { UserBookWithCover } from '@/types/book';

interface ProfileBookshelfProps {
  userBooks: UserBookWithCover[];
}

export default function ProfileBookshelf({ userBooks }: ProfileBookshelfProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-300 dark:border-gray-700">
      <h2 className="text-lg font-semibold mb-3">📚 책장</h2>
      <div className="flex overflow-x-auto space-x-3">
        {userBooks.map((userBook) => (
          <Link key={userBook.id} href={`/protected/books/${userBook.book_id}`} passHref>
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
    </div>
  );
}
