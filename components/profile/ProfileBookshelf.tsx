'use client';

import Link from 'next/link';
import Image from 'next/image';
import { UserBookWithCover } from '@/types/book';
import { ChevronRight } from 'lucide-react';
import { Profile } from '@/types/profile';

interface ProfileBookshelfProps {
  userBooks: UserBookWithCover[];
  baseLink?: string;
  profile?: Profile;
  isOwnProfile?: boolean;
}

export default function ProfileBookshelf({
  userBooks,
  baseLink,
  profile,
  isOwnProfile = false,
}: ProfileBookshelfProps) {
  const displayedBooks = userBooks.slice(0, 8);
  const hasMore = userBooks.length > 8;

  return (
    <section className="mt-10 px-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-label dark:text-label-invert">
            {`📚 ${isOwnProfile ? '나' : profile?.name + '님'}의 책장`}
          </h2>
          <span className="text-[11px] font-bold px-2 py-0.5 bg-surface-raised dark:bg-dark-raised text-label-muted rounded-full">
            {userBooks.length}
          </span>
        </div>
        {hasMore && (
          <Link
            href={`${baseLink ?? '/protected/books'}`}
            className="flex items-center gap-1 text-xs font-semibold text-label-muted hover:text-tint transition-colors"
          >
            전체보기 <ChevronRight size={14} />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
        {displayedBooks.map((ub) => (
          <Link
            key={ub.id}
            href={`${baseLink ?? '/protected/books'}/${ub.book_id}`}
            className="group block"
          >
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-sm border border-border dark:border-dark-border group-hover:shadow-xl group-hover:-translate-y-1.5 transition-all duration-300">
              <Image
                src={ub.books?.cover_url || '/images/default-book-cover.png'}
                alt={ub.books.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 25vw"
              />
              {ub.is_finished && (
                <div className="absolute top-2 right-2 bg-tint/90 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-lg shadow-lg">
                  <span className="text-[10px] font-black tracking-tighter">DONE</span>
                </div>
              )}
            </div>
            <p className="mt-2 text-[11px] font-medium text-label-muted truncate px-1 group-hover:text-label dark:group-hover:text-label-invert transition-colors">
              {ub.books.title}
            </p>
          </Link>
        ))}
      </div>

      {userBooks.length === 0 && (
        <div className="py-12 border-2 border-dashed border-border dark:border-dark-border rounded-2xl text-center">
          <p className="text-sm text-label-muted">아직 서재에 담긴 책이 없어요.</p>
        </div>
      )}
    </section>
  );
}
