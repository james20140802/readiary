'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { apiFetch } from '@/lib/api/fetch';
import { useReflectionFeature } from '@/components/features/ReflectionFeatureProvider';
import { subscribeReflectionSummary } from '@/lib/reflections/summaryRefresh';
import type { ReflectionSummary } from '@/lib/reflections/types';
import ClampedText from '@/components/ui/ClampedText';
import { addedThoughtLabel, pageLabel, shortDate } from '@/components/books/bookFormat';
import styles from '@/components/books/books.module.css';
import CommentBottomSheet from './comments/CommentBottomSheet';

interface EntryCardProps {
  id: string;
  reflectionSummary?: ReflectionSummary | null;
  quote: string | null;
  note: string | null;
  date: string;
  fromPage?: number | null;
  toPage?: number | null;
  isPrivate?: boolean;
  userId?: string;
  href?: string;
  initialLikeCount?: number;
  initialCommentCount?: number;
  initialLiked?: boolean;
  /** 내 기록을 그 자리에서 고치기 — 있으면 '고치기'가 페이지 이동 대신 이 콜백을 부른다 */
  onEdit?: () => void;
  /** 덧붙인 생각 간지의 기울기 — 데스크톱에서 번갈아 기운다(시안 .slip / .slip.l2) */
  slipTilt?: 1 | 2;
  /** 첫 기록은 위 선을 긋지 않는다 */
  first?: boolean;
}

/**
 * 원고 한 줄 — 시안 book-layer.html `.e`. 왼쪽 여백에 날짜·쪽(마진 노트), 오른쪽에 문장과 생각.
 * 인용만 / 인용＋생각 / 생각만, 채워진 필드가 그대로 표정이 된다. 덧붙인 생각이 있으면 문장 아래 간지 한 장.
 */
export default function EntryCard({
  id,
  quote,
  note,
  date,
  fromPage,
  toPage,
  isPrivate = false,
  userId,
  href,
  initialLikeCount = 0,
  initialCommentCount = 0,
  initialLiked = false,
  onEdit,
  reflectionSummary,
  slipTilt = 1,
  first = false,
}: EntryCardProps) {
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLikeLoading, setIsLikeLoading] = useState(false);

  const reflections = useReflectionFeature();
  const [summary, setSummary] = useState(reflectionSummary);
  const [prevSummary, setPrevSummary] = useState(reflectionSummary);
  if (reflectionSummary !== prevSummary) {
    setPrevSummary(reflectionSummary);
    setSummary(reflectionSummary);
  }
  useEffect(() => {
    if (reflections) return subscribeReflectionSummary(id, setSummary);
  }, [id, reflections]);

  const targetHref = href ?? `/entry/${id}`;
  const pages = pageLabel(fromPage ?? null, toPage ?? null);
  const own = !href;
  const latest = reflections && summary && summary.total > 0 ? summary.latest : null;

  const handleLikeToggle = async () => {
    if (isLikeLoading) return;
    const prevLiked = isLiked;
    const prevCount = likeCount;
    setIsLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);
    setIsLikeLoading(true);
    try {
      const response = await apiFetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: id }),
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const result = await response.json();
      setIsLiked(result.liked);
    } catch (error) {
      console.error('Like failed:', error);
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setIsLikeLoading(false);
    }
  };

  const reactBtn =
    'inline-flex min-h-8 items-center font-sans text-[14px] font-medium text-ink-sub transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

  return (
    <article
      className={clsx(
        'grid grid-cols-[58px_minmax(0,1fr)] gap-x-3 py-[22px] lg:grid-cols-[64px_minmax(0,1fr)] lg:gap-x-5 lg:py-7',
        !first && 'border-t border-hairline'
      )}
    >
      <Link
        href={targetHref}
        aria-label={`${shortDate(date)}${pages ? ` ${pages}` : ''} 기록 펼치기`}
        className="self-start font-mono text-[14px] font-medium leading-[1.5] text-ink-sub hover:text-accent"
      >
        <time dateTime={date.slice(0, 10)}>{shortDate(date)}</time>
        {pages && (
          <>
            <br />
            {pages}
          </>
        )}
      </Link>

      <div className="min-w-0">
        <ClampedText fadeFromClassName="from-sheet">
          {quote && (
            <blockquote className="whitespace-pre-wrap font-serif text-[21px] font-semibold leading-[1.65] text-ink lg:text-[24px]">
              {quote}
            </blockquote>
          )}
          {note &&
            (quote ? (
              <p className="mt-2 whitespace-pre-wrap pl-3 font-serif text-[18px] leading-[1.65] text-ink-sub shadow-[inset_2px_0_0_rgb(var(--hairline))]">
                {note}
              </p>
            ) : (
              <p className="whitespace-pre-wrap font-serif text-[20px] leading-[1.65] text-ink">
                {note}
              </p>
            ))}
        </ClampedText>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
          <button
            type="button"
            onClick={handleLikeToggle}
            aria-pressed={isLiked}
            className={clsx(reactBtn, isLiked && 'text-accent', isLikeLoading && 'cursor-progress')}
          >
            좋아요 {likeCount}
          </button>
          <button
            type="button"
            onClick={() => setIsCommentOpen(true)}
            aria-label={`댓글 ${commentCount}개 보기`}
            className={reactBtn}
          >
            댓글 {commentCount}
          </button>
          {own && (
            <span className="font-sans text-[14px] font-medium text-ink-sub">
              {isPrivate ? '나만 보기' : '친구에게 보임'}
            </span>
          )}
          <span className="ml-auto flex items-center gap-4">
            {own && reflections && (
              <Link
                href={`${targetHref}?reflect=1#reflections`}
                className={clsx(reactBtn, 'hidden font-semibold lg:inline-flex')}
              >
                생각 덧붙이기
              </Link>
            )}
            {href ? (
              <Link href={targetHref} className={clsx(reactBtn, 'font-semibold')}>
                펼치기
              </Link>
            ) : onEdit ? (
              <button type="button" onClick={onEdit} className={clsx(reactBtn, 'font-semibold')}>
                고치기
              </button>
            ) : (
              <Link href={`/entry/${id}/edit`} className={clsx(reactBtn, 'font-semibold')}>
                고치기
              </Link>
            )}
          </span>
        </div>
      </div>

      {latest && (
        <Link
          href={`${targetHref}#reflections`}
          aria-label={`덧붙인 생각 ${summary?.total ?? 1}개 보기`}
          className={clsx(
            'vellum col-start-2 mt-3.5 block max-w-[420px] rounded-[3px] px-4 py-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
            slipTilt === 2 ? styles.slipTilt2Lg : styles.slipTiltLg
          )}
        >
          <span className="block font-sans text-[13px] font-semibold text-ink-sub">
            <time dateTime={latest.created_at}>{addedThoughtLabel(date, latest.created_at)}</time>
            {summary && summary.total > 1 && ` · 생각 ${summary.total}`}
          </span>
          <span className="mt-1 line-clamp-3 block whitespace-pre-wrap break-words font-serif text-[17px] leading-[1.6] text-ink">
            {latest.body}
          </span>
        </Link>
      )}

      <CommentBottomSheet
        entryId={id}
        currentUserId={userId}
        isOpen={isCommentOpen}
        onClose={() => setIsCommentOpen(false)}
        onCountChange={setCommentCount}
      />
    </article>
  );
}
