'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { formatDistance } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MoreHorizontal, User, BookOpen, Maximize2, Repeat } from 'lucide-react';
import { DetailSocialFeedEntry } from '@/types/entry';
import SocialActionBar from '@/components/social/SocialActionBar';
import { toZonedTime } from 'date-fns-tz';
import CommentBottomSheet from '@/components/comments/CommentBottomSheet';
import LikersBottomSheet from '@/components/social/LikersBottomSheet';
import { useLike } from '@/components/social/useLike';
import { getImageUrl } from '@/utils/profile';
import { Avatar } from '@/components/ui/Avatar';

interface Props {
  item: DetailSocialFeedEntry;
  userId: string;
}

/**
 * 피드 카드 — 친구가 부쳐 온 엽서.
 * 문장이 있으면 앞면(그림 대신 문장), 뒤집으면 뒷면(감상·주소칸·우표 표지·서명).
 * 문장이 없는 기록은 뒷면 한 장으로만 온다.
 */
export default function DetailSocialFeedItem({ item, userId }: Props) {
  const router = useRouter();
  const { profile, entry, initialLikeCount, initialLiked, initialCommentCount } = item;
  const { book } = entry;

  const timeZone = 'Asia/Seoul';
  const now = toZonedTime(new Date(), timeZone);
  const targetDate = toZonedTime(new Date(entry.created_at), timeZone);
  const timeLabel = formatDistance(targetDate, now, { addSuffix: true, locale: ko });

  const hasQuote = Boolean(entry.quote);
  // 회전 각도를 누적해 스와이프 방향 그대로 돌게 한다 (홀수 배 180° = 뒷면)
  const [flipAngle, setFlipAngle] = useState(0);
  const isFlipped = (Math.abs(flipAngle) / 180) % 2 === 1;
  const flip = (dir: 1 | -1) => setFlipAngle((prev) => prev + dir * 180);
  const [isFrontExpanded, setIsFrontExpanded] = useState(false);
  const [isBackExpanded, setIsBackExpanded] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isLikersOpen, setIsLikersOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 액션 바가 앞·뒷면에 하나씩 있으므로 좋아요 상태는 한 벌을 공유한다
  const like = useLike(entry.id, initialLiked, initialLikeCount);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const userProfilePath = `/protected/social/u/${profile.nickname}-${profile.tag}`;
  const bookDetailPath = `/protected/social/u/${profile.nickname}-${profile.tag}/books/${book.id}`;
  const entryDetailPath = `/protected/social/u/${profile.nickname}-${profile.tag}/entry/${entry.id}`;

  // "더 보기"는 추측이 아니라 실제 잘림 여부로 — FitText가 맞춤 결과를 알려준다
  const [isFrontClamped, setIsFrontClamped] = useState(false);
  const [isBackClamped, setIsBackClamped] = useState(false);

  // 시작·끝이 같으면(한쪽만 입력해도 같은 값이 채워진다) 한 번만 적는다
  const readRange =
    entry.from_page != null && entry.to_page != null
      ? entry.from_page === entry.to_page
        ? `${entry.from_page}p`
        : `${entry.from_page}-${entry.to_page}p`
      : entry.from_page != null || entry.to_page != null
        ? `${entry.to_page ?? entry.from_page}p`
        : null;

  const dateLabel = [
    new Date(entry.date + 'T00:00:00').toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    readRange,
  ]
    .filter(Boolean)
    .join(' · ');

  const addressLine = [book.author, dateLabel].filter(Boolean).join(' · ');

  // 아날로그 낱장 느낌 — 기록 id에서 뽑은 결정적 기울기·어긋남
  const seed = Array.from(entry.id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const tilt = ((seed % 5) - 2) * 0.35; // -0.7° ~ 0.7°
  const shift = ((seed % 3) - 1) * 4; // -4px, 0, 4px
  const stampTilt = ((seed % 7) - 3) * 1.2; // 우표는 조금 더 비뚤게

  const expandControls = (
    clamped: boolean,
    expanded: boolean,
    setExpanded: (next: boolean) => void
  ) => (
    <>
      {clamped && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 self-start text-caption font-bold text-accent hover:text-accent-hover transition-colors"
        >
          ...더 보기
        </button>
      )}
      {expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-2 self-start text-caption font-medium text-ink-faint hover:text-ink-sub transition-colors"
        >
          접기
        </button>
      )}
    </>
  );

  // 좌우로 문지르면 뒤집힌다 — 세로 스크롤·텍스트 선택·버튼 클릭과는 겹치지 않게
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
    if (!window.getSelection()?.isCollapsed) return; // 문장을 긁는 중이면 뒤집지 않는다
    flip(dx > 0 ? 1 : -1); // 문지른 방향으로 돈다
  };

  const flipButton = (label: string) => (
    <button
      onClick={() => flip(1)}
      aria-label={label}
      className="flex shrink-0 items-center gap-1 text-caption font-medium text-ink-faint hover:text-accent transition-colors"
    >
      <Repeat size={13} /> 뒤집기
    </button>
  );

  // 뒷면 — 감상(사연) · 세로 구분선 · 우표(표지)와 괘선 주소칸 · 서명 줄
  const backFace = (
    <div className="flex flex-1 flex-col px-5 pt-4 pb-4 sm:px-6">
      <div className="flex items-start justify-between">
        <span className="text-seal text-ink-faint pt-1.5">POST CARD</span>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-ink-faint hover:text-ink-sub p-2 -my-1 -mr-2 hover:bg-card-raised rounded-full transition-colors"
            aria-label="더 보기 메뉴"
          >
            <MoreHorizontal size={18} />
          </button>
          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute right-0 mt-1 w-36 bg-card border border-hairline rounded-xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                <button
                  onClick={() => {
                    router.push(userProfilePath);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-caption font-medium text-ink-sub hover:bg-card-raised transition-colors"
                >
                  <User size={13} className="text-ink-faint" /> 프로필 방문
                </button>
                <button
                  onClick={() => {
                    router.push(bookDetailPath);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-caption font-medium text-ink-sub hover:bg-card-raised transition-colors"
                >
                  <BookOpen size={13} className="text-ink-faint" /> 도서 정보
                </button>
                <button
                  onClick={() => {
                    router.push(entryDetailPath);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-caption font-semibold text-accent hover:bg-accent-soft border-t border-hairline transition-colors"
                >
                  <Maximize2 size={13} /> 상세 보기
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 flex-1 sm:flex sm:gap-5">
        {/* 사연 칸 */}
        <div className="flex min-w-0 flex-1 flex-col">
          {entry.note &&
            (isBackExpanded ? (
              <p className="text-body-sm text-pretty text-ink-sub whitespace-pre-wrap">
                {entry.note}
              </p>
            ) : (
              <FitText
                text={entry.note}
                maxPx={15}
                minPx={13}
                capPx={96}
                capPxSm={130}
                className="text-pretty text-ink-sub whitespace-pre-wrap"
                onClampedChange={setIsBackClamped}
              />
            ))}
          {expandControls(isBackClamped, isBackExpanded, setIsBackExpanded)}
        </div>

        {/* 세로 구분선 — 엽서 뒷면의 사연|주소 경계 */}
        <div className="hidden sm:block w-px self-stretch bg-hairline" />

        {/* 주소 칸 — 우표 자리의 표지, 괘선 위의 책 */}
        <div className="mt-5 flex flex-col sm:mt-0 sm:w-44">
          <div
            className="perforated-stamp self-end"
            style={{ transform: `rotate(${stampTilt}deg)` }}
          >
            <div className="relative h-14 w-10 overflow-hidden bg-card">
              <Image
                src={book.cover_url ?? '/images/default-book-cover.png'}
                alt={`『${book.title}』 표지`}
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
          </div>
          <div className="mt-4 sm:mt-auto sm:pt-5">
            <p className="truncate border-b border-hairline-strong pb-1.5 font-serif text-body-sm font-semibold text-ink">
              『{book.title}』
            </p>
            <p className="line-clamp-2 border-b border-hairline-strong pb-1.5 pt-2 text-caption text-ink-faint">
              {addressLine}
            </p>
          </div>
        </div>
      </div>

      {/* 서명 줄 */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <Link href={userProfilePath} className="flex items-center gap-2 group min-w-0">
          <Avatar
            alt={`${profile.nickname}의 프로필 이미지`}
            fallbackText={profile.nickname.charAt(0).toUpperCase()}
            src={getImageUrl(profile.profile_image) || undefined}
            size="sm"
          />
          <span className="text-caption text-ink-faint shrink-0">from.</span>
          <span className="text-body-sm font-semibold text-ink group-hover:underline truncate">
            {profile.name}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-caption text-ink-faint">{timeLabel}</span>
          {hasQuote && flipButton('앞면의 문장 보기')}
        </div>
      </div>
    </div>
  );

  // 앞면 — 그림 대신 문장이 실린 면
  const frontFace = hasQuote ? (
    <div className="flex flex-1 flex-col px-6 pt-5 pb-4">
      <span aria-hidden className="font-serif text-[40px] leading-none text-accent">
        “
      </span>
      {isFrontExpanded ? (
        <blockquote className="mt-1 font-serif text-[17px] leading-[1.6] text-pretty text-ink whitespace-pre-wrap">
          {entry.quote}
        </blockquote>
      ) : (
        <blockquote className="mt-1">
          <FitText
            text={entry.quote ?? ''}
            maxPx={24}
            minPx={15}
            capPx={170}
            capPxSm={220}
            className="font-serif text-pretty text-ink whitespace-pre-wrap"
            onClampedChange={setIsFrontClamped}
          />
        </blockquote>
      )}
      {expandControls(isFrontClamped, isFrontExpanded, setIsFrontExpanded)}
      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <div className="min-w-0">
          <p className="truncate text-caption font-medium text-ink-sub">
            『{book.title}』{book.author ? ` · ${book.author}` : ''}
          </p>
          <Link href={userProfilePath} className="mt-1.5 flex items-center gap-1.5 group min-w-0">
            <Avatar
              alt={`${profile.nickname}의 프로필 이미지`}
              fallbackText={profile.nickname.charAt(0).toUpperCase()}
              src={getImageUrl(profile.profile_image) || undefined}
              size="sm"
            />
            <span className="truncate text-caption text-ink-faint group-hover:underline">
              {profile.name} · {timeLabel}
            </span>
          </Link>
        </div>
        {flipButton('뒷면의 감상 보기')}
      </div>
    </div>
  ) : null;

  // 타공 테두리·액션 바까지 포함한 엽서 낱장 — 앞·뒷면이 각각 온전한 한 장이라
  // 뒤집을 때 카드 전체가 돌아간다
  const postcard = (face: React.ReactNode) => (
    <div className="perforated h-full">
      <div className="flex h-full flex-col bg-card">
        {face}
        <SocialActionBar
          entryId={entry.id}
          initialLikeCount={initialLikeCount}
          initialLiked={initialLiked}
          like={like}
          commentCount={commentCount}
          onCommentClick={() => setIsCommentOpen(true)}
          onLikeCountClick={() => setIsLikersOpen(true)}
        />
      </div>
    </div>
  );

  return (
    <article
      aria-label="상세 소셜 피드 항목"
      style={{ transform: `rotate(${tilt}deg) translateX(${shift}px)` }}
    >
      {hasQuote ? (
        <div
          className="[perspective:1200px] [touch-action:pan-y]"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          <div
            className="grid transition-transform duration-500 motion-reduce:duration-0 [transform-style:preserve-3d]"
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
      ) : (
        postcard(backFace)
      )}

      <LikersBottomSheet
        entryId={entry.id}
        isOpen={isLikersOpen}
        onClose={() => setIsLikersOpen(false)}
      />

      <CommentBottomSheet
        entryId={entry.id}
        currentUserId={userId}
        isOpen={isCommentOpen}
        onClose={() => setIsCommentOpen(false)}
        onCountChange={setCommentCount}
      />
    </article>
  );
}

interface FitTextProps {
  text: string;
  /** 시작(최대) 글자 크기 px */
  maxPx: number;
  /** 이 크기까지 줄여도 안 들어가면 잘라내고 "더 보기"에 맡긴다 */
  minPx: number;
  /** 본문 상한 높이 px (모바일) */
  capPx: number;
  /** 본문 상한 높이 px (sm 이상) */
  capPxSm: number;
  className?: string;
  onClampedChange: (clamped: boolean) => void;
}

/**
 * 정해진 상한 높이에 들어갈 때까지 글자를 줄여 가며 맞춘다.
 * 상한은 줄 높이의 배수로 스냅해 반쯤 잘린 줄이 생기지 않고,
 * 최소 크기로도 넘치는 글만 잘라내며 onClampedChange(true)로 알린다.
 */
function FitText({ text, maxPx, minPx, capPx, capPxSm, className, onClampedChange }: FitTextProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const lineHeightFor = (px: number) => (px >= 20 ? 1.7 : 1.6);

    const fit = () => {
      const cap = window.innerWidth >= 640 ? capPxSm : capPx;
      el.style.maxHeight = 'none';
      let size = maxPx;
      for (; size > minPx; size -= 1) {
        el.style.fontSize = `${size}px`;
        el.style.lineHeight = `${lineHeightFor(size)}`;
        if (el.scrollHeight <= cap + 1) break;
      }
      const lh = lineHeightFor(size);
      el.style.fontSize = `${size}px`;
      el.style.lineHeight = `${lh}`;
      const linePx = size * lh;
      const snappedCap = Math.max(1, Math.floor(cap / linePx)) * linePx;
      el.style.maxHeight = `${snappedCap}px`;
      onClampedChange(el.scrollHeight > snappedCap + 1);
    };

    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [text, maxPx, minPx, capPx, capPxSm, onClampedChange]);

  return (
    <div
      ref={ref}
      className={`overflow-hidden ${className ?? ''}`}
      style={{ fontSize: maxPx, lineHeight: 1.7 }}
    >
      {text}
    </div>
  );
}
