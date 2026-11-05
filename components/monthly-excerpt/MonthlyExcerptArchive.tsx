'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTopBar } from '@/components/shell/TopBarContext';
import { apiFetch, SessionExpiredError } from '@/lib/api/fetch';
import { monthLabel, shortMonthLabel } from '@/lib/monthly-excerpt/month';
import type { ExcerptMonthRow, MonthKey, YearRow } from '@/lib/monthly-excerpt/types';

type Viewer = 'owner' | 'friend';

type YearState =
  | { status: 'ready'; months: ExcerptMonthRow[] }
  | { status: 'loading' }
  | { status: 'error' };

export interface MonthlyExcerptArchiveProps {
  /** 최신 해 먼저 */
  years: YearRow[];
  /** 첫 해의 달들 — 서버에서 미리 받았다. null이면 받지 못한 것이라 그 해 안에서 다시 시도하게 한다 */
  firstYearMonths: ExcerptMonthRow[] | null;
  /** 친구에게는 엮지 않은 달과 엮기 동작이 없다 */
  viewer: Viewer;
  /** 엮은 달의 발췌집 주소 */
  hrefFor: (month: MonthKey) => string;
  /** 접힌 해를 펼칠 때 달들을 가져온다. 기본은 내 달의 발췌집 API */
  loadYear?: (year: number) => Promise<ExcerptMonthRow[]>;
  title?: string;
  back?: { href: string; label: string };
}

async function loadMyYear(year: number): Promise<ExcerptMonthRow[]> {
  const res = await apiFetch(`/api/monthly-excerpts?year=${year}`);
  if (!res.ok) throw new Error('year unavailable');
  const body = (await res.json()) as { months?: ExcerptMonthRow[] };
  return body.months ?? [];
}

const LINK_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:rounded-sm';

function MonthLine({
  row,
  viewer,
  hrefFor,
}: {
  row: ExcerptMonthRow;
  viewer: Viewer;
  hrefFor: (month: MonthKey) => string;
}) {
  const made = row.excerptId !== null;
  const label = monthLabel(row.month);
  return (
    <li className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-baseline gap-3 border-t border-hairline py-1.5">
      <span data-skeleton className="font-sans text-[15px] font-semibold text-ink">
        {shortMonthLabel(row.month)}
      </span>
      {made ? (
        <span data-skeleton className="line-clamp-2 font-serif text-[17px] leading-normal text-ink">
          {row.coverQuote ?? `문장 ${row.quoteCount}개`}
        </span>
      ) : (
        <span className="font-serif text-[17px] leading-normal text-ink-faint">
          아직 엮지 않았어요
        </span>
      )}
      {made ? (
        <Link
          href={hrefFor(row.month)}
          aria-label={`${label} 펼치기`}
          className={clsx(
            'inline-flex min-h-11 items-center font-sans text-button-sm text-accent',
            LINK_FOCUS
          )}
        >
          펼치기
        </Link>
      ) : (
        viewer === 'owner' && (
          <Link
            href={`/excerpts/${row.month}/compose`}
            aria-label={`${label} 엮기`}
            className={clsx(
              'inline-flex min-h-11 items-center font-sans text-button-sm text-ink underline underline-offset-[3px]',
              LINK_FOCUS
            )}
          >
            엮기
          </Link>
        )
      )}
    </li>
  );
}

function YearBody({
  id,
  state,
  viewer,
  hrefFor,
  onRetry,
}: {
  id: string;
  state: YearState | undefined;
  viewer: Viewer;
  hrefFor: (month: MonthKey) => string;
  onRetry: () => void;
}) {
  if (!state || state.status === 'loading') {
    return (
      <p id={id} role="status" className="py-3 font-sans text-caption text-ink-sub">
        이 해의 달을 펼치는 중이에요.
      </p>
    );
  }
  if (state.status === 'error') {
    return (
      <div id={id} role="alert" className="border-t border-hairline py-3">
        <p className="font-sans text-caption text-ink-sub">
          이 해의 달을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className={clsx(
            'mt-1 inline-flex min-h-11 items-center font-sans text-button-sm text-accent underline-offset-4 hover:underline',
            LINK_FOCUS
          )}
        >
          다시 시도
        </button>
      </div>
    );
  }
  // 친구에게는 엮은 달만 — 엮지 않은 달의 존재도 알리지 않는다
  const rows = viewer === 'owner' ? state.months : state.months.filter((m) => m.excerptId !== null);
  return (
    <ul id={id} aria-label="달 목록">
      {rows.map((row) => (
        <MonthLine key={row.month} row={row} viewer={viewer} hrefFor={hrefFor} />
      ))}
    </ul>
  );
}

function yearSummary(row: YearRow, open: boolean, viewer: Viewer): string {
  // 해 목록에는 엮은 달이 있거나(친구·내 화면) 엮을 달이 있는(내 화면) 해만 온다
  const parts =
    row.excerptCount > 0
      ? [`${row.excerptCount}권`]
      : viewer === 'owner' && row.hasUnmade
        ? ['엮을 달이 있어요']
        : [];
  if (!open) parts.push('펼치기');
  return parts.join(' · ');
}

/**
 * 달의 발췌집 모아 보기 — 해마다 접는 목록(시안 entry-and-archive A). 가장 최근 해만 펼쳐 두고,
 * 접힌 해는 펼칠 때 달들을 가져온다. 해마다 불러오기·실패·다시 시도가 따로 움직여 한 해의 실패가 다른 해를 막지 않는다.
 * 내 화면과 친구 화면이 함께 쓴다 — 친구에게는 엮은 달만 보이고 엮기 동작이 없다.
 */
export default function MonthlyExcerptArchive({
  years,
  firstYearMonths,
  viewer,
  hrefFor,
  loadYear = loadMyYear,
  title = '달의 발췌집',
  back,
}: MonthlyExcerptArchiveProps) {
  useTopBar({ title, back });
  const firstYear = years[0]?.year;
  const [open, setOpen] = useState<ReadonlySet<number>>(
    () => new Set(firstYear === undefined ? [] : [firstYear])
  );
  const [states, setStates] = useState<ReadonlyMap<number, YearState>>(() =>
    firstYear === undefined
      ? new Map()
      : new Map([
          [
            firstYear,
            firstYearMonths ? { status: 'ready', months: firstYearMonths } : { status: 'error' },
          ],
        ])
  );
  // 같은 해를 두 번 동시에 가져오지 않는다
  const inFlight = useRef(new Set<number>());

  const fetchYear = useCallback(
    async (year: number) => {
      if (inFlight.current.has(year)) return;
      inFlight.current.add(year);
      setStates((prev) => new Map(prev).set(year, { status: 'loading' }));
      try {
        const months = await loadYear(year);
        setStates((prev) => new Map(prev).set(year, { status: 'ready', months }));
      } catch (error) {
        // 세션이 끊겨 로그인으로 이동하는 중이면 오류 문구를 보이지 않는다
        if (error instanceof SessionExpiredError) return;
        setStates((prev) => new Map(prev).set(year, { status: 'error' }));
      } finally {
        inFlight.current.delete(year);
      }
    },
    [loadYear]
  );

  const toggle = (year: number) => {
    const opening = !open.has(year);
    setOpen((prev) => {
      const next = new Set(prev);
      if (opening) next.add(year);
      else next.delete(year);
      return next;
    });
    if (opening && !states.has(year)) void fetchYear(year);
  };

  return (
    <div className="mx-auto w-full max-w-[640px] pb-10 pt-6">
      <h1 data-skeleton className="font-serif text-[30px] font-bold leading-[1.35] text-ink">
        {title}
      </h1>
      {years.length === 0 ? (
        <p className="mt-4 font-serif text-note text-ink-sub">
          {viewer === 'owner' ? (
            <>
              아직 엮을 달이 없어요. 문장을 남기면 끝난 달부터 한 권으로 엮을 수 있어요.{' '}
              <Link
                href="/today"
                className={clsx(
                  'font-sans text-button-sm text-accent underline-offset-4 hover:underline',
                  LINK_FOCUS
                )}
              >
                오늘 남기기
              </Link>
            </>
          ) : (
            '아직 친구에게 보여 준 달이 없어요.'
          )}
        </p>
      ) : (
        <div className="mt-4">
          {years.map((row) => {
            const isOpen = open.has(row.year);
            const bodyId = `excerpt-year-${row.year}`;
            const Chevron = isOpen ? ChevronUp : ChevronDown;
            return (
              <section
                key={row.year}
                aria-label={`${row.year}년`}
                className="border-t border-hairline first:border-t-0"
              >
                <h2>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggle(row.year)}
                    className={clsx(
                      'flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left',
                      LINK_FOCUS
                    )}
                  >
                    <span data-skeleton className="font-sans text-[16px] font-semibold text-ink">
                      {row.year}년
                    </span>
                    <span className="flex items-center gap-1 font-sans text-caption text-ink-sub">
                      <span data-skeleton>{yearSummary(row, isOpen, viewer)}</span>
                      <Chevron size={18} strokeWidth={1.75} aria-hidden />
                    </span>
                  </button>
                </h2>
                {isOpen && (
                  <YearBody
                    id={bodyId}
                    state={states.get(row.year)}
                    viewer={viewer}
                    hrefFor={hrefFor}
                    onRetry={() => void fetchYear(row.year)}
                  />
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

const myExcerptHref = (month: MonthKey) => `/excerpts/${month}`;

/**
 * 서버 페이지에서 쓰는 내 모아 보기. 주소를 만드는 함수는 서버에서 클라이언트로 넘길 수 없어
 * 클라이언트 쪽에서 채워 준다.
 */
export function MyMonthlyExcerptArchive(
  props: Pick<MonthlyExcerptArchiveProps, 'years' | 'firstYearMonths'>
) {
  return (
    <MonthlyExcerptArchive
      {...props}
      viewer="owner"
      hrefFor={myExcerptHref}
      back={{ href: '/profile', label: '나' }}
    />
  );
}

/**
 * 서버 페이지에서 쓰는 친구의 모아 보기. 내 모아 보기와 같은 이유로 주소와 불러오기를 클라이언트 쪽에서 채운다.
 * 보여 줄 달이 정해지는 곳은 서버의 친구용 RPC다. 이 화면은 받은 것만 그린다.
 */
export function FriendMonthlyExcerptArchive({
  ownerId,
  ownerName,
  slug,
  years,
  firstYearMonths,
}: Pick<MonthlyExcerptArchiveProps, 'years' | 'firstYearMonths'> & {
  ownerId: string;
  ownerName: string;
  /** 서재 주소의 닉네임-태그 */
  slug: string;
}) {
  const base = `/social/u/${slug}`;
  const hrefFor = useCallback((month: MonthKey) => `${base}/excerpts/${month}`, [base]);
  const loadYear = useCallback(
    async (year: number) => {
      const res = await apiFetch(`/api/monthly-excerpts/friend?owner=${ownerId}&year=${year}`);
      if (!res.ok) throw new Error('year unavailable');
      const body = (await res.json()) as { months?: ExcerptMonthRow[] };
      return body.months ?? [];
    },
    [ownerId]
  );
  const back = useMemo(() => ({ href: base, label: `${ownerName}의 서재` }), [base, ownerName]);
  return (
    <MonthlyExcerptArchive
      years={years}
      firstYearMonths={firstYearMonths}
      viewer="friend"
      hrefFor={hrefFor}
      loadYear={loadYear}
      title={`${ownerName}의 달의 발췌집`}
      back={back}
    />
  );
}
