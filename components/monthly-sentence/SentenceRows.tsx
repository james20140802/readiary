import type { ReactNode } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import type { MonthKey } from '@/lib/monthly-excerpt/types';
import { monthNumber } from '@/lib/monthly-sentence/model';

/** 한 달 한 줄에 그릴 것. 내 일기장과 친구 서재가 각자의 규칙으로 만들어 넘긴다. */
export interface SentenceRowView {
  month: MonthKey;
  /** 첫 줄과 해가 바뀌는 줄에만 */
  year: string | null;
  quote: string | null;
  /** 문장이 없는 달에 대신 보일 말 */
  placeholder: string | null;
  /** 기록 한 장 */
  href: string | null;
  meta: string[];
  notice: string | null;
  /** 바꾸기·엮기·펼치기 — 문장 링크 밖에 놓인다 */
  actions?: ReactNode;
}

const FOCUS =
  'focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/**
 * 달마다 한 문장 — 일기장의 월간 표처럼 여백에 달, 여백선 오른쪽에 문장.
 * 간지도 그림자도 없이 헤어라인과 글자 크기로만 위계를 만든다. 문장은 줄 수로 자르지 않는다.
 */
export default function SentenceRows({ rows, label }: { rows: SentenceRowView[]; label: string }) {
  return (
    <ol aria-label={label}>
      {rows.map((row) => (
        <li
          key={row.month}
          className="grid grid-cols-[52px_minmax(0,1fr)] border-t border-hairline"
        >
          <div className="py-4">
            <span className="block font-serif text-[26px] font-bold leading-none text-ink">
              <span data-skeleton>{monthNumber(row.month)}</span>
              <span className="sr-only">월</span>
            </span>
            {row.year && (
              <span data-skeleton className="mt-1.5 block font-sans text-fine text-ink-faint">
                {row.year}
              </span>
            )}
          </div>
          <div className="min-w-0 border-l border-margin py-4 pl-3.5">
            {row.quote !== null && row.href ? (
              <Link
                href={row.href}
                className={clsx('block break-words font-serif text-note text-ink', FOCUS)}
              >
                <span data-skeleton>{row.quote}</span>
              </Link>
            ) : (
              <p className="break-words font-serif text-note text-ink-faint">
                {row.quote ?? row.placeholder}
              </p>
            )}
            {(row.meta.length > 0 || row.actions) && (
              <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3">
                {row.meta.length > 0 && (
                  <p
                    data-testid="sentence-meta"
                    data-skeleton
                    className="min-w-0 break-words font-sans text-caption text-ink-sub"
                  >
                    {row.meta.join(' · ')}
                  </p>
                )}
                {row.actions && (
                  <div className="ml-auto flex items-center gap-4">{row.actions}</div>
                )}
              </div>
            )}
            {row.notice && (
              <p className="mt-0.5 font-sans text-caption text-ink-sub">{row.notice}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** 줄의 텍스트 행동(바꾸기·엮기·펼치기)이 함께 쓰는 모양 — 터치 높이 44px */
export const ROW_ACTION = clsx(
  'inline-flex min-h-11 items-center font-sans text-button-sm text-accent',
  FOCUS
);
