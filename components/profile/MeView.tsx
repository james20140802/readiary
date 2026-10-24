'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx';
import { Settings } from 'lucide-react';
import Button from '@/components/ui/Button';
import BookSpineShelf, { type ShelfBook } from '@/components/books/BookSpineShelf';
import { TopBarActions, useTopBar } from '@/components/shell/TopBarContext';
import { DesktopLeaf, DesktopLeaves, Leaf, LeafSwitch, Leaves } from '@/components/shell/Leaves';
import type { FeaturedBookmark, FeaturedQuote, Stats } from '@/types/profile';
import type { FinishedBookExcerpt } from '@/lib/profile/fetchRetrospectData';
import InviteSheet from './InviteSheet';
import { ordinalCount, ordinalVolume, type DiaryShelf, type MonthRow } from './meModel';
import s from './me.module.css';
import { coverTier } from './coverTier';

/** 긴 대표 문장은 작게 — 표지 안에 끝까지 들어가게 */
const COVER_TIER = { lg: undefined, md: s.coverTitleMd, sm: s.coverTitleSm } as const;

export interface MeViewProps {
  name: string;
  /** 닉네임#태그 */
  handle: string;
  inviteSlug: string;
  bio: string | null;
  /** 표지에 들어가는 문장 — 설정에서 고른 대표 문장 */
  coverQuote: FeaturedQuote | null;
  /** 올해 — 표지 아래쪽 */
  year: number;
  /** 판권의 처음 펴낸 날(가입일) */
  publishedDate: string | null;
  /** null이면 숫자를 불러오지 못한 것 */
  stats: Stats | null;
  /** 다 읽고 문장을 옮긴 책 — 최근 완독부터. 앞의 세 권이 '나를 만든 책' */
  finishedBooks: FinishedBookExcerpt[];
  shelfBooks: ShelfBook[];
  shelfTotal: number;
  diary: DiaryShelf;
  months: MonthRow[];
  /** 달 요약을 불러오지 못했다 */
  monthsError: boolean;
  bookmark: FeaturedBookmark | null;
  /** 다 읽은 책이 있어야 책갈피를 꽂을 수 있다 */
  canBookmark: boolean;
  /** 견본에서 화면 주소를 바꿔 끼운다 */
  settingsHref?: string;
}

const MADE_COUNT = 3;
const excerptsHref = (bookId: string) => `/books/${bookId}/excerpts`;
const LABEL = 'font-sans text-[14px] font-semibold text-ink-sub';
const CAP = 'font-sans text-[14px] font-medium leading-normal text-ink-sub';
const H2 = 'font-serif text-section-title text-ink';
const H2_DESK = 'font-serif text-section-title text-ink lg:text-[30px]';
const TEXT_LINK = 'font-sans text-button-sm text-accent underline-offset-4 hover:underline';

function CoverBook({
  name,
  quote,
  year,
  count,
}: {
  name: string;
  quote: FeaturedQuote | null;
  year: number;
  count: number | null;
}) {
  return (
    <div
      className={s.cover}
      role="img"
      aria-label={`${name}의 책 표지${quote ? `: ${quote.quote}` : ''}`}
    >
      <div className={s.coverBy} aria-hidden>
        {name} 지음
      </div>
      <div
        className={clsx(
          s.coverTitle,
          quote && COVER_TIER[coverTier(quote.quote)],
          !quote && s.coverTitleEmpty
        )}
        aria-hidden
      >
        {quote?.quote ?? `${name}의 독서 일기`}
      </div>
      <div className={s.coverFoot} aria-hidden>
        <span>{year}</span>
        {count !== null && <span>기록 {count.toLocaleString('ko-KR')}</span>}
      </div>
    </div>
  );
}

function Who({ name, bio, center }: { name: string; bio: string | null; center?: boolean }) {
  return (
    <div className={center ? 'text-center' : undefined}>
      <h1 className="font-serif text-[28px] font-bold leading-tight text-ink lg:text-[36px]">
        {name}
      </h1>
      {bio && (
        <p className="mt-1.5 whitespace-pre-line font-serif text-[17px] leading-[1.6] text-ink-sub">
          {bio}
        </p>
      )}
    </div>
  );
}

function Colophon({
  name,
  publishedDate,
  stats,
}: {
  name: string;
  publishedDate: string | null;
  stats: Stats | null;
}) {
  const rows: [string, string][] = [['지은이', name]];
  if (publishedDate) rows.push(['처음 펴낸 날', publishedDate]);
  if (stats) {
    rows.push(['엮은 기록', `${stats.totalEntries.toLocaleString('ko-KR')}장`]);
    rows.push(['다 읽은 책', `${stats.finishedBooks.toLocaleString('ko-KR')}권`]);
  }
  return (
    <dl className="grid grid-cols-[104px_1fr] gap-y-2.5 font-sans text-[16px] font-medium leading-normal text-ink">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-[15px] text-ink-sub">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const MARK_TILT = ['-0.8deg', '0.6deg', '-0.4deg'];

function Bookmarks({
  bookmark,
  canBookmark,
  settingsHref,
  limit = 3,
}: {
  bookmark: FeaturedBookmark | null;
  canBookmark: boolean;
  settingsHref: string;
  limit?: number;
}) {
  if (!bookmark || bookmark.quotes.length === 0) {
    return (
      <p className={CAP}>
        {canBookmark ? (
          <>
            다 읽은 책 한 권에 책갈피를 꽂아 두면 그 책의 문장이 여기 끼워져요.{' '}
            <Link href={`${settingsHref}#cover`} className={TEXT_LINK}>
              책갈피 꽂기
            </Link>
          </>
        ) : (
          '다 읽은 책이 생기면 그 책에 책갈피를 꽂아 둘 수 있어요.'
        )}
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {bookmark.quotes.slice(0, limit).map((q, i) => (
        <li key={i}>
          <Link
            href={excerptsHref(bookmark.bookId)}
            className="vellum block rounded-[3px] px-[18px] py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            style={{ transform: `rotate(${MARK_TILT[i % MARK_TILT.length]})` }}
          >
            <p className="font-serif text-[19px] font-semibold leading-[1.6] text-ink">{q}</p>
            <p className="mt-1.5 font-sans text-[14px] font-medium text-ink-sub">
              {bookmark.title}
              <span className="sr-only"> 발췌집 열기</span>
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function MadeBooks({ books }: { books: FinishedBookExcerpt[] }) {
  const made = books.slice(0, MADE_COUNT);
  if (made.length === 0) {
    return (
      <p className={clsx(CAP, 'mt-4')}>
        다 읽은 책이 생기면 여기 선반에 세워 둘게요.{' '}
        <Link href="/books" className={TEXT_LINK}>
          책장 보기
        </Link>
      </p>
    );
  }
  return (
    <>
      <ul className={s.made} aria-label="나를 만든 책">
        {made.map((b) => (
          <li key={b.bookId} className={s.madeBook}>
            <Link
              href={excerptsHref(b.bookId)}
              className="absolute inset-0 block focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
            >
              {b.coverUrl ? (
                <Image
                  src={b.coverUrl}
                  alt={`${b.title} 표지`}
                  fill
                  sizes="(min-width: 1024px) 220px, 120px"
                  className="object-cover"
                />
              ) : (
                <span className={clsx(s.madeBlank, 'absolute inset-0 block')}>{b.title}</span>
              )}
              <span className="sr-only"> 발췌집 열기</span>
            </Link>
          </li>
        ))}
      </ul>
      <ul className={s.why} aria-hidden>
        {made.map((b) => (
          <li
            key={b.bookId}
            className="font-serif text-[15px] leading-normal text-ink-sub lg:text-[17px]"
          >
            {b.title}
            <span className="mt-0.5 block font-sans text-[13px] font-medium text-ink-faint">
              옮긴 문장 {b.quoteCount}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function StatGrid({ stats, desk }: { stats: Stats; desk?: boolean }) {
  const items: [number, string][] = [
    [stats.totalEntries, '남긴 기록'],
    [stats.finishedBooks, '다 읽은 책'],
    [stats.totalBooks, '함께한 책'],
    [stats.totalPages, '읽은 쪽'],
  ];
  return (
    <dl
      className={clsx('mt-[18px] grid gap-x-3 gap-y-[18px]', desk ? 'grid-cols-4' : 'grid-cols-2')}
    >
      {items.map(([n, label]) => (
        <div key={label} className="flex flex-col-reverse">
          <dt className="font-sans text-[15px] font-medium text-ink-sub">{label}</dt>
          <dd className="font-serif text-[34px] font-bold leading-tight tabular-nums text-ink">
            {n.toLocaleString('ko-KR')}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Shelf({ books, total }: { books: ShelfBook[]; total: number }) {
  if (books.length === 0) {
    return (
      <p className={CAP}>
        아직 빈 서가예요.{' '}
        <Link href="/books/new" className={TEXT_LINK}>
          첫 책 꽂기
        </Link>
      </p>
    );
  }
  return (
    <>
      <BookSpineShelf books={books} />
      {total > books.length && (
        <Link href="/books" className={clsx(TEXT_LINK, 'mt-4 inline-flex min-h-11 items-center')}>
          책장에서 {total.toLocaleString('ko-KR')}권 모두 보기
        </Link>
      )}
    </>
  );
}

function Volumes({ diary, name, mobile }: { diary: DiaryShelf; name: string; mobile?: boolean }) {
  const cls = [s.v1, s.v2, s.v3];
  const [current] = diary.years;
  const vols = (
    <div
      className={s.vols}
      role="img"
      aria-label={`해마다 한 권씩 쌓인 독서 일기, 지금은 ${ordinalVolume(diary.count)}`}
    >
      {diary.years.map((year, i) => {
        return (
          <div key={year} className={clsx(s.vol, cls[i])} aria-hidden>
            {i === 0 && (
              <div className={s.lab}>
                <b className={s.labTitle}>독서 일기 {current}</b>
                <span className={s.labBy}>
                  {name} · {ordinalVolume(diary.count)}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
  return mobile ? <div className={s.volsMobile}>{vols}</div> : vols;
}

function MonthList({
  months,
  error,
  limit,
}: {
  months: MonthRow[];
  error: boolean;
  limit?: number;
}) {
  if (error) {
    return (
      <p className={clsx(CAP, 'mt-3.5')}>
        달마다 남긴 문장을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.
      </p>
    );
  }
  if (months.length === 0) {
    return (
      <p className={clsx(CAP, 'mt-3.5')}>
        첫 문장을 남기면 이 일기장의 첫 장이 생겨요.{' '}
        <Link href="/today" className={TEXT_LINK}>
          오늘 남기기
        </Link>
      </p>
    );
  }
  const shown = limit ? months.slice(0, limit) : months;
  return (
    <ol className="mt-3.5" aria-label="달마다 남긴 문장">
      {shown.map((m) => {
        const body = (
          <>
            <span className="font-sans text-[15px] font-semibold text-ink">{m.month}</span>
            <span
              className={clsx(
                'line-clamp-2 font-serif text-[17px] leading-normal',
                m.quote ? 'text-ink' : 'text-ink-faint'
              )}
            >
              {m.quote ?? (m.count > 0 ? '생각만 남긴 달' : '쉬어 간 달')}
            </span>
            <span className="font-mono text-[14px] font-medium text-ink-sub">
              <span className="sr-only">기록 </span>
              {m.count}
            </span>
          </>
        );
        const row =
          'grid grid-cols-[44px_1fr_auto] items-baseline gap-3 border-t border-hairline py-3';
        return (
          <li key={m.key}>
            {m.entryId ? (
              <Link
                href={`/entry/${m.entryId}`}
                className={clsx(
                  row,
                  'hover:bg-ink/[.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent'
                )}
              >
                {body}
              </Link>
            ) : (
              <div className={row}>{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

const DESK_ITEMS = [
  { id: 'me-cover', label: '표지' },
  { id: 'me-made', label: '나를 만든 책' },
  { id: 'me-shelf', label: '서가' },
  { id: 'me-diary', label: '일기장' },
];

/**
 * 나 — 한 사람의 독서를 한 권의 책처럼. 문장 표지 → 나를 만든 책 → 서가 → 일기장 → 판권·책갈피.
 * 모바일은 한 화면씩 끊기는 장(Leaves), 데스크톱은 장 단위 + 오른쪽 위 전환 버튼(시안 me.html).
 */
export default function MeView(props: MeViewProps) {
  const {
    name,
    handle,
    inviteSlug,
    bio,
    coverQuote,
    year,
    publishedDate,
    stats,
    finishedBooks,
    shelfBooks,
    shelfTotal,
    diary,
    months,
    monthsError,
    bookmark,
    canBookmark,
    settingsHref = '/settings',
  } = props;
  useTopBar({ title: '나', brand: false });
  const [inviting, setInviting] = useState(false);
  const entries = stats?.totalEntries ?? null;
  const diaryTitle = `${ordinalCount(diary.count)} 일기장`;
  const diaryCap =
    diary.count > 1
      ? `${diary.firstYear}년부터 해마다 한 권씩`
      : `${diary.firstYear}년에 펴낸 첫 권`;

  const actions = (desk: boolean) => (
    <>
      <Button asChild variant="secondary" size={desk ? 'md' : 'sm'}>
        <Link href={`${settingsHref}#profile`}>고치기</Link>
      </Button>
      <Button variant="secondary" size={desk ? 'md' : 'sm'} onClick={() => setInviting(true)}>
        친구 부르기
      </Button>
      {desk && (
        <Button asChild variant="secondary">
          <Link href={settingsHref}>설정</Link>
        </Button>
      )}
    </>
  );

  const pickCover = !coverQuote && (
    <Link
      href={`${settingsHref}#cover`}
      className={clsx(TEXT_LINK, 'inline-flex min-h-11 items-center')}
    >
      표지에 넣을 문장 고르기
    </Link>
  );

  return (
    <>
      <TopBarActions>
        <Link
          href={settingsHref}
          aria-label="설정"
          className="relative grid h-11 w-11 place-items-center rounded-full text-ink"
        >
          <Settings size={23} strokeWidth={1.75} aria-hidden />
        </Link>
      </TopBarActions>

      <Leaves>
        <Leaf title="나의 책">
          <div className="mt-2 flex justify-center">
            <CoverBook name={name} quote={coverQuote} year={year} count={entries} />
          </div>
          <div className="mt-[22px]">
            <Who name={name} bio={bio} center />
          </div>
          <div className="mt-4 flex justify-center gap-2">{actions(false)}</div>
          {pickCover && <div className="mt-1 text-center">{pickCover}</div>}
        </Leaf>

        <Leaf title="나를 만든 책" vellum free>
          <h2 className={H2}>나를 만든 책</h2>
          <MadeBooks books={finishedBooks} />
          {stats && (
            <div className="mt-7">
              <StatGrid stats={stats} />
            </div>
          )}
        </Leaf>

        <Leaf title="서가" vellum free>
          <h2 className={H2}>
            서가{' '}
            <span className="font-sans text-[17px] font-medium text-ink-sub">
              {shelfTotal.toLocaleString('ko-KR')}권
            </span>
          </h2>
          <p className={clsx(CAP, 'mb-[18px] mt-1.5')}>친구에게도 보이는 서가예요</p>
          <Shelf books={shelfBooks} total={shelfTotal} />
        </Leaf>

        <Leaf title="일기장" vellum free>
          <h2 className={H2}>{diaryTitle}</h2>
          <p className={clsx(CAP, 'mt-1.5')}>{diaryCap}</p>
          <Volumes diary={diary} name={name} mobile />
          <MonthList months={months} error={monthsError} limit={3} />
        </Leaf>

        <Leaf title="판권과 책갈피" vellum free>
          <h2 className={H2}>판권</h2>
          <div className="mt-3.5">
            <Colophon name={name} publishedDate={publishedDate} stats={stats} />
          </div>
          <h2 className={clsx(H2, 'mb-4 mt-[34px]')}>책갈피</h2>
          <Bookmarks bookmark={bookmark} canBookmark={canBookmark} settingsHref={settingsHref} />
        </Leaf>
      </Leaves>

      <LeafSwitch label="나 화면 장" items={DESK_ITEMS} />
      <DesktopLeaves>
        <DesktopLeaf id="me-cover">
          <div className="grid grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] items-start gap-16">
            <div className="flex flex-col items-start">
              <CoverBook name={name} quote={coverQuote} year={year} count={entries} />
              {pickCover}
            </div>
            <div className="pt-[30px]">
              <Who name={name} bio={bio} />
              <div className="mt-[34px]">
                <Colophon name={name} publishedDate={publishedDate} stats={stats} />
              </div>
              <div className="mt-[26px] flex gap-2.5">{actions(true)}</div>
              <h2 className={clsx(LABEL, 'mb-3 mt-[34px]')}>책갈피</h2>
              <Bookmarks
                bookmark={bookmark}
                canBookmark={canBookmark}
                settingsHref={settingsHref}
                limit={1}
              />
            </div>
          </div>
        </DesktopLeaf>

        <DesktopLeaf id="me-made">
          <h2 className={H2_DESK}>나를 만든 책</h2>
          <div className="mt-2.5 max-w-[960px]">
            <MadeBooks books={finishedBooks} />
            {stats && (
              <div className="pt-10">
                <StatGrid stats={stats} desk />
              </div>
            )}
          </div>
        </DesktopLeaf>

        <DesktopLeaf id="me-shelf">
          <h2 className={clsx(H2_DESK, 'mb-[22px]')}>
            서가{' '}
            <span className="font-sans text-[20px] font-medium text-ink-sub">
              {shelfTotal.toLocaleString('ko-KR')}권
            </span>
          </h2>
          <Shelf books={shelfBooks} total={shelfTotal} />
        </DesktopLeaf>

        <DesktopLeaf id="me-diary">
          <div className="grid grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] items-start gap-16">
            <div>
              <h2 className={H2_DESK}>{diaryTitle}</h2>
              <p className={clsx(CAP, 'mt-1.5')}>{diaryCap}</p>
              <Volumes diary={diary} name={name} />
            </div>
            <div className="pt-16">
              <h2 className={H2_DESK}>최근의 차례</h2>
              <p className={clsx(CAP, 'mt-1.5')}>달마다 가장 최근에 남긴 문장</p>
              <MonthList months={months} error={monthsError} />
            </div>
          </div>
        </DesktopLeaf>
      </DesktopLeaves>

      <InviteSheet
        open={inviting}
        onClose={() => setInviting(false)}
        handle={handle}
        inviteSlug={inviteSlug}
      />
    </>
  );
}
