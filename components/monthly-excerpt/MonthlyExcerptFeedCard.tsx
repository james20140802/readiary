'use client';

import { useCommentCount } from '@/components/social/useCommentCount';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import CommentBottomSheet from '@/components/comments/CommentBottomSheet';
import LikersBottomSheet from '@/components/social/LikersBottomSheet';
import SocialActionBar from '@/components/social/SocialActionBar';
import { dayLabel } from '@/components/social/feedFormat';
import type { CommentTarget } from '@/lib/comments/target';
import { monthLabel } from '@/lib/monthly-excerpt/month';
import type { SocialFeedExcerptItem } from '@/types/entry';
import styles from './feed-card.module.css';

interface Props {
  item: SocialFeedExcerptItem;
  userId: string;
  /** 날 표시의 기준 시각 — 서버와 클라이언트가 같은 글을 그리도록 서버에서 받는다 */
  now: Date;
  className?: string;
}

const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/**
 * 친구 피드의 달의 발췌집 — 처음 공개한 때 한 번 뜨는 소식. 평소 문장과 같은 자리에서 간지가 쌓인 모양으로 구분한다.
 * 시안 friend-encounter.html ①. 시안의 불투명한 장 대신 실제 간지 재질을 겹친다.
 */
export default function MonthlyExcerptFeedCard({ item, userId, now, className }: Props) {
  const { id, month, sharedAt, profile, coverQuote, coverBookTitle, quoteCount, bookCount } = item;
  const target = useMemo<CommentTarget>(() => ({ kind: 'monthly_excerpt', excerptId: id }), [id]);
  const [commentCount, setCommentCount] = useCommentCount(target, item.initialCommentCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);

  const libraryHref = `/social/u/${profile.nickname}-${profile.tag}`;
  const label = monthLabel(month);

  return (
    <article aria-label={`${profile.name}의 달의 발췌집`} className={clsx('relative', className)}>
      <p className="font-sans text-caption text-ink-sub">
        <Link
          href={libraryHref}
          data-skeleton
          className={clsx('font-semibold text-ink hover:underline', FOCUS)}
        >
          {profile.name}
        </Link>
        님이 발췌집을 엮었어요 ·{' '}
        <time dateTime={sharedAt} data-skeleton>
          {dayLabel(sharedAt, now)}
        </time>
      </p>

      <div className={styles.pile}>
        <div aria-hidden="true" className={clsx('vellum-slip', styles.under, styles.underFar)} />
        <div aria-hidden="true" className={clsx('vellum-slip', styles.under, styles.underNear)} />
        <div className={clsx('vellum-slip', styles.top)}>
          <p className="font-sans text-fine font-semibold tracking-[0.14em] text-ink-sub">
            달의 발췌집
          </p>
          <h3 className="mt-2 font-serif text-[22px] font-bold leading-[1.35] text-ink lg:text-section-title">
            {label}
          </h3>
          <p className="mt-3.5 line-clamp-6 whitespace-pre-wrap font-serif text-[20px] font-semibold leading-[1.6] tracking-[-0.01em] text-ink [overflow-wrap:anywhere] lg:text-quote">
            {coverQuote}
          </p>
          <p className="mt-3 font-sans text-fine text-ink-sub">{coverBookTitle}</p>
          <div className="mt-2 flex items-center justify-between gap-3 font-sans text-fine text-ink-sub">
            <span className="tabular-nums">
              문장 {quoteCount} · 책 {bookCount}권
            </span>
            <Link
              href={`${libraryHref}/excerpts/${month}`}
              aria-label={`${label} 달의 발췌집 펼치기`}
              className={clsx(
                'inline-flex min-h-11 items-center font-sans text-caption font-semibold text-accent hover:underline',
                FOCUS
              )}
            >
              펼치기
            </Link>
          </div>
        </div>
      </div>

      <SocialActionBar
        target={target}
        initialLikeCount={item.initialLikeCount}
        initialLiked={item.initialLiked}
        commentCount={commentCount}
        onCommentClick={() => setCommentsOpen(true)}
        onLikeCountClick={() => setLikersOpen(true)}
        border={false}
      />

      <LikersBottomSheet target={target} isOpen={likersOpen} onClose={() => setLikersOpen(false)} />
      <CommentBottomSheet
        target={target}
        currentUserId={userId}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCountChange={setCommentCount}
        context={`${label}의 발췌집`}
      />
    </article>
  );
}
