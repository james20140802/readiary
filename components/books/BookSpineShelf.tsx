import Link from 'next/link';
import { SHELF_SLOT_HEIGHT, spineHeight, spineWidth } from '@/lib/books/spine';

export interface ShelfBook {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  totalPages: number | null;
  lastReadPage: number | null;
  isFinished: boolean;
  href: string;
  /** 내 책에만 제공하는 기록 작성 주소 */
  entryHref?: string;
  /** '2026. 6. 3. — 8. 12.' — 기록이 없으면 null */
  readingPeriod: string | null;
  /** 통계를 모르면 null — 0(기록 없음)과 구분한다 */
  entryCount: number | null;
}

interface Props {
  books: ShelfBook[];
  className?: string;
}

const BOARD = 4; // 선반 판 두께
const ROW_GAP = 28; // 선반 사이 공간

/**
 * 세로쓰기 책등에서 숫자는 눕지 않게 — 네 자리까지는 한 칸에 모아 세우고(縦中横),
 * 그보다 길면 한 자씩 세운다. 그 외 글자는 세로쓰기 기본대로.
 */
export function SpineTitle({ title }: { title: string }) {
  const parts = title.split(/(\d+)/);
  return (
    <>
      {parts.map((part, i) =>
        /^\d+$/.test(part) ? (
          <span
            key={i}
            style={
              part.length <= 4 ? { textCombineUpright: 'all' } : { textOrientation: 'upright' }
            }
          >
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

/**
 * 책등 책장 — 시안 04. 세로쓰기 제목의 책등이 선반 위에 나란히 서 있다.
 * 두께는 총 쪽수 비례, 완독한 책등은 한 단계 눌린 종이색에 잉크 점 하나.
 * 진행률 게이지 없이도 책장이 성취를 말해준다.
 *
 * 줄바꿈은 flex-wrap에 맡기고, 선반 판은 컨테이너 배경의 반복 그라데이션으로
 * 한 줄마다 한 번씩 긋는다 — 줄 사이 간격(rowGap)에 판 두께를 포함해야
 * 그라데이션 주기와 flex 줄 주기가 맞아 둘째 줄부터도 판이 보인다.
 */
export default function BookSpineShelf({ books, className }: Props) {
  const pitch = SHELF_SLOT_HEIGHT + BOARD + ROW_GAP;

  return (
    <ul
      className={`flex flex-wrap items-end px-3 ${className ?? ''}`}
      style={{
        columnGap: 5,
        rowGap: ROW_GAP + BOARD,
        paddingBottom: BOARD,
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${SHELF_SLOT_HEIGHT}px, rgb(var(--hairline-strong)) ${SHELF_SLOT_HEIGHT}px ${SHELF_SLOT_HEIGHT + BOARD}px, transparent ${SHELF_SLOT_HEIGHT + BOARD}px ${pitch}px)`,
      }}
    >
      {books.map((book) => (
        <SpineItem key={book.id} book={book} />
      ))}
    </ul>
  );
}

/** 책등 하나 — 누르면 그 책으로 간다 */
function SpineItem({ book }: { book: ShelfBook }) {
  const width = spineWidth(book.totalPages);
  const height = spineHeight(book.title);
  const spineClass = `group flex h-full w-full flex-col items-center rounded-t-[3px] border border-hairline-strong pt-4 pb-3 transition-transform hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:border-accent focus-visible:outline-none ${
    book.isFinished ? 'bg-card-raised' : 'bg-card'
  }`;
  const label = book.isFinished ? `${book.title} (완독)` : book.title;

  return (
    <li className="flex items-end" style={{ height: SHELF_SLOT_HEIGHT, width }}>
      <div className="flex items-end" style={{ height, width }}>
        <Link href={book.href} title={book.title} aria-label={label} className={spineClass}>
          <span
            data-skeleton
            className="min-h-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-serif text-[12px] tracking-[0.06em] text-ink"
            style={{ writingMode: 'vertical-rl' }}
          >
            <SpineTitle title={book.title} />
          </span>
          {book.isFinished && (
            <span aria-hidden className="mt-1.5 h-[5px] w-[5px] shrink-0 rounded-full bg-accent" />
          )}
        </Link>
      </div>
    </li>
  );
}
