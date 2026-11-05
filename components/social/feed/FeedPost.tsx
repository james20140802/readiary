'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';
import type { DetailSocialFeedEntry } from '@/types/entry';
import ReflectionPreview from '@/components/reflections/ReflectionPreview';
import CommentBottomSheet from '@/components/comments/CommentBottomSheet';
import LineClamp from '@/components/ui/LineClamp';
import Sheet from '@/components/ui/Sheet';
import SocialActionBar from '@/components/social/SocialActionBar';
import LikersBottomSheet from '@/components/social/LikersBottomSheet';
import BookThumb from '@/components/social/BookThumb';
import SheetRow from '@/components/social/SheetRow';
import { dayLabel, pageLabel } from '@/components/social/feedFormat';
import { quoteTier } from '@/components/entry/quoteTier';
import type { QuoteTier } from '@/components/entry/quoteTier';
import styles from './feed.module.css';

interface Props {
  item: DetailSocialFeedEntry;
  userId: string;
  /** 날 표시의 기준 시각 — 서버와 클라이언트가 같은 글을 그리도록 서버에서 받는다 */
  now: Date;
  /** 피드 안 순서 — 데스크톱에서 간지 기울기를 번갈아 준다 */
  index: number;
}

/** 링크·버튼에 공통으로 거는 초점 표시 */
const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/** 긴 문장은 작게 쓰고 줄을 더 줘서, 어느 단계든 모바일에서 300px 안팎에서 접힌다 */
const QUOTE_TEXT: Record<QuoteTier, { lines: number; className: string }> = {
  lg: { lines: 8, className: 'text-[24px] font-semibold leading-[1.6] lg:text-[28px]' },
  md: { lines: 8, className: 'text-[21px] font-semibold leading-[1.6] lg:text-[24px]' },
  sm: { lines: 10, className: 'text-[18px] font-semibold leading-[1.65] lg:text-[21px]' },
  xs: { lines: 12, className: 'text-[16px] font-normal leading-[1.7] lg:text-[18px]' },
};

/**
 * 친구의 문장 한 편 — 문장이 실린 간지, 그 아래에 살짝 비껴 깔린 생각 간지.
 * 시안 social.html `.post`: 간지 22/22/14, 문장 24px(데스크톱 28), 생각 간지는 1.4° 기울여 6px 밑으로 들어간다.
 */
export default function FeedPost({ item, userId, now, index }: Props) {
  const { profile, entry, initialLikeCount, initialLiked, initialCommentCount } = item;
  const { book } = entry;
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(initialCommentCount);

  const slug = `${profile.nickname}-${profile.tag}`;
  const libraryHref = `/social/u/${slug}`;
  const bookHref = `${libraryHref}/books/${book.id}`;
  const entryHref = `${libraryHref}/entry/${entry.id}`;

  const when = dayLabel(entry.created_at, now);
  const page = pageLabel(entry.from_page, entry.to_page);
  const source = [book.title, page].filter(Boolean).join(' ');
  const sourceDesk = [book.title, page, when].filter(Boolean).join(' · ');
  const hasQuote = Boolean(entry.quote?.trim());
  const hasNote = Boolean(entry.note?.trim());
  const tilt = index % 2 === 0 ? -0.4 : 0.4;
  const quoteText = QUOTE_TEXT[quoteTier(entry.quote ?? '')];

  return (
    <article
      className={clsx(styles.item, 'relative')}
      aria-label={`${profile.name}의 ${hasQuote ? '문장' : '생각'}`}
    >
      <div
        className="vellum relative z-[1] rounded-[3px] px-[22px] pb-[14px] pt-[22px] lg:[transform:rotate(var(--tilt))]"
        style={{ '--tilt': `${tilt}deg` } as React.CSSProperties}
      >
        <div className="flex items-center gap-3">
          <Link href={bookHref} className={clsx('shrink-0 rounded-[2px]', FOCUS)}>
            <BookThumb url={book.cover_url} title={book.title} width={38} />
            <span className="sr-only">
              『{book.title}』 {profile.name}의 기록 보기
            </span>
          </Link>
          <div className="min-w-0">
            <Link
              href={libraryHref}
              data-skeleton
              className={clsx(
                'font-sans text-[16px] font-semibold text-ink hover:underline',
                FOCUS
              )}
            >
              {profile.name}
            </Link>
            <p data-skeleton className="font-sans text-[14px] font-medium text-ink-sub lg:hidden">
              {source}
            </p>
            <p
              data-skeleton
              className="hidden truncate font-sans text-[14px] font-medium text-ink-sub lg:block"
            >
              {sourceDesk}
            </p>
          </div>
          <time
            dateTime={entry.created_at}
            data-skeleton
            className="ml-auto self-start whitespace-nowrap font-sans text-[14px] font-medium text-ink-sub lg:hidden"
          >
            {when}
          </time>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={`${profile.name}의 기록 더 보기`}
            aria-haspopup="dialog"
            className={clsx(
              '-mr-2.5 -mt-2 ml-0.5 grid h-9 w-9 shrink-0 place-items-center self-start rounded-full text-ink-sub hover:text-ink lg:ml-auto',
              FOCUS
            )}
          >
            <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        {hasQuote ? (
          <LineClamp
            lines={quoteText.lines}
            className={clsx(
              'mt-4 whitespace-pre-wrap font-serif tracking-[-0.01em] text-ink',
              quoteText.className
            )}
          >
            {entry.quote}
          </LineClamp>
        ) : (
          <LineClamp
            lines={8}
            className="mt-[14px] whitespace-pre-wrap font-serif text-[20px] leading-[1.65] text-ink"
          >
            {entry.note}
          </LineClamp>
        )}

        <div className="mt-2.5">
          <SocialActionBar
            entryId={entry.id}
            initialLikeCount={initialLikeCount}
            initialLiked={initialLiked}
            commentCount={commentCount}
            onCommentClick={() => setCommentsOpen(true)}
            onLikeCountClick={() => setLikersOpen(true)}
            border={false}
          />
        </div>
      </div>

      {hasQuote && hasNote && (
        <div
          className={clsx(
            'vellum relative z-0 -mt-1.5 ml-[22px] mr-[10px] rotate-[1.4deg] rounded-[3px] px-[18px] pb-[14px] pt-4',
            index % 2 === 0 ? 'lg:mr-[120px]' : 'lg:mr-[160px]'
          )}
        >
          <p className="font-sans text-[13px] font-semibold text-ink-sub">
            <span data-skeleton>{profile.name}</span>의 생각
          </p>
          <LineClamp
            lines={6}
            className="mt-1 whitespace-pre-wrap font-serif text-[18px] leading-[1.6] text-ink"
          >
            {entry.note}
          </LineClamp>
        </div>
      )}

      {entry.reflectionSummary && (
        <div className="ml-[22px]">
          <ReflectionPreview
            entryId={entry.id}
            summary={entry.reflectionSummary}
            href={entryHref}
            compactOnNarrow
          />
        </div>
      )}

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} ariaLabel="글 메뉴">
        <div>
          <SheetRow href={libraryHref} onClick={() => setMenuOpen(false)}>
            {profile.name}의 서재 보기
          </SheetRow>
          <SheetRow href={bookHref} onClick={() => setMenuOpen(false)}>
            이 책에 남긴 기록
          </SheetRow>
          <SheetRow href={entryHref} onClick={() => setMenuOpen(false)}>
            기록 자세히
          </SheetRow>
        </div>
      </Sheet>

      <LikersBottomSheet
        entryId={entry.id}
        isOpen={likersOpen}
        onClose={() => setLikersOpen(false)}
      />
      <CommentBottomSheet
        entryId={entry.id}
        currentUserId={userId}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCountChange={setCommentCount}
        context={`${(entry.quote ?? entry.note ?? '').trim()} — ${profile.name}`}
      />
    </article>
  );
}
