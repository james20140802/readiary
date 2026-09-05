'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Heart, MessageCircle, Repeat } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import SlideHeading from './SlideHeading';
import { POSTCARD_DEMO } from './demo';

/**
 * ⑥ 엽서 — 소셜 피드의 엽서 카드를 그대로. 앞면엔 문장, 뒤집으면 감상·우표 자리의 표지·서명.
 * 좋아요는 눌러 볼 수 있고(저장 없음), 문지르거나 뒤집기를 누르면 돈다.
 */
export default function LandingPostcard() {
  const d = POSTCARD_DEMO;
  const [flipAngle, setFlipAngle] = useState(0);
  const isFlipped = (Math.abs(flipAngle) / 180) % 2 === 1;
  const flip = (dir: 1 | -1) => setFlipAngle((prev) => prev + dir * 180);
  const [liked, setLiked] = useState(false);
  const likeCount = d.likeCount + (liked ? 1 : 0);

  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    swipeStart.current = { x: e.clientX, y: e.clientY };
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (!window.getSelection()?.isCollapsed) return;
    flip(dx > 0 ? 1 : -1);
  };

  const flipButton = (label: string) => (
    <button
      type="button"
      onClick={() => flip(1)}
      aria-label={label}
      className="flex shrink-0 items-center gap-1 text-caption font-medium text-ink-faint transition-colors hover:text-accent"
    >
      <Repeat size={13} /> 뒤집기
    </button>
  );

  const avatar = (
    <Avatar alt={`${d.friendName}의 프로필 이미지`} fallbackText={d.friendInitial} size="sm" />
  );

  const actionBar = (
    <div className="flex items-center gap-4 border-t border-hairline bg-card-raised/30 px-5 py-2.5">
      <button
        type="button"
        onClick={() => setLiked((v) => !v)}
        aria-pressed={liked}
        aria-label={liked ? '좋아요 취소' : '좋아요'}
        className={`flex items-center gap-1.5 transition-all active:scale-90 ${
          liked ? 'text-accent' : 'text-ink-faint hover:text-accent'
        }`}
      >
        <Heart size={18} fill={liked ? 'currentColor' : 'none'} strokeWidth={1.75} />
        <span className="text-caption font-medium tabular-nums">{likeCount}</span>
      </button>
      <span className="flex items-center gap-1.5 text-ink-faint">
        <MessageCircle size={18} strokeWidth={1.75} />
        <span className="text-caption font-medium tabular-nums">{d.commentCount}</span>
      </span>
    </div>
  );

  const frontFace = (
    <div className="flex flex-1 flex-col px-6 pb-4 pt-5">
      <span aria-hidden className="font-serif text-[40px] leading-none text-accent">
        “
      </span>
      <blockquote className="mt-1 text-pretty font-serif text-[20px] leading-[1.7] text-ink sm:text-[22px]">
        {d.quote}
      </blockquote>
      <div className="mt-auto flex items-end justify-between gap-3 pt-6">
        <div className="min-w-0">
          <p className="truncate text-caption font-medium text-ink-sub">
            『{d.bookTitle}』 · {d.bookAuthor}
          </p>
          <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
            {avatar}
            <span className="truncate text-caption text-ink-faint">
              {d.friendName} · {d.timeLabel}
            </span>
          </div>
        </div>
        {flipButton('뒷면의 감상 보기')}
      </div>
    </div>
  );

  const backFace = (
    <div className="flex flex-1 flex-col px-5 pb-4 pt-4 sm:px-6">
      <span className="pt-1.5 text-seal text-ink-faint">POST CARD</span>
      <div className="mt-3 flex-1 sm:flex sm:gap-5">
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="whitespace-pre-wrap text-pretty text-body-sm text-ink-sub">{d.note}</p>
        </div>
        <div className="hidden w-px self-stretch bg-hairline sm:block" />
        <div className="mt-5 flex flex-col sm:mt-0 sm:w-44">
          <div className="perforated-stamp self-end" style={{ transform: 'rotate(2.4deg)' }}>
            <div className="relative h-14 w-10 overflow-hidden bg-card">
              <Image
                src="/images/default-book-cover.png"
                alt={`『${d.bookTitle}』 표지`}
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
          </div>
          <div className="mt-4 sm:mt-auto sm:pt-5">
            <p className="truncate border-b border-hairline-strong pb-1.5 font-serif text-body-sm font-semibold text-ink">
              『{d.bookTitle}』
            </p>
            <p className="line-clamp-2 border-b border-hairline-strong pb-1.5 pt-2 text-caption text-ink-faint">
              {d.bookAuthor} · {d.dateLabel}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {avatar}
          <span className="shrink-0 text-caption text-ink-faint">from.</span>
          <span className="truncate text-body-sm font-semibold text-ink">{d.friendName}</span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-caption text-ink-faint">{d.timeLabel}</span>
          {flipButton('앞면의 문장 보기')}
        </div>
      </div>
    </div>
  );

  const postcard = (face: React.ReactNode) => (
    <div className="perforated h-full">
      <div className="flex h-full flex-col bg-card">
        {face}
        {actionBar}
      </div>
    </div>
  );

  return (
    <div>
      <SlideHeading
        eyebrow="엽서"
        title="친구의 문장은 엽서로 옵니다"
        body="앞면엔 그림 대신 문장이, 뒤집으면 감상과 우표 자리의 표지가 있어요. 좋아요와 댓글로 마음을 보태세요."
      />

      <div className="mx-auto mt-6 max-w-[520px] md:mt-8">
        <div className="-mx-4 px-4">
          <div style={{ transform: 'rotate(-0.35deg) translateX(4px)' }}>
            <div
              className="[perspective:1200px] [touch-action:pan-y]"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
            >
              <div
                className="grid transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:duration-0"
                style={{ transform: `rotateY(${flipAngle}deg)` }}
              >
                <div inert={isFlipped} className="[grid-area:1/1] [backface-visibility:hidden]">
                  {postcard(frontFace)}
                </div>
                <div
                  inert={!isFlipped}
                  className="[grid-area:1/1] [backface-visibility:hidden] [transform:rotateY(180deg)]"
                >
                  {postcard(backFace)}
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-caption text-ink-faint">
          엽서를 옆으로 문지르거나 뒤집기를 눌러 보세요.
        </p>
      </div>
    </div>
  );
}
