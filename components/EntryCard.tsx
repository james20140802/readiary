'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, Lock, MessageCircle } from 'lucide-react';
import { formatKoreanDate } from '@/lib/dates';
import ClampedText from '@/components/ui/ClampedText';
import CommentBottomSheet from './comments/CommentBottomSheet';

interface EntryCardProps {
  id: string;
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
  /** 내 기록을 그 자리에서 고치기 — 있으면 '수정 →'이 페이지 이동 대신 이 콜백을 부른다 */
  onEdit?: () => void;
}

function formatPages(fromPage?: number | null, toPage?: number | null) {
  if (fromPage != null && toPage != null && fromPage !== toPage) return `p.${fromPage}–${toPage}`;
  const page = fromPage ?? toPage;
  return page != null ? `p.${page}` : null;
}

/**
 * 문장 기록 한 장 — 박스 없이 날짜 여백이 있는 원고 흐름.
 * 인용만 / 인용＋생각 / 생각만, 채워진 필드가 그대로 표정이 된다.
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
}: EntryCardProps) {
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLikeLoading, setIsLikeLoading] = useState(false);

  const targetHref = href ?? `/protected/entry/${id}`;
  const pages = formatPages(fromPage, toPage);

  const handleLikeToggle = async () => {
    if (isLikeLoading) return;
    const prevLiked = isLiked;
    const prevCount = likeCount;
    setIsLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);
    setIsLikeLoading(true);
    try {
      const response = await fetch('/api/likes', {
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

  return (
    <article className="grid gap-x-6 py-6 sm:grid-cols-[88px_minmax(0,1fr)]">
      {/* 마진 노트 — 넓은 화면은 왼쪽 여백, 좁은 화면은 첫 줄 */}
      <div className="mb-2 sm:mb-0">
        <Link
          href={targetHref}
          className="flex items-center gap-2 text-[11.5px] tabular-nums text-ink-faint transition-colors hover:text-accent sm:flex-col sm:items-end sm:gap-0.5 sm:text-right"
        >
          <time>{formatKoreanDate(date) ?? date}</time>
          {pages && <span>{pages}</span>}
          {isPrivate && <Lock size={10} className="text-ink-faint/70" aria-label="비공개" />}
        </Link>
      </div>

      <div className="min-w-0">
        <ClampedText>
          {quote && (
            <div>
              <span aria-hidden className="block font-serif text-[32px] leading-none text-accent">
                &ldquo;
              </span>
              <blockquote className="mt-1 whitespace-pre-wrap font-serif text-quote text-ink">
                {quote}
              </blockquote>
            </div>
          )}
          {note && (
            <p
              className={`whitespace-pre-wrap font-serif text-[14px] leading-[1.85] text-ink-sub ${
                quote ? 'mt-4' : ''
              }`}
            >
              {note}
            </p>
          )}
        </ClampedText>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLikeToggle}
              className={`flex items-center gap-1 transition-colors active:scale-90 ${
                isLiked ? 'text-rose-500' : 'text-ink-faint hover:text-rose-500'
              } ${isLikeLoading ? 'cursor-progress' : ''}`}
            >
              <Heart size={12} fill={isLiked ? 'currentColor' : 'none'} strokeWidth={2} />
              <span className="text-[11.5px] tabular-nums">{likeCount}</span>
            </button>
            <button
              onClick={() => setIsCommentOpen(true)}
              className="flex items-center gap-1 text-ink-faint transition-colors hover:text-accent active:scale-95"
            >
              <MessageCircle size={12} strokeWidth={2} />
              <span className="text-[11.5px] tabular-nums">{commentCount}</span>
            </button>
          </div>
          {/* 내 기록은 그 자리에서(시트) 또는 수정 페이지로, 친구 기록은 상세로 — 상세(공유)는 날짜 링크로도 열린다 */}
          {href ? (
            <Link
              href={targetHref}
              className="text-[11.5px] text-ink-faint transition-colors hover:text-accent"
            >
              상세 →
            </Link>
          ) : onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="text-[11.5px] text-ink-faint transition-colors hover:text-accent"
            >
              수정 →
            </button>
          ) : (
            <Link
              href={`/protected/entry/${id}/edit`}
              className="text-[11.5px] text-ink-faint transition-colors hover:text-accent"
            >
              수정 →
            </Link>
          )}
        </div>
      </div>

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
