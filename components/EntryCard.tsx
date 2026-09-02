'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Heart, Lock, MessageCircle } from 'lucide-react';
import { formatKoreanDate } from '@/lib/dates';
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

  // 접힌 높이(17em)보다 실제 내용이 길 때만 '계속 읽기'를 보여준다.
  // clientHeight 대신 17em을 기준으로 재는 이유: 펼친 상태에서 리사이즈가 와도
  // '접기' 버튼이 사라지지 않아야 하므로. 회전·리사이즈·폰트 지연 로드에도 재측정.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => {
      const collapsedMax = parseFloat(getComputedStyle(el).fontSize) * 17;
      setIsClamped(el.scrollHeight > collapsedMax + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
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
        <div className="relative">
          <div ref={bodyRef} className={isExpanded ? undefined : 'max-h-[17em] overflow-hidden'}>
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
          {/* 내 기록은 수정 직행, 친구 기록은 상세로 — 상세(공유·삭제)는 날짜 링크로도 열린다 */}
          {href ? (
            <Link
              href={targetHref}
              className="text-[11.5px] text-ink-faint transition-colors hover:text-accent"
            >
              상세 →
            </Link>
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
