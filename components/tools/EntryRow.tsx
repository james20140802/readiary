import Link from 'next/link';
import clsx from 'clsx';
import type { ReactNode } from 'react';

interface EntryRowProps {
  href: string;
  /** 왼쪽 날짜·쪽 칸(찾기). 날짜로 묶인 목록(이번 주의 기록)에서는 비운다 */
  aside?: ReactNode;
  quote?: ReactNode;
  note?: ReactNode;
  /** 책 제목 같은 출처 한 줄 */
  source: ReactNode;
  onClick?: () => void;
}

/**
 * 도구 화면의 기록 한 줄 — 위 헤어라인, 부리 문장, 옅은 생각, 산세리프 출처.
 * 시안 search.html `.en-r`. 문장이 없고 생각만 있으면 생각을 먹색으로 올린다.
 */
export default function EntryRow({ href, aside, quote, note, source, onClick }: EntryRowProps) {
  const noteOnly = !quote && !!note;
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onClick}
      className={clsx(
        'grid gap-3 border-t border-hairline py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
        aside ? 'grid-cols-[minmax(58px,max-content)_minmax(0,1fr)]' : 'grid-cols-1'
      )}
    >
      {aside && (
        <div className="whitespace-nowrap font-mono text-overline font-medium text-ink-sub">
          {aside}
        </div>
      )}
      <div className="min-w-0">
        {quote && (
          <p className="whitespace-pre-line break-words font-serif text-note font-semibold text-ink line-clamp-6">
            {quote}
          </p>
        )}
        {note && (
          <p
            className={clsx(
              'whitespace-pre-line break-words font-serif text-body line-clamp-4',
              noteOnly ? 'text-ink' : 'mt-1.5 text-ink-sub'
            )}
          >
            {note}
          </p>
        )}
        {!quote && !note && (
          <p className="font-serif text-body text-ink-sub">읽은 분량을 기록했어요.</p>
        )}
        <p className="mt-1.5 break-words font-sans text-overline font-medium text-ink-sub">
          {source}
        </p>
      </div>
    </Link>
  );
}
