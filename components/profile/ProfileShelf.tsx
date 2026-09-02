'use client';

import Link from 'next/link';
import BookSpineShelf, { type ShelfBook } from '@/components/books/BookSpineShelf';
import OpenBook from '@/components/books/OpenBook';
import { useOpenBook } from '@/components/books/useOpenBook';

/** 프로필에 꽂는 최대 권수 — 그 이상은 "책장 전체 →" */
export const PROFILE_SHELF_LIMIT = 12;

interface Props {
  books: ShelfBook[];
  /** 책장에 다 꽂지 못한 책까지 센 전체 권수 */
  total: number;
  /** "책장 전체 →"가 가리키는 곳 */
  shelfHref: string;
  isOwnProfile: boolean;
}

/**
 * 프로필의 책장 — 책 목록과 같은 책등 책장에, 꺼내 펼치기까지 그대로.
 * 표지에 이어 이 사람이 무엇을 읽어 왔는지 한눈에 보이는 자리라 최근 몇 권만 꽂는다.
 */
export default function ProfileShelf({ books, total, shelfHref, isOwnProfile }: Props) {
  const { openBook, slotOpen, hiddenId, handleOpen, closeBook, handleReturn, handleClosed } =
    useOpenBook();

  return (
    <section className="mt-12">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="font-serif text-[17px] font-bold text-ink">
          책장
          {total > 0 && (
            <span className="ml-2 font-sans text-[12.5px] font-normal tabular-nums text-ink-faint">
              {total}권
            </span>
          )}
        </h2>
        {total > books.length && (
          <Link
            href={shelfHref}
            className="text-[13px] text-ink-faint transition-colors hover:text-accent"
          >
            책장 전체 →
          </Link>
        )}
      </div>

      {books.length === 0 ? (
        <div className="border-b-4 border-hairline-strong px-3 pb-6 pt-14 text-center">
          <p className="font-serif text-[15px] text-ink-sub">아직 빈 책장입니다.</p>
          {isOwnProfile && (
            <Link
              href="/protected/books/new"
              className="mt-2 inline-block font-serif text-[13.5px] text-accent hover:underline"
            >
              첫 책 꽂기 →
            </Link>
          )}
        </div>
      ) : (
        <>
          <OpenBook
            book={openBook}
            slotOpen={slotOpen}
            onClose={closeBook}
            onReturn={handleReturn}
            onClosed={handleClosed}
          />
          <BookSpineShelf books={books} onOpen={handleOpen} hiddenId={hiddenId} />
        </>
      )}
    </section>
  );
}
