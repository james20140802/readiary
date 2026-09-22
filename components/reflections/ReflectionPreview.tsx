'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { subscribeReflectionSummary } from '@/lib/reflections/summaryRefresh';
import type { ReflectionSummary } from '@/lib/reflections/types';
import { thoughtDate } from './ReflectionThread';

export default function ReflectionPreview({
  entryId,
  summary,
  own = false,
  href,
  onNavigate,
}: {
  entryId: string;
  summary?: ReflectionSummary | null;
  own?: boolean;
  href?: string;
  onNavigate?: () => void;
}) {
  const [current, setCurrent] = useState(summary);
  const [previous, setPrevious] = useState(summary);
  if (summary !== previous) {
    setPrevious(summary);
    setCurrent(summary);
  }
  useEffect(() => subscribeReflectionSummary(entryId, setCurrent), [entryId]);
  if (current?.total === 0 && !own) return null;
  const detailHref = href ?? `/protected/entry/${entryId}`;
  const linkClass =
    'inline-flex min-h-11 items-center text-button-sm text-ink-sub underline underline-offset-4 hover:text-accent';
  return (
    <div className="mt-5 border-t border-hairline pt-4">
      {current?.latest && (
        <>
          <p className="text-caption text-ink-sub">
            다시 읽고 ·{' '}
            <time dateTime={current.latest.created_at}>
              {thoughtDate(current.latest.created_at)}
            </time>
          </p>
          <p className="mt-2 line-clamp-2 break-words whitespace-pre-wrap font-serif text-note text-ink">
            {current.latest.body}
          </p>
        </>
      )}
      <div className="mt-1 flex flex-wrap gap-x-5">
        {current?.total !== 0 && (
          <Link href={`${detailHref}#reflections`} onClick={onNavigate} className={linkClass}>
            {current?.total ? `이어 남긴 생각 ${current.total}개 보기` : '이어 남긴 생각 보기'}
          </Link>
        )}
        {own && (
          <Link
            href={`${detailHref}?reflect=1#reflections`}
            onClick={onNavigate}
            className={linkClass}
          >
            지금의 생각 남기기
          </Link>
        )}
      </div>
    </div>
  );
}
