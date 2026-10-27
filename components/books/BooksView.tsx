'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import clsx from 'clsx';
import type { MyBook } from '@/types/book';
import type { BookReadingStat } from '@/lib/queries/fetchBookReadingStats';
import { TopBarActions, useTopBar } from '@/components/shell/TopBarContext';
import { DesktopLeaf, DesktopLeaves, Leaf, LeafSwitch, Leaves } from '@/components/shell/Leaves';
import BookList from './BookList';
import BookCover from './BookCover';
import styles from './books.module.css';
import { splitShelf } from './shelfSort';
import { BTN_INK, BTN_LINE, BTN_SM as SM } from './buttonStyles';
import { lastRecordedLabel, monthDay } from './bookFormat';

interface Props {
  books: MyBook[];
  stats: Record<string, BookReadingStat> | null;
  /** 'YYYY-MM-DD' 사용자 시간대의 오늘 — '오늘 남김' 같은 표기에 쓴다 */
  today: string;
}

const ICON = 'grid h-11 w-11 place-items-center rounded-full text-ink';
const titleOf = (b: MyBook) => b.books.title ?? '(제목 없음)';

/** 잉크 분수 — '184 / 352'. 전체 쪽수를 모르면 읽은 쪽만, 그것도 없으면 null */
function Frac({ b, className }: { b: MyBook; className?: string }) {
  const total = b.books.total_pages;
  if (total != null && total > 0)
    return (
      <div className={clsx(styles.frac, className)}>
        <span data-skeleton>{b.last_read_page ?? 0}</span>{' '}
        <span>
          / <span data-skeleton>{total}</span>
        </span>
      </div>
    );
  if (b.last_read_page != null)
    return (
      <div className={clsx(styles.frac, className)}>
        <span data-skeleton>{b.last_read_page}</span>
        <span>쪽</span>
      </div>
    );
  return null;
}

/** 읽는 중 책의 아래 한 줄 — 데이터가 있을 때만 그 부분을 자리로 바꾼다 */
function ReadingMeta({ stat, today }: { stat: BookReadingStat | undefined; today: string }) {
  if (!stat || stat.entryCount === 0) return <>아직 남긴 기록이 없어요</>;
  return (
    <span data-skeleton>
      {lastRecordedLabel(stat.lastDate, today)} · 기록 {stat.entryCount}
    </span>
  );
}

function EmptyShelf() {
  return (
    <div className="mt-10">
      <p className="font-serif text-note text-ink-sub">
        아직 빈 책장이에요. 읽고 있는 책을 한 권 꽂으면 그 책에 문장을 남길 수 있어요.
      </p>
      <Link href="/books/new" className={clsx(BTN_INK, 'mt-6')}>
        첫 책 꽂기
      </Link>
    </div>
  );
}

/* ── 읽는 중 ── */

function PulledBook({ b, stat, today }: { b: MyBook; stat?: BookReadingStat; today: string }) {
  return (
    <div className="vellum grid grid-cols-[96px_1fr] gap-[18px] rounded-[3px] px-5 pb-4 pt-5">
      <Link href={`/books/${b.book_id}`} tabIndex={-1} aria-hidden>
        <BookCover title={titleOf(b)} coverUrl={b.books.cover_url} className="w-24" sizes="96px" />
      </Link>
      <div className="min-w-0">
        <div data-skeleton className="font-serif text-[21px] font-semibold leading-snug text-ink">
          {titleOf(b)}
        </div>
        {b.books.author && (
          <div data-skeleton className="mt-0.5 font-sans text-caption text-ink-sub">
            {b.books.author}
          </div>
        )}
        <Frac b={b} className="mt-3 text-[24px]" />
        <div className="mt-1 font-sans text-caption text-ink-sub">
          <ReadingMeta stat={stat} today={today} />
        </div>
      </div>
      <div className="col-span-2 flex gap-2 border-t border-hairline pt-3">
        <Link href={`/books/${b.book_id}/entry/new`} className={clsx(BTN_INK, SM)}>
          이어서 남기기
        </Link>
        <Link href={`/books/${b.book_id}`} className={clsx(BTN_LINE, SM)}>
          책 펼치기
        </Link>
      </div>
    </div>
  );
}

function ReadingLeafBody({
  books,
  reading,
  stats,
  today,
}: {
  books: MyBook[];
  reading: MyBook[];
  stats: Record<string, BookReadingStat> | null;
  today: string;
}) {
  const [first, ...rest] = reading;
  return (
    <>
      <h1 className="font-sans text-page-title text-ink">책장</h1>
      {books.length === 0 ? (
        <EmptyShelf />
      ) : (
        <>
          <div className="mb-5 mt-1.5 font-sans text-caption text-ink-sub">
            읽는 중 <span data-skeleton>{reading.length}</span>권 · 서가에{' '}
            <span data-skeleton>{books.length}</span>권
          </div>
          {first ? (
            <>
              <PulledBook b={first} stat={stats?.[first.id]} today={today} />
              {rest.length > 0 && (
                <div className="mt-[22px] flex items-end gap-3">
                  {rest.slice(0, 3).map((b) => (
                    <Link key={b.id} href={`/books/${b.book_id}`} aria-label={titleOf(b)}>
                      <BookCover
                        title={titleOf(b)}
                        coverUrl={b.books.cover_url}
                        className="w-[62px]"
                        shadow="sm"
                        sizes="62px"
                        titleSize={9}
                      />
                    </Link>
                  ))}
                  <span className="ml-1.5 font-sans text-caption text-ink-sub">
                    함께 읽는 중 <span data-skeleton>{rest.length}</span>권
                  </span>
                </div>
              )}
            </>
          ) : (
            <div>
              <p className="font-serif text-note text-ink-sub">
                지금 읽는 책이 없어요. 다음 책을 꽂아 볼까요?
              </p>
              <Link href="/books/new" className={clsx(BTN_INK, 'mt-5')}>
                책 등록
              </Link>
            </div>
          )}
        </>
      )}
    </>
  );
}

/* ── 다 읽은 책 ── */

function FinishedRows({
  finished,
  stats,
}: {
  finished: MyBook[];
  stats: Record<string, BookReadingStat> | null;
}) {
  return (
    <>
      <h2 className="font-serif text-section-title text-ink">다 읽은 책</h2>
      {finished.length === 0 ? (
        <p className="mt-3 font-serif text-note text-ink-sub">
          아직 다 읽은 책이 없어요. 다 읽었다고 하면 남긴 문장이 한 권의 발췌집으로 묶여요.
        </p>
      ) : (
        <>
          <div className="mb-3.5 mt-1.5 font-sans text-caption text-ink-sub">
            발췌집이 <span data-skeleton>{finished.length}</span>권 쌓였어요
          </div>
          <ul>
            {finished.map((b) => {
              const stat = stats?.[b.id];
              return (
                <li
                  key={b.id}
                  className="grid grid-cols-[52px_1fr_auto] items-center gap-3.5 border-t border-hairline py-3"
                >
                  <BookCover
                    title={titleOf(b)}
                    coverUrl={b.books.cover_url}
                    className="w-[52px]"
                    shadow="sm"
                    sizes="52px"
                    titleSize={8}
                  />
                  <Link href={`/books/${b.book_id}`} className="min-w-0">
                    <div
                      data-skeleton
                      className="font-serif text-[18px] font-semibold leading-snug text-ink"
                    >
                      {titleOf(b)}
                    </div>
                    <div className="font-sans text-caption text-ink-sub">
                      {stat ? (
                        <span data-skeleton>
                          {monthDay(stat.lastDate)} · 기록 {stat.entryCount}
                        </span>
                      ) : (
                        '다 읽음'
                      )}
                    </div>
                  </Link>
                  <Link
                    href={`/books/${b.book_id}/excerpts`}
                    aria-label={`${titleOf(b)} 발췌집`}
                    className="inline-flex min-h-11 items-center font-sans text-[15px] font-semibold text-accent"
                  >
                    발췌집
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}

/* ── 데스크톱 읽는 중: 받침 위 표지, 고른 책의 간지 ── */

function DesktopReading({
  books,
  reading,
  stats,
  today,
}: {
  books: MyBook[];
  reading: MyBook[];
  stats: Record<string, BookReadingStat> | null;
  today: string;
}) {
  const [pickedId, setPickedId] = useState<string | null>(reading[0]?.id ?? null);
  const picked = reading.find((b) => b.id === pickedId) ?? reading[0];
  const stat = picked ? stats?.[picked.id] : undefined;
  const shown = reading.slice(0, 6);
  const pickedIndex = picked
    ? Math.max(
        0,
        shown.findIndex((b) => b.id === picked.id)
      )
    : 0;
  // 고른 책의 칸 가운데 아래로 간지가 옮겨 간다 — 양 끝에서는 선반 폭 안에 머문다
  const center = (pickedIndex + 0.5) / Math.max(1, shown.length);
  return (
    <>
      <h1 className="font-sans text-page-title-lg text-ink">책장</h1>
      {books.length === 0 ? (
        <EmptyShelf />
      ) : !picked ? (
        <div className="mt-6">
          <p className="font-serif text-note text-ink-sub">
            지금 읽는 책이 없어요. 다음 책을 꽂아 볼까요?
          </p>
          <Link href="/books/new" className={clsx(BTN_INK, 'mt-5')}>
            책 등록
          </Link>
        </div>
      ) : (
        <>
          <div
            className={clsx(styles.ledge, 'mt-[22px]')}
            style={{
              gridTemplateColumns: `repeat(${Math.min(reading.length, 6)}, minmax(0, 1fr))`,
            }}
            role="group"
            aria-label="읽는 중인 책"
          >
            {shown.map((b) => (
              <button
                key={b.id}
                type="button"
                aria-pressed={b.id === picked.id}
                aria-label={titleOf(b)}
                onClick={() => setPickedId(b.id)}
                className={styles.ledgeItem}
              >
                <BookCover
                  title={titleOf(b)}
                  coverUrl={b.books.cover_url}
                  shadow="lg"
                  sizes="200px"
                  titleSize={16}
                />
              </button>
            ))}
          </div>
          <div
            className={clsx('mt-[clamp(20px,4vh,40px)]', styles.pulled)}
            style={{
              marginLeft: `clamp(0px, calc(${center} * 100% - min(280px, 50%)), calc(100% - min(560px, 100%)))`,
            }}
          >
            <div className="vellum -rotate-[0.5deg] rounded-[3px] px-[30px] py-[26px]">
              <div
                data-skeleton
                className="font-serif text-[30px] font-bold leading-[1.3] tracking-[-0.01em] text-ink"
              >
                {titleOf(picked)}
              </div>
              {picked.books.author && (
                <div data-skeleton className="mt-1 font-sans text-[16px] font-medium text-ink-sub">
                  {picked.books.author}
                </div>
              )}
              <Frac b={picked} className="mt-[18px] text-[32px]" />
              <div className="mt-1.5 font-sans text-caption text-ink-sub">
                {stat && stat.entryCount > 0 ? (
                  <span data-skeleton>
                    {monthDay(stat.firstDate)}부터 · 기록 {stat.entryCount}
                  </span>
                ) : (
                  '아직 남긴 기록이 없어요'
                )}
              </div>
              <div className="mt-[22px] flex gap-2.5">
                <Link href={`/books/${picked.book_id}/entry/new`} className={BTN_INK}>
                  이어서 남기기
                </Link>
                <Link href={`/books/${picked.book_id}`} className={BTN_LINE}>
                  책 펼치기
                </Link>
              </div>
            </div>
            <p className="mt-4 font-sans text-caption text-ink-sub">
              <ReadingMeta stat={stat} today={today} />
            </p>
          </div>
        </>
      )}
    </>
  );
}

function DesktopFinished({
  finished,
  stats,
}: {
  finished: MyBook[];
  stats: Record<string, BookReadingStat> | null;
}) {
  return (
    <>
      <div className="flex items-baseline gap-3.5">
        <h2 className="font-serif text-[32px] font-bold leading-[1.3] tracking-[-0.01em] text-ink">
          다 읽은 책
        </h2>
        {finished.length > 0 && (
          <span className="font-sans text-caption text-ink-sub">
            <span data-skeleton>{finished.length}</span>권 · 발췌집으로 묶였어요
          </span>
        )}
      </div>
      {finished.length === 0 ? (
        <p className="mt-4 max-w-xl font-serif text-note text-ink-sub">
          아직 다 읽은 책이 없어요. 다 읽었다고 하면 남긴 문장이 한 권의 발췌집으로 묶여요.
        </p>
      ) : (
        <ul className="mt-[26px] grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-[26px] gap-y-[30px]">
          {finished.map((b) => {
            const stat = stats?.[b.id];
            return (
              <li key={b.id}>
                <Link href={`/books/${b.book_id}/excerpts`} className="block">
                  <BookCover
                    title={titleOf(b)}
                    coverUrl={b.books.cover_url}
                    className="w-full"
                    shadow="lg"
                    sizes="200px"
                    titleSize={16}
                  />
                  <div
                    data-skeleton
                    className="mt-3 font-serif text-[16px] font-semibold leading-snug text-ink"
                  >
                    {titleOf(b)}
                  </div>
                  <div className="font-sans text-caption text-ink-sub">
                    {stat ? (
                      <span data-skeleton>
                        {monthDay(stat.lastDate)} · 기록 {stat.entryCount}
                      </span>
                    ) : (
                      '다 읽음'
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/**
 * 책장 — 시안 books.html. 모바일은 읽는 중 → 서가 → 다 읽은 책 세 장을 한 장씩 넘기고,
 * 데스크톱은 같은 세 장을 한 화면씩 끊고 오른쪽 위 전환 버튼으로도 옮겨 간다.
 */
export default function BooksView({ books, stats, today }: Props) {
  useTopBar({ title: '책장' });
  const { reading, finished } = splitShelf(books, stats);

  return (
    <>
      <TopBarActions>
        <Link href="/search" aria-label="책과 기록 찾기" className={ICON}>
          <Search size={23} strokeWidth={1.75} aria-hidden />
        </Link>
        <Link href="/books/new" aria-label="책 등록" className={ICON}>
          <Plus size={23} strokeWidth={1.75} aria-hidden />
        </Link>
      </TopBarActions>

      <Leaves>
        <Leaf title="읽는 중" label="책장, 읽는 중">
          <ReadingLeafBody books={books} reading={reading} stats={stats} today={today} />
        </Leaf>
        {books.length > 0 && (
          <>
            <Leaf title="서가" vellum free>
              <BookList books={books} stats={stats} />
            </Leaf>
            <Leaf title="다 읽은 책" vellum free>
              <FinishedRows finished={finished} stats={stats} />
            </Leaf>
          </>
        )}
      </Leaves>

      {books.length > 0 && (
        <LeafSwitch
          label="책장 보기"
          items={[
            { id: 'reading', label: '읽는 중' },
            { id: 'shelf', label: '서가' },
            { id: 'done', label: '다 읽은 책' },
          ]}
        />
      )}
      <DesktopLeaves>
        <DesktopLeaf id="reading">
          <DesktopReading books={books} reading={reading} stats={stats} today={today} />
        </DesktopLeaf>
        {books.length > 0 && (
          <>
            <DesktopLeaf id="shelf">
              <BookList books={books} stats={stats} size="desktop" />
            </DesktopLeaf>
            <DesktopLeaf id="done">
              <DesktopFinished finished={finished} stats={stats} />
            </DesktopLeaf>
          </>
        )}
      </DesktopLeaves>
    </>
  );
}
