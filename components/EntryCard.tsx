'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Heart, Lock, MessageCircle } from 'lucide-react';
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
  /** card: 시안의 문장 카드(테두리 박스) / flow: 박스 없이 날짜 여백이 있는 원고 흐름 */
  variant?: 'card' | 'flow';
}

/** 'YYYY-MM-DD' → '2026. 8. 12.' — 타임존을 타지 않도록 문자열로만 다룬다 */
function formatDate(date: string) {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return date;
  return `${y}. ${m}. ${d}.`;
}

function formatPages(fromPage?: number | null, toPage?: number | null) {
  if (fromPage != null && toPage != null && fromPage !== toPage) return `p.${fromPage}–${toPage}`;
  const page = fromPage ?? toPage;
  return page != null ? `p.${page}` : null;
}

/**
 * 문장 카드 — 세리프는 책의 목소리, 산세리프는 나의 목소리.
 * 인용만 / 인용＋생각 / 생각만, 채워진 필드가 그대로 카드의 표정이 된다.
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
  variant = 'card',
}: EntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const targetHref = href ?? `/protected/entry/${id}`;
  const pages = formatPages(fromPage, toPage);

  // 접힌 높이보다 실제 내용이 길 때만 '계속 읽기'를 보여준다
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    setIsClamped(el.scrollHeight > el.clientHeight + 1);
  }, [quote, note]);

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

  if (variant === 'flow') {
    return (
      <article className="grid gap-x-6 py-6 sm:grid-cols-[88px_minmax(0,1fr)]">
        {/* 마진 노트 — 넓은 화면은 왼쪽 여백, 좁은 화면은 첫 줄 */}
        <div className="mb-2 sm:mb-0">
          <Link
            href={targetHref}
            className="flex items-center gap-2 text-[11.5px] tabular-nums text-ink-faint transition-colors hover:text-accent sm:flex-col sm:items-end sm:gap-0.5 sm:text-right"
          >
            <time>{formatDate(date)}</time>
            {pages && <span>{pages}</span>}
            {isPrivate && <Lock size={10} className="text-ink-faint/70" aria-label="비공개" />}
          </Link>
        </div>

        <div className="min-w-0">
          <div className="relative">
            <div ref={bodyRef} className={isExpanded ? undefined : 'max-h-[17em] overflow-hidden'}>
              {quote && (
                <div>
                  <span
                    aria-hidden
                    className="block font-serif text-[32px] leading-none text-accent"
                  >
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
            </div>
            {isClamped && !isExpanded && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-paper to-transparent" />
            )}
          </div>
          {isClamped && (
            <button
              onClick={() => setIsExpanded((v) => !v)}
              className="mt-2 font-serif text-[12.5px] text-ink-faint transition-colors hover:text-accent"
            >
              {isExpanded ? '접기 ↑' : '계속 읽기 ↓'}
            </button>
          )}

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
            <Link
              href={targetHref}
              className="text-[11.5px] text-ink-faint transition-colors hover:text-accent"
            >
              상세 →
            </Link>
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

  return (
    <article className="rounded-md border border-hairline bg-card px-5 py-5 sm:px-6 transition-colors hover:border-hairline-strong">
      <div className="relative">
        <div ref={bodyRef} className={isExpanded ? undefined : 'max-h-[17em] overflow-hidden'}>
          {quote && (
            <blockquote className="whitespace-pre-wrap font-serif text-quote text-ink">
              &ldquo;{quote}&rdquo;
            </blockquote>
          )}
          {note &&
            (quote ? (
              <p className="mt-4 whitespace-pre-wrap border-l-2 border-hairline-strong pl-3 text-[13.5px] leading-[1.8] text-ink-sub">
                {note}
              </p>
            ) : (
              <p className="whitespace-pre-wrap font-serif text-[15.5px] leading-[1.85] text-ink">
                {note}
              </p>
            ))}
        </div>
        {isClamped && !isExpanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />
        )}
      </div>
      {isClamped && (
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="mt-2 font-serif text-[12.5px] text-ink-faint transition-colors hover:text-accent"
        >
          {isExpanded ? '접기 ↑' : '계속 읽기 ↓'}
        </button>
      )}

      <footer className="mt-4 flex items-center justify-between border-t border-hairline pt-3">
        <Link
          href={targetHref}
          className="flex items-center gap-2 text-[11.5px] tabular-nums text-ink-faint transition-colors hover:text-accent"
        >
          <time>{formatDate(date)}</time>
          {pages && <span>{pages}</span>}
          {isPrivate && <Lock size={10} className="text-ink-faint/70" aria-label="비공개" />}
        </Link>

        <div className="flex items-center gap-4">
          <button
            onClick={handleLikeToggle}
            className={`flex items-center gap-1 transition-colors active:scale-90 ${
              isLiked ? 'text-rose-500' : 'text-ink-faint hover:text-rose-500'
            } ${isLikeLoading ? 'cursor-progress' : ''}`}
          >
            <Heart size={13} fill={isLiked ? 'currentColor' : 'none'} strokeWidth={2} />
            <span className="text-[11.5px] tabular-nums">{likeCount}</span>
          </button>
          <button
            onClick={() => setIsCommentOpen(true)}
            className="flex items-center gap-1 text-ink-faint transition-colors hover:text-accent active:scale-95"
          >
            <MessageCircle size={13} strokeWidth={2} />
            <span className="text-[11.5px] tabular-nums">{commentCount}</span>
          </button>
        </div>
      </footer>

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
