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
  // 최신순으로 최대 8권까지만 노출 (필요에 따라 조절)
  const displayedBooks = userBooks.slice(0, 8);
  const hasMore = userBooks.length > 8;

  return (
    <section className="mt-10 px-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{`📚 ${isOwnProfile ? '나' : profile?.name + '님'}의 책장`}</h2>
          <span className="text-[11px] font-bold px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full">
            {userBooks.length}
          </span>
        </div>

        {/* 책이 많을 때만 전체보기 버튼 노출 */}
        {hasMore && (
          <Link
            href={`${baseLink ?? '/protected/books'}`}
            className="flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-tint transition-colors"
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
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 group-hover:shadow-xl group-hover:-translate-y-1.5 transition-all duration-300">
              <Image
                src={ub.books?.cover_url || '/images/default-book-cover.png'}
                alt={ub.books.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 25vw"
              />

              {/* 완독 배지 스타일 개선 */}
              {ub.is_finished && (
                <div className="absolute top-2 right-2 bg-tint/90 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-lg shadow-lg">
                  <span className="text-[10px] font-black tracking-tighter">DONE</span>
                </div>
              )}
            </div>
            {/* 책 제목이 너무 길면 잘리도록 추가 (선택 사항) */}
            <p className="mt-2 text-[11px] font-medium text-zinc-500 truncate px-1 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
              {ub.books.title}
            </p>
          </Link>
        ))}
      </div>

      {/* 책이 아예 없을 때의 대응 */}
      {userBooks.length === 0 && (
        <div className="py-12 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl text-center">
          <p className="text-sm text-zinc-400">아직 서재에 담긴 책이 없어요.</p>
        </div>
      )}
    </section>
  );
}
