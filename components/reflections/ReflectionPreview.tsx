'use client';
import { useReflectionFeature } from '@/components/features/ReflectionFeatureProvider';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, PenLine } from 'lucide-react';
import Link from 'next/link';
import { subscribeReflectionSummary } from '@/lib/reflections/summaryRefresh';
import type { ReflectionSummary } from '@/lib/reflections/types';
import { thoughtDate } from './ReflectionThread';

export function ReflectionWriteLink({ href }: { href: string }) {
  const enabled = useReflectionFeature();
  if (!enabled) return null;
  return (
    <Link
      href={`${href}?reflect=1#reflections`}
      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-button-sm text-ink-sub hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <PenLine size={14} strokeWidth={1.75} aria-hidden="true" />
      지금의 생각 남기기
    </Link>
  );
}

export default function ReflectionPreview({
  entryId,
  summary,
  own = false,
  href,
  onNavigate,
  compactOnNarrow = false,
  trailingAction,
}: {
  entryId: string;
  summary?: ReflectionSummary | null;
  own?: boolean;
  href?: string;
  onNavigate?: () => void;
  compactOnNarrow?: boolean;
  trailingAction?: ReactNode;
}) {
  const enabled = useReflectionFeature();
  const [current, setCurrent] = useState(summary);
  const [previous, setPrevious] = useState(summary);
  if (summary !== previous) {
    setPrevious(summary);
    setCurrent(summary);
  }
  useEffect(() => {
    if (enabled) return subscribeReflectionSummary(entryId, setCurrent);
  }, [entryId, enabled]);
  if (!enabled)
    return trailingAction ? <div className="mt-6 flex justify-end">{trailingAction}</div> : null;
  const hasThoughts = (current?.total ?? 0) > 0;
  if (!hasThoughts && !own && !trailingAction) return null;
  const detailHref = href ?? `/protected/entry/${entryId}`;
  const focusClass =
    'rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent';
  const viewLabel = `이어 남긴 생각 ${current?.total ?? 0}개 보기`;
  const slip = hasThoughts && current?.latest && !compactOnNarrow;
  return (
    <div className={compactOnNarrow ? 'mt-3' : 'mt-5'}>
      {slip && (
        <div className="reflection-slip-stack relative ml-3 sm:ml-6">
          {current.total > 1 && <span className="reflection-slip-backing" aria-hidden="true" />}
          <Link
            href={`${detailHref}#reflections`}
            onClick={onNavigate}
            aria-label={viewLabel}
            className={`reflection-slip group relative block ${trailingAction ? 'bg-paper' : 'bg-card'} px-5 pb-5 pt-5 transition-colors hover:bg-card-raised ${focusClass}`}
          >
            <span className="inline-flex items-center gap-2 pr-5 font-sans text-caption text-ink-sub">
              <span className="h-1 w-1 rounded-full bg-accent" aria-hidden="true" />
              다시 읽고{' '}
              <time dateTime={current.latest!.created_at}>
                {thoughtDate(current.latest!.created_at)}
              </time>
            </span>
            <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words font-serif text-note text-ink">
              {current.latest!.body}
            </p>
            {!trailingAction && (
              <span className="mt-3 flex items-center justify-end gap-1 font-sans text-button-sm text-ink-sub group-hover:text-accent">
                이어 남긴 생각 {current.total}개{' '}
                <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
              </span>
            )}
          </Link>
        </div>
      )}
      <div className="mt-1 flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
        {hasThoughts && (!slip || trailingAction) && (
          <Link
            href={`${detailHref}#reflections`}
            onClick={onNavigate}
            className={`mr-auto inline-flex min-h-11 items-center text-button-sm text-ink-sub hover:text-accent ${focusClass}`}
          >
            {trailingAction ? `생각 ${current?.total}개 보기` : viewLabel}
          </Link>
        )}
        {own && (
          <Link
            href={`${detailHref}?reflect=1#reflections`}
            onClick={onNavigate}
            className={`inline-flex min-h-11 items-center gap-1.5 text-button-sm text-ink-sub hover:text-accent ${focusClass}`}
          >
            <PenLine size={14} strokeWidth={1.75} aria-hidden="true" />
            {trailingAction ? '지금 생각 남기기' : '지금의 생각 남기기'}
          </Link>
        )}
        {trailingAction}
      </div>
    </div>
  );
}
