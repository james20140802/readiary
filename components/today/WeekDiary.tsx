'use client';

import Link from 'next/link';
import clsx from 'clsx';
import type { RecentEntry } from '@/lib/dashboard/fetchRecentEntries';
import { formatKoreanDate } from '@/lib/dates';
import { buildWeekDiary } from './todayCopy';
import s from './today.module.css';

interface Props {
  recentEntries: RecentEntry[];
  todayKst: string;
  weeklyCount: number;
  weekActivity: boolean[];
  desk?: boolean;
  /** 비어 있을 때 쓰기로 돌아가는 단추가 초점을 줄 곳 */
  composerId: string;
}

/**
 * 지난 7일의 일기 — 시안 home2 .days. 하루에 한 줄, 그날 남긴 가장 최근 문장.
 * 이번 주 합계는 주간 집계(weeklyCount·weekActivity)로 정확히 센다.
 * 기록이 없을 때도 비어 보이지 않게 마지막으로 남긴 문장을 꺼내 둔다.
 */
export default function WeekDiary({
  recentEntries,
  todayKst,
  weeklyCount,
  weekActivity,
  desk,
  composerId,
}: Props) {
  const rows = buildWeekDiary(recentEntries, todayKst);
  const days = weekActivity.filter(Boolean).length;
  const last = recentEntries.find((e) => (e.quote ?? e.note) != null) ?? null;

  const heading = (
    <h2
      className={clsx(
        'font-serif font-bold leading-[1.3] tracking-[-0.01em] text-ink',
        desk ? 'text-[22px]' : 'text-section-title'
      )}
    >
      지난 7일의 일기
    </h2>
  );
  const sum = (
    <p
      className={clsx(
        'flex flex-wrap items-baseline gap-x-[18px] font-sans text-caption text-ink-sub',
        desk ? 'ml-auto' : 'mt-1.5'
      )}
    >
      <span>이번 주</span>
      <span>
        <b className="mr-[3px] font-serif text-[22px] font-bold text-ink">{weeklyCount}</b>기록
      </span>
      <span>
        <b className="mr-[3px] font-serif text-[22px] font-bold text-ink">{days}</b>일
      </span>
    </p>
  );

  return (
    <>
      {desk ? (
        <div className="flex items-baseline gap-3.5">
          {heading}
          {sum}
        </div>
      ) : (
        <>
          {heading}
          {sum}
        </>
      )}
      {rows.length === 0 ? (
        <div className={clsx(desk ? 'mt-4' : 'mt-[22px]', 'border-t border-hairline pt-4')}>
          <p className="font-serif text-note text-ink-sub">
            {last ? '지난 7일은 조용히 지나갔어요.' : '첫 문장을 남기면 여기에 하루씩 쌓여요.'}
          </p>
          {last && (
            <Link
              href={`/entry/${last.id}`}
              className="mt-4 block border-t border-hairline pt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="font-sans text-overline text-ink-sub">
                마지막으로 남긴 문장 · {formatKoreanDate(last.date)}
              </span>
              <span className="mt-1.5 line-clamp-3 block font-serif text-[18px] leading-[1.55] text-ink">
                {last.quote ?? last.note}
              </span>
              <span className="mt-1 block font-sans text-[14px] font-medium text-ink-sub">
                {last.bookTitle}
              </span>
            </Link>
          )}
          <a
            href={`#${composerId}`}
            onClick={(e) => {
              const el = document.getElementById(composerId);
              if (!el) return;
              e.preventDefault();
              el.focus();
            }}
            className="mt-2 inline-flex min-h-11 items-center font-sans text-[17px] font-semibold text-accent focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            오늘 한 문장 남기기
          </a>
        </div>
      ) : (
        <ol
          className={clsx(s.days, desk ? 'mt-3' : clsx('mt-[22px]', s.daysMobile))}
          aria-label="날짜별 기록"
        >
          {rows.map((r) =>
            r.kind === 'rest' ? (
              <li
                key={`rest-${r.from}`}
                className="grid grid-cols-[58px_1fr] gap-3 border-t border-hairline py-2"
              >
                <span className="font-mono text-[14px] font-medium leading-normal text-ink-sub">
                  {r.label}
                </span>
                <span className="font-sans text-[14px] font-medium text-ink-faint">쉬어 간 날</span>
              </li>
            ) : (
              <li key={r.date} className="border-t border-hairline">
                <Link
                  href={`/entry/${r.entry.id}`}
                  className="grid grid-cols-[58px_1fr] gap-3 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                >
                  <span className="font-mono text-[14px] font-medium leading-normal text-ink-sub">
                    <b className="block font-sans text-[15px] font-semibold text-ink">{r.label}</b>
                    {r.short}
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 block font-serif text-[18px] leading-[1.55] text-ink">
                      {r.text}
                    </span>
                    <span className="mt-1 block truncate font-sans text-[14px] font-medium text-ink-sub">
                      {r.entry.bookTitle}
                      {r.more ? ` · 외 ${r.more}장` : ''}
                    </span>
                  </span>
                </Link>
              </li>
            )
          )}
        </ol>
      )}
    </>
  );
}
