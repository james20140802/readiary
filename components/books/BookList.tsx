'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';
import { MyBook } from '@/types/book';
import type { BookReadingStat } from '@/lib/queries/fetchBookReadingStats';
import BookSpineShelf, { type ShelfBook } from './BookSpineShelf';
import OpenBook from './OpenBook';
import { useOpenBook } from './useOpenBook';
import { toShelfBook } from '@/lib/books/shelfBook';

interface Props {
  books: MyBook[];
  /** user_book id → 읽기 통계. 없거나 null이면(친구 책장·조회 실패) 펼친 책에 기간·문장 수를 비워 둔다 */
  stats?: Record<string, BookReadingStat> | null;
  isFriend?: boolean;
  nicknameAndTag?: string;
}

type ViewMode = 'shelf' | 'list';
type FilterMode = 'all' | 'reading' | 'finished';
type SortMode = 'recent' | 'title';

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'shelf', label: '책장' },
  { value: 'list', label: '목록' },
];

const FILTER_OPTIONS: { value: FilterMode; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'reading', label: '읽는 중' },
  { value: 'finished', label: '완독' },
];

/** 책 상세 헤더와 같은 문법 — 막대 대신 잉크로 쓴 분수 하나 */
function progressLine(b: MyBook): string {
  if (b.is_finished) return '완독';
  const total = b.books.total_pages;
  if (total != null) return `${b.last_read_page ?? 0} / ${total}`;
  if (b.last_read_page != null) return `${b.last_read_page}쪽`;
  return '읽는 중';
}

/** 밑줄 텍스트 토글 — 책 상세의 필터와 같은 문법 */
function TextToggle<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`transition-colors ${
            value === opt.value
              ? 'text-ink underline decoration-accent underline-offset-4'
              : 'text-ink-faint hover:text-ink-sub'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function BookList({ books, stats, isFriend = false, nicknameAndTag = '' }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('shelf');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sort, setSort] = useState<SortMode>('recent');
  const {
    openBook,
    slotOpen,
    hiddenId,
    handleOpen,
    closeBook,
    handleReturn,
    handleClosed,
    resetOpen,
  } = useOpenBook();

  const getDetailHref = useCallback(
    (userBook: MyBook) =>
      isFriend && nicknameAndTag !== ''
        ? `/protected/social/u/${nicknameAndTag}/books/${userBook.book_id}`
        : `/protected/books/${userBook.book_id}`,
    [isFriend, nicknameAndTag]
  );

  const processed = useMemo(() => {
    let list = [...books];
    if (filter === 'reading') list = list.filter((b) => !b.is_finished);
    else if (filter === 'finished') list = list.filter((b) => b.is_finished);
    if (sort === 'title') {
      list.sort((a, b) => (a.books.title ?? '').localeCompare(b.books.title ?? '', 'ko'));
    } else {
      list.sort(
        (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      );
    }
    return list;
  }, [books, filter, sort]);

  // 책장에 넘길 목록은 고정해 둔다 — 꺼내고 덮는 동안 책장이 리렌더되지 않도록(BookSpineShelf memo)
  const shelfBooks = useMemo<ShelfBook[]>(
    () => processed.map((ub) => toShelfBook(ub, stats, getDetailHref(ub))),
    [processed, stats, getDetailHref]
  );

  // 빈 책장 — 선반 한 칸만 비워 두고 한 줄
  if (books.length === 0) {
    return (
      <div className="border-b-4 border-hairline-strong px-3 pb-6 pt-16 text-center">
        <p className="font-serif text-[15px] text-ink-sub">아직 빈 책장입니다.</p>
        {!isFriend && (
          <Link
            href="/protected/books/new"
            className="mt-2 inline-block font-serif text-[13.5px] text-accent hover:underline"
          >
            첫 책 꽂기 →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* 컨트롤 행 — pill·드롭다운 대신 밑줄 텍스트 */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[13.5px]">
        <TextToggle
          label="책 상태"
          options={FILTER_OPTIONS}
          value={filter}
          onChange={(v) => {
            resetOpen();
            setFilter(v);
          }}
        />
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              resetOpen();
              setSort((v) => (v === 'recent' ? 'title' : 'recent'));
            }}
            className="text-ink-faint transition-colors hover:text-ink-sub"
          >
            {sort === 'recent' ? '최근 등록순' : '제목순'} ↕
          </button>
          <span aria-hidden className="h-3.5 w-px bg-hairline" />
          <TextToggle
            label="보기 방식"
            options={VIEW_OPTIONS}
            value={viewMode}
            onChange={(v) => {
              resetOpen();
              setViewMode(v);
            }}
          />
        </div>
      </div>

      {processed.length === 0 ? (
        <p className="py-12 text-center font-serif text-[14px] text-ink-faint">
          {filter === 'finished' ? '아직 완독한 책이 없습니다.' : '읽는 중인 책이 없습니다.'}
        </p>
      ) : viewMode === 'shelf' ? (
        <>
          {/* 꺼낸 책의 자리 — 열리면 책장이 그만큼 내려앉는다 */}
          <OpenBook
            book={openBook}
            slotOpen={slotOpen}
            onClose={closeBook}
            onReturn={handleReturn}
            onClosed={handleClosed}
          />
          <BookSpineShelf books={shelfBooks} onOpen={handleOpen} hiddenId={hiddenId} />
        </>
      ) : (
        /* 목록 — 조용한 리스트. 표지 작게, 서지는 부리 서체, 진행은 잉크 분수 */
        <ul className="divide-y divide-hairline">
          {processed.map((ub) => {
            const book = ub.books;
            const isFinished = ub.is_finished ?? false;
            return (
              <li key={ub.id} className="flex items-center gap-4 py-3.5">
                <Link
                  href={getDetailHref(ub)}
                  className="group flex min-w-0 flex-1 items-center gap-4"
                >
                  <Image
                    src={book.cover_url ?? '/images/default-book-cover.png'}
                    alt=""
                    width={40}
                    height={56}
                    className="h-14 w-10 shrink-0 rounded-sm border border-hairline object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-[15px] leading-snug text-ink group-hover:underline group-hover:decoration-hairline-strong group-hover:underline-offset-4">
                      {book.title}
                    </p>
                    <p className="mt-0.5 truncate text-caption text-ink-faint">{book.author}</p>
                  </div>
                  <span
                    className={`shrink-0 text-[12.5px] tabular-nums ${
                      isFinished ? 'font-serif text-accent' : 'text-ink-faint'
                    }`}
                  >
                    {progressLine(ub)}
                  </span>
                </Link>
                {!isFriend && !isFinished && (
                  <Link
                    href={`/protected/books/${ub.book_id}/entry/new`}
                    className="shrink-0 text-[12.5px] text-ink-faint transition-colors hover:text-accent"
                  >
                    기록 →
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
