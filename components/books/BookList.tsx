'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
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
  /** 머리줄 크기 — 데스크톱 책장 장은 큰 제목을 쓰고 책등/목록 전환을 도구 줄 오른쪽에 둔다 */
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
 * 서가 — 시안 books.html의 "서가" 장. 거르기 탭·순서 메뉴, 책등/목록 전환, 선반 세 칸까지 보이고 "모두 보기".
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
    { value: 'all', label: '전체' },
    { value: 'reading', label: '읽는 중' },
    { value: 'finished', label: '다 읽음' },
  ];
  const orderLabel = orders.find((o) => o.value === order)?.label ?? orders[0].label;

  const desktop = size === 'desktop';
  const canExpand = view === 'spine' ? overflows || expanded : arranged.length > LIST_PREVIEW;
  const listItems = view === 'list' && !expanded ? arranged.slice(0, LIST_PREVIEW) : arranged;

  const viewSwitch = (
    <div
      role="group"
      aria-label="보기"
      className={clsx(styles.seg, 'shrink-0')}
      style={{ width: desktop ? 132 : 128 }}
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

  // 거르기는 탭, 순서는 메뉴 — 같은 줄에 놓아도 둘이 하는 일이 섞이지 않는다
  const toolbar = (
    <div className={clsx(styles.toolbar, desktop ? 'mb-7' : 'mb-6 mt-3')}>
      <div role="group" aria-label="거르기" className={styles.tabs}>
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={styles.tab}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-5">
        <Listbox value={order} onChange={setOrder}>
          <ListboxButton
            className={styles.sortBtn}
            // Headless UI는 닫힌 버튼의 Enter를 폼 제출로 돌린다 — 폼 밖의 이 버튼은 Enter도 Space처럼 연다
            onKeyDownCapture={(e: React.KeyboardEvent<HTMLButtonElement>) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.dispatchEvent(
                new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })
              );
            }}
          >
            <span className="sr-only">순서: </span>
            {orderLabel}
            <ChevronDown size={16} strokeWidth={1.75} aria-hidden />
          </ListboxButton>
          <ListboxOptions
            anchor={{ to: 'bottom end', gap: 4 }}
            transition
            className={styles.sortMenu}
          >
            {orders.map((o) => (
              <ListboxOption key={o.value} value={o.value} className={styles.sortOption}>
                {({ selected }) => (
                  <>
                    {o.label}
                    {selected && <Check size={16} strokeWidth={1.75} aria-hidden />}
                  </>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Listbox>
        {desktop && viewSwitch}
      </div>
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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2
            className={clsx(
              'font-serif text-ink',
              desktop
                ? 'text-[32px] font-bold leading-[1.3] tracking-[-0.01em]'
                : 'text-section-title'
            )}
          >
            서가
          </h2>
          <span className="font-sans text-caption text-ink-sub">
            <span data-skeleton>{books.length}</span>권
          </span>
        </div>
        {!desktop && viewSwitch}
      </div>
      {toolbar}

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
