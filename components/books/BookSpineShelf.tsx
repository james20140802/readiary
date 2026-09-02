import Link from 'next/link';
import { SHELF_SLOT_HEIGHT, spineHeight, spineWidth } from '@/lib/books/spine';

export interface ShelfBook {
  id: string;
  title: string;
  totalPages: number | null;
  isFinished: boolean;
  href: string;
}

interface Props {
  books: ShelfBook[];
  className?: string;
}

const BOARD = 4; // 선반 판 두께
const ROW_GAP = 28; // 선반 사이 공간

/**
 * 책등 책장 — 시안 04. 세로쓰기 제목의 책등이 선반 위에 나란히 서 있다.
 * 두께는 총 쪽수 비례, 완독한 책등은 한 단계 눌린 종이색에 잉크 점 하나.
 * 진행률 게이지 없이도 책장이 성취를 말해준다.
 *
 * 줄바꿈은 flex-wrap에 맡기고, 선반 판은 컨테이너 배경의 반복 그라데이션으로
 * 한 줄마다 한 번씩 긋는다 — 모든 칸의 높이가 같아야 선이 맞는다.
 */
export default function BookSpineShelf({ books, className }: Props) {
  const pitch = SHELF_SLOT_HEIGHT + BOARD + ROW_GAP;

  return (
    <ul
      className={`flex flex-wrap items-end px-3 ${className ?? ''}`}
      style={{
        columnGap: 5,
        rowGap: ROW_GAP,
        paddingBottom: BOARD,
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${SHELF_SLOT_HEIGHT}px, rgb(var(--hairline-strong)) ${SHELF_SLOT_HEIGHT}px ${SHELF_SLOT_HEIGHT + BOARD}px, transparent ${SHELF_SLOT_HEIGHT + BOARD}px ${pitch}px)`,
      }}
    >
      {books.map((book) => {
        const width = spineWidth(book.totalPages);
        const height = spineHeight(book.title);
        return (
          <li key={book.id} className="flex items-end" style={{ height: SHELF_SLOT_HEIGHT, width }}>
            <Link
              href={book.href}
              title={book.title}
              aria-label={book.isFinished ? `${book.title} (완독)` : book.title}
              className={`group flex h-full w-full flex-col items-center rounded-t-[3px] border border-b-0 border-hairline-strong pt-4 pb-3 transition-transform hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:border-accent focus-visible:outline-none ${
                book.isFinished ? 'bg-card-raised' : 'bg-card'
              }`}
              style={{ height, width }}
            >
              <span
                className="min-h-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-serif text-[12px] tracking-[0.06em] text-ink"
                style={{ writingMode: 'vertical-rl' }}
              >
                {book.title}
              </span>
              {book.isFinished && (
                <span
                  aria-hidden
                  className="mt-1.5 h-[5px] w-[5px] shrink-0 rounded-full bg-accent"
                />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
