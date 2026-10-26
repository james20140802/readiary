'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { MyBook } from '@/types/book';
import type { BookReadingStat } from '@/lib/queries/fetchBookReadingStats';
import Bookshelf, { type ShelfSpine } from './Bookshelf';
import BookCover from './BookCover';
import styles from './books.module.css';
import { arrangeShelf, type ShelfFilter, type ShelfOrder } from './shelfSort';

interface Props {
  books: MyBook[];
  /** user_book id → 읽기 통계. 없거나 null이면(친구 책장·조회 실패) 문장 수·최근 읽은 날을 모른다 */
  stats?: Record<string, BookReadingStat> | null;
  isFriend?: boolean;
  nicknameAndTag?: string;
  /** 머리줄 크기 — 데스크톱 책장 장은 큰 제목과 칩을 한 줄에 둔다 */
  size?: 'mobile' | 'desktop';
  /** 모두 보기로 펼치거나 접을 때 — 장 높이를 내용에 맞출지 정하는 쪽에 알린다 */
  onExpandedChange?: (expanded: boolean) => void;
}

type View = 'spine' | 'list';

/** 목록으로 볼 때 접어 두는 권수 */
const LIST_PREVIEW = 5;

/** 목록 줄의 짧은 진행 — 시안 '에리히 프롬 · 184 / 352', '다 읽음 · 문장 14' */
function listMeta(b: MyBook, stat: BookReadingStat | undefined): string {
  if (b.is_finished) return stat ? `다 읽음 · 문장 ${stat.entryCount}` : '다 읽음';
  const total = b.books.total_pages;
  const progress =
    total != null && total > 0
      ? `${b.last_read_page ?? 0} / ${total}`
      : b.last_read_page != null
        ? `${b.last_read_page}쪽`
        : '읽는 중';
  return [b.books.author, progress].filter(Boolean).join(' · ');
}

/**
 * 서가 — 시안 books.html의 "서가" 장. 순서·거르기 칩, 책등/목록 전환, 선반 세 칸까지 보이고 "모두 보기".
 * 내 책장과 친구 책장이 함께 쓴다(친구 책장은 통계가 없어 '문장 많은 순'을 감춘다).
 */
export default function BookList({
  books,
  stats,
  isFriend = false,
  nicknameAndTag = '',
  size = 'mobile',
  onExpandedChange,
}: Props) {
  const [view, setView] = useState<View>('spine');
  const [order, setOrder] = useState<ShelfOrder>('recent');
  const [filter, setFilter] = useState<ShelfFilter>('all');
  const [expanded, setExpandedState] = useState(false);
  const setExpanded = (v: boolean) => {
    setExpandedState(v);
    onExpandedChange?.(v);
  };
  const [overflows, setOverflows] = useState(false);
  const shelfRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const hrefFor = (b: MyBook) =>
    isFriend && nicknameAndTag !== ''
      ? `/social/u/${nicknameAndTag}/books/${b.book_id}`
      : `/books/${b.book_id}`;

  const arranged = useMemo(
    () => arrangeShelf(books, order, filter, stats),
    [books, order, filter, stats]
  );

  const spines: ShelfSpine[] = arranged.map((b) => ({
    id: b.id,
    title: b.books.title ?? '(제목 없음)',
    coverUrl: b.books.cover_url ?? null,
    totalPages: b.books.total_pages,
    isFinished: !!b.is_finished,
    href: hrefFor(b),
  }));

  // 선반이 세 칸을 넘는지 — 넘을 때만 "모두 보기"를 둔다
  useEffect(() => {
    const el = shelfRef.current;
    if (!el || view !== 'spine' || expanded) return;
    const check = () => {
      setOverflows(el.scrollHeight > el.clientHeight + 1);
      // 접힌 선반 아래로 가려진 책등은 키보드 초점도 받지 않는다
      const top = el.getBoundingClientRect().top;
      for (const li of Array.from(el.children) as HTMLElement[]) {
        li.inert = li.getBoundingClientRect().top - top >= el.clientHeight;
      }
    };
    check();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      ro.disconnect();
      for (const li of Array.from(el.children) as HTMLElement[]) li.inert = false;
    };
  }, [view, expanded, spines.length, order, filter]);

  const orders: { value: ShelfOrder; label: string }[] = [
    { value: 'recent', label: '최근 읽은 순' },
    { value: 'title', label: '제목순' },
    ...(stats ? [{ value: 'entries' as const, label: '문장 많은 순' }] : []),
  ];
  const filters: { value: ShelfFilter; label: string }[] = [
    { value: 'reading', label: '읽는 중만' },
    { value: 'finished', label: '다 읽은 책만' },
  ];

  const desktop = size === 'desktop';
  const canExpand = view === 'spine' ? overflows || expanded : arranged.length > LIST_PREVIEW;
  const listItems = view === 'list' && !expanded ? arranged.slice(0, LIST_PREVIEW) : arranged;

  const viewSwitch = (
    <div
      role="group"
      aria-label="보기"
      className={clsx(styles.seg, 'shrink-0')}
      style={{ width: desktop ? 150 : 140 }}
    >
      {(
        [
          ['spine', '책등'],
          ['list', '목록'],
        ] as const
      ).map(([v, label]) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          onClick={() => {
            setView(v);
            setExpanded(false);
          }}
          className={styles.segItem}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const chips = (
    <div
      role="group"
      aria-label="정리"
      className={clsx(
        styles.chips,
        desktop
          ? 'order-last basis-full xl:order-none xl:ml-auto xl:basis-auto'
          : '-mx-6 mb-[18px] mt-3.5 px-6'
      )}
    >
      {orders.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={order === o.value}
          onClick={() => setOrder(o.value)}
          className={styles.chip}
        >
          {o.label}
        </button>
      ))}
      {filters.map((f) => (
        <button
          key={f.value}
          type="button"
          aria-pressed={filter === f.value}
          onClick={() => setFilter((cur) => (cur === f.value ? 'all' : f.value))}
          className={styles.chip}
        >
          {f.label}
        </button>
      ))}
    </div>
  );

  if (books.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="font-serif text-note text-ink-sub">
          {isFriend ? '아직 꽂힌 책이 없어요.' : '아직 빈 서가예요.'}
        </p>
        {!isFriend && (
          <Link
            href="/books/new"
            className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-sans text-[17px] font-semibold text-ink"
          >
            첫 책 꽂기 <ArrowRight size={18} strokeWidth={1.75} aria-hidden />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div>
      {desktop ? (
        <div className="mb-[22px] flex flex-wrap items-baseline gap-x-3.5 gap-y-3 pr-[330px]">
          <h2 className="shrink-0 font-serif text-[32px] font-bold leading-[1.3] tracking-[-0.01em] text-ink">
            서가
          </h2>
          <span className="shrink-0 font-sans text-caption text-ink-sub">
            <span data-skeleton>{books.length}</span>권
          </span>
          {chips}
          <div className="ml-auto xl:ml-0">{viewSwitch}</div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-section-title text-ink">서가</h2>
            {viewSwitch}
          </div>
          {chips}
        </>
      )}

      {arranged.length === 0 ? (
        <p className="py-10 text-center font-serif text-note text-ink-sub">
          {filter === 'finished' ? '아직 다 읽은 책이 없어요.' : '지금 읽는 책이 없어요.'}
        </p>
      ) : view === 'spine' ? (
        <Bookshelf ref={shelfRef} id={listId} books={spines} collapsed={!expanded} />
      ) : (
        <ul id={listId} aria-label="서가 목록">
          {listItems.map((b) => (
            <li key={b.id}>
              <Link
                href={hrefFor(b)}
                className="grid grid-cols-[44px_1fr] items-center gap-x-3.5 gap-y-0.5 border-t border-hairline py-2.5"
              >
                <BookCover
                  title={b.books.title ?? ''}
                  coverUrl={b.books.cover_url}
                  shadow="sm"
                  sizes="44px"
                  titleSize={8}
                  className="row-span-2 w-11"
                />
                <b data-skeleton className="self-end font-serif text-[17px] font-semibold text-ink">
                  {b.books.title}
                </b>
                <span
                  data-skeleton
                  className="self-start font-sans text-[14px] font-medium text-ink-sub"
                >
                  {listMeta(b, stats?.[b.id])}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {canExpand && arranged.length > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded(!expanded)}
          className="mt-2.5 inline-flex min-h-11 items-center gap-1.5 font-sans text-[17px] font-semibold text-ink"
        >
          {expanded ? (
            '접기'
          ) : (
            <>
              <span data-skeleton>{arranged.length}</span>권 모두 보기
            </>
          )}
          {!expanded && <ArrowRight size={18} strokeWidth={1.75} aria-hidden />}
        </button>
      )}
    </div>
  );
}
