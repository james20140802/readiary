'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
  /** '2026. 6. 3. — 8. 12.' — 기록이 없으면 null */
  readingPeriod: string | null;
  /** 통계를 모르면 null — 0(기록 없음)과 구분한다 */
  entryCount: number | null;
}

interface Props {
  books: ShelfBook[];
  /** 있으면 책등을 누를 때 이동 대신 이 콜백 — 책을 꺼내 펼친다 */
  onOpen?: (book: ShelfBook) => void;
  /** 꺼내져 있는 책 — 그 자리의 책등은 감춘다(framer의 크로스페이드에 맡기지 않는다) */
  hiddenId?: string | null;
  className?: string;
}

const BOARD = 4; // 선반 판 두께
const ROW_GAP = 28; // 선반 사이 공간
const RETURN = 0.45; // 표지 자리에서 책등으로 돌아오는 시간(s)
const REVEAL_DELAY = 500; // 도착하고 글을 다시 띄우기까지(ms)

export const spineLayoutId = (id: string) => `book-spine-${id}`;

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
 *
 * memo — 책이 꺼내져 있는 동안 책장이 리렌더되면 framer가 빈자리의 책등(follower)을
 * 도로 그려 버린다. props를 고정해 두면 꺼내고 덮는 동안 이 트리는 건드리지 않는다.
 */
function BookSpineShelf({ books, onOpen, hiddenId, className }: Props) {
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
        <SpineItem key={book.id} book={book} onOpen={onOpen} hidden={book.id === hiddenId} />
      ))}
    </ul>
  );
}

/**
 * 책등 하나. 꺼내진 동안과 표지 자리에서 되돌아오는 동안은 글을 비운다 —
 * framer가 상자를 스케일하므로 글이 커 보인다. 감추는 건 즉시, 되살리는 건 도착 0.5초 뒤 짧은 페이드.
 * framer의 onLayoutAnimationStart는 첫 프레임 뒤에야 불리므로 시작 콜백에 기대지 않고
 * hidden이 풀리기 전(꺼낼 때)부터 비워 둔다.
 */
function SpineItem({
  book,
  onOpen,
  hidden,
}: {
  book: ShelfBook;
  onOpen?: (book: ShelfBook) => void;
  hidden: boolean;
}) {
  const width = spineWidth(book.totalPages);
  const height = spineHeight(book.title);
  // settled — 글을 보여도 되는 상태. 꺼내지면 false, 돌아와 자리 잡고 REVEAL_DELAY 뒤에 true.
  // 감출 땐 어차피 invisible이므로 effect에서 내려도 늦지 않고, 되돌아올 땐 이미 내려가 있다.
  const [settled, setSettled] = useState(true);
  const timerRef = useRef<number | undefined>(undefined);
  const settleAfter = useCallback((ms: number) => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setSettled(true), ms);
  }, []);
  useEffect(() => {
    if (hidden) {
      const id = window.setTimeout(() => setSettled(false), 0);
      return () => window.clearTimeout(id);
    }
    // 안전망 — layout 애니메이션이 생기지 않는 경로(감축 모션 등)에서도 글이 영영 숨지 않게
    settleAfter(RETURN * 1000 + REVEAL_DELAY + 300);
    return () => window.clearTimeout(timerRef.current);
  }, [hidden, settleAfter]);

  const showText = !hidden && settled;
  const textStyle = {
    opacity: showText ? 1 : 0,
    transition: showText ? 'opacity 150ms ease-out' : 'none',
  } as const;
  // 아래 테두리는 늘 둔다 — 선반 위에서는 판에 묻히고, 꺼내고 되돌아가는 동안엔 책의 밑면이 된다
  const spineClass = `group flex h-full w-full flex-col items-center rounded-t-[3px] border border-hairline-strong pt-4 pb-3 transition-transform hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:border-accent focus-visible:outline-none ${
    book.isFinished ? 'bg-card-raised' : 'bg-card'
  }`;
  const inner = (
    <>
      <span
        className="min-h-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-serif text-[12px] tracking-[0.06em] text-ink"
        style={{ writingMode: 'vertical-rl', ...textStyle }}
      >
        <SpineTitle title={book.title} />
      </span>
      {book.isFinished && (
        <span
          aria-hidden
          className="mt-1.5 h-[5px] w-[5px] shrink-0 rounded-full bg-accent"
          style={textStyle}
        />
      )}
    </>
  );
  const label = book.isFinished ? `${book.title} (완독)` : book.title;

  return (
    <li className="flex items-end" style={{ height: SHELF_SLOT_HEIGHT, width }}>
      {/* layoutId를 펼친 책과 나눠 갖는다 — 꺼내지면 그 자리를 비워 두고,
          덮이면 표지 자리에서 이 transition으로 되돌아온다 */}
      <motion.div
        layoutId={spineLayoutId(book.id)}
        transition={{ layout: { duration: RETURN, ease: [0.22, 1, 0.36, 1] } }}
        onLayoutAnimationComplete={() => settleAfter(REVEAL_DELAY)}
        className={`flex items-end ${hidden ? 'invisible' : ''}`}
        style={{ height, width }}
      >
        {onOpen ? (
          <button
            type="button"
            onClick={() => onOpen(book)}
            title={book.title}
            aria-label={`${label} 꺼내기`}
            aria-expanded={hidden}
            tabIndex={hidden ? -1 : undefined}
            className={spineClass}
          >
            {inner}
          </button>
        ) : (
          <Link href={book.href} title={book.title} aria-label={label} className={spineClass}>
            {inner}
          </Link>
        )}
      </motion.div>
    </li>
  );
}

export default memo(BookSpineShelf);
