'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { BookOpen, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';
import type { FeaturedBookmark, FeaturedQuote, Profile, Stats } from '@/types/profile';
import type { MonthlySummary } from '@/lib/profile/monthlySummary';
import Seal from '@/components/ui/Seal';
import RemoveFriendButton from '@/components/social/RemoveFriendButton';
import ProfileColophon from '@/components/profile/ProfileColophon';
import { SpineTitle } from '@/components/books/BookSpineShelf';
import { createSupabaseClient } from '@/lib/supabase/client';
import { buildInviteSlug } from '@/lib/social/invite';
import { photoTilt } from '@/lib/books/openBook';
import { getImageUrl } from '@/utils/profile';
import {
  BOOK_H,
  BOOK_W,
  BOOKMARK_CORD,
  BOOKMARK_EXPOSED,
  BOOKMARK_H,
  BOOKMARK_W,
  bookmarkTint,
  INDEX_GAP,
  INDEX_H,
  INDEX_OVERLAP,
  INDEX_TINTS,
  INDEX_W,
  indexLabel,
  spineThickness,
} from '@/lib/profile/bookGeometry';

interface Props {
  user: User;
  profile: Profile;
  stats: Stats | null;
  /** 최근 여섯 달 — 기록이 있는 달이 인덱스가 된다 */
  monthly: MonthlySummary[];
  featuredQuote: FeaturedQuote | null;
  /** 윗면에 끼운 책갈피 — 없으면 본인 프로필에만 빈 자리를 보인다 */
  bookmark: FeaturedBookmark | null;
  /** 책갈피 페이지에서 "발췌집 전체 →"가 가는 곳 */
  bookmarkHref: string | null;
  /** 완독한 책이 있어야 책갈피를 꽂을 수 있다 — 빈 자리 표시 조건 */
  canBookmark?: boolean;
  isFriend?: boolean;
}

type Page = 'colophon' | 'bookmark';

const W = BOOK_W;
const H = BOOK_H;
/** 띠지 — 표지 아래쪽을 감싸는 별지. 띠지 아래로 표지가 OBI_BOTTOM만큼 보인다 */
const OBI_H = 100;
const OBI_BOTTOM = 18;
/** 무대 폭 — 인덱스가 오른쪽으로 삐져나올 자리까지 */
const STAGE_W = W + INDEX_W - INDEX_OVERLAP;
const TOP_PAD = BOOKMARK_EXPOSED + BOOKMARK_CORD;
/** 책갈피 자리 — 사진처럼 가운데보다 조금 오른쪽 */
const BOOKMARK_LEFT = Math.round(W * 0.6);

const FACE = 'absolute inset-0 [backface-visibility:hidden]';
const TURN =
  'transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:duration-0';
/** 종이 단면 — 낱장이 겹친 줄무늬 */
const pageEdge = (dir: 'to right' | 'to bottom'): CSSProperties => ({
  backgroundImage: `repeating-linear-gradient(${dir}, rgb(var(--card)) 0 1px, rgb(var(--hairline)) 1px 2px)`,
});

/** 책갈피 끈 — 구멍을 지나 위로 고리를 이룬다 */
const CORD_PATH = 'M24 45C17 32 12 18 20 8c4-5 10-5 14 0 8 10 3 24-4 37';

/**
 * 프로필 책 — 이 사람을 책 한 권으로. 완독 권수만큼 두꺼운 3D 상자 한 권이 서 있고,
 * 표지를 누르면 펼쳐져 판권면(통계)이, 책갈피를 누르면 그 자리로 펼쳐져 발췌집이 보인다.
 * 문지르거나 뒤집기를 누르면 돌아 뒷표지의 인용이 보인다. 앞마구리에는 기록한 달이 인덱스로 꽂힌다.
 * 띠지는 앞표지·책등·뒷표지를 한 바퀴 감싼다.
 */
export default function ProfileBook({
  user,
  profile,
  stats,
  monthly,
  featuredQuote,
  bookmark,
  bookmarkHref,
  canBookmark = false,
  isFriend = false,
}: Props) {
  const router = useRouter();
  const isOwnProfile = user.id === profile.id;
  const [copied, setCopied] = useState(false);
  const photoUrl = getImageUrl(profile.profile_image);
  const handle = `${profile.nickname}#${profile.tag || '0000'}`;
  const displayName = profile.name || '이름 없음';

  const finished = stats?.finishedBooks ?? 0;
  const T = spineThickness(finished);

  // 뒤집기 — 엽서처럼 각도를 누적해 문지른 방향 그대로 돈다 (홀수 배 180° = 뒷면)
  const [flipAngle, setFlipAngle] = useState(0);
  const isFlipped = (Math.abs(flipAngle) / 180) % 2 === 1;
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<Page>('colophon');
  const flip = (dir: 1 | -1) => {
    setOpen(false);
    setFlipAngle((prev) => prev + dir * 180);
  };
  const toggleOpen = () => {
    if (isFlipped) {
      flip(1);
      return;
    }
    setPage('colophon');
    setOpen((v) => !v);
  };
  // 책갈피를 누르면 그 자리로 펼쳐진다 — 뒤집혀 있었으면 앞으로 돌리면서
  const openBookmark = () => {
    if (isFlipped) setFlipAngle((prev) => prev + 180);
    setPage('bookmark');
    setOpen(true);
  };

  // 펼치면 표지가 왼쪽으로 한 권 폭만큼 눕는다. 자리가 있으면 펼친 전체를 가운데에,
  // 없으면 줄이지 않고 본문을 그대로 둔 채 표지가 화면 밖으로 나간다
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapW, setWrapW] = useState<number>(STAGE_W);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWrapW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const stageLeft = Math.max(0, (wrapW - STAGE_W) / 2);
  const shiftX = open ? Math.min(W / 2, stageLeft) : 0;

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

  const handleCopyTag = async () => {
    try {
      await navigator.clipboard.writeText(handle);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  const handleShareInvite = async () => {
    const inviteUrl = `${window.location.origin}/invite/${encodeURIComponent(
      buildInviteSlug(profile.nickname, profile.tag)
    )}`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Readiary에서 친구 맺기', url: inviteUrl });
      } else {
        await navigator.clipboard.writeText(inviteUrl);
        toast.success('초대 링크를 복사했습니다.');
      }
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') {
        console.error('초대 링크 공유 실패:', error);
      }
    }
  };

  const handleSignOut = async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // 오래된 달이 위에 — 기록이 있는 달만 인덱스가 된다
  const months = [...monthly].reverse().filter((m) => m.count > 0);
  // 인덱스는 책 안(z=0 근처)에 꽂힌다 — 겹치지 않게 두께 안에서 z를 조금씩 달리한다
  const innerZ = (i: number, n: number) => {
    if (n <= 1) return 0;
    const span = Math.max(0, T - 6);
    return -span / 2 + (span * i) / (n - 1);
  };

  const obiBand = (children: ReactNode) => (
    <div
      className="absolute inset-x-0 flex flex-col items-center justify-center gap-2 border-y border-hairline-strong bg-card-raised px-6 text-center shadow-[0_-1px_0_rgb(var(--card)),0_1px_0_rgb(var(--card))]"
      style={{ bottom: OBI_BOTTOM, height: OBI_H }}
    >
      {children}
    </div>
  );

  const bookmarkHole = (
    <span
      aria-hidden
      className="absolute left-1/2 top-2 h-[7px] w-[7px] -translate-x-1/2 rounded-full border border-hairline-strong bg-paper"
    />
  );

  const showBookmarkSlot = !bookmark && isOwnProfile && canBookmark;

  return (
    <div ref={wrapRef} className="w-full" style={{ overflowX: 'clip' }}>
      <div
        className="relative mx-auto [perspective:1800px] [touch-action:pan-y]"
        style={{ width: STAGE_W, paddingTop: TOP_PAD, height: TOP_PAD + H }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {/* 펼칠 때의 자리 이동 — 경첩(왼쪽 가장자리)을 기준으로 */}
        <div
          className={`relative [transform-style:preserve-3d] ${TURN}`}
          style={{
            width: W,
            height: H,
            transformOrigin: '0 50%',
            transform: `translateX(${shiftX}px)`,
          }}
        >
          {/* 책 한 권 — 뒤집기는 가운데를 축으로 */}
          <section
            aria-label={`${displayName}의 프로필 책`}
            className={`relative h-full w-full [transform-style:preserve-3d] ${TURN}`}
            style={{ transform: `rotateY(${flipAngle}deg)` }}
          >
            {/* ── 앞표지 (경첩을 축으로 펼쳐진다) ── */}
            <div
              className={`absolute inset-0 [transform-style:preserve-3d] ${TURN}`}
              style={{
                transformOrigin: '0 50%',
                transform: `translateZ(${T / 2}px) rotateY(${open ? -180 : 0}deg)`,
              }}
            >
              {/* 앞표지 겉면 */}
              <div
                inert={isFlipped}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button, a')) return;
                  toggleOpen();
                }}
                className={`${FACE} cursor-pointer overflow-hidden rounded-l-[3px] rounded-r-[8px] border border-hairline-strong bg-card p-[5px]`}
              >
                <div className="relative h-full w-full overflow-hidden rounded-l-[2px] rounded-r-[5px] border border-hairline">
                  {/* 북라이트 — 왼쪽 위에서 비스듬히. 램프는 그리지 않는다 */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute left-[18%] top-[-6rem] h-80 w-[36rem] max-w-[140%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,196,110,0.16),transparent_66%)]"
                  />
                  {/* 경첩 홈 — 책등 쪽에 눌린 한 줄 */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-2 w-px bg-hairline"
                  />

                  <div
                    className="relative flex flex-col items-center justify-center gap-5 px-7 text-center"
                    style={{ height: H - OBI_H - OBI_BOTTOM - 10 }}
                  >
                    {/* 표지에 붙인 사진 — 인화지 여백에 살짝 비스듬히 */}
                    <div
                      className="w-[112px] shrink-0 border border-hairline bg-card p-[5px]"
                      style={{
                        transform: `rotate(${photoTilt(profile.id)}deg)`,
                        boxShadow:
                          '0 1px 1px rgb(var(--ink) / 0.12), 0 5px 12px rgb(var(--ink) / 0.10)',
                      }}
                    >
                      <div className="relative aspect-square overflow-hidden bg-card-raised">
                        {photoUrl ? (
                          <Image
                            src={photoUrl}
                            alt={`${displayName}의 사진`}
                            fill
                            sizes="112px"
                            className="object-cover"
                            priority
                          />
                        ) : (
                          <div className="flex h-full w-full select-none items-center justify-center font-serif text-4xl text-ink-faint">
                            {profile.nickname?.at(0)?.toUpperCase() ?? 'U'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 max-w-full">
                      <Seal>讀者</Seal>
                      <h1 className="mt-1.5 text-balance break-keep font-serif text-[27px] font-bold leading-tight text-ink">
                        {displayName}
                      </h1>
                      <button
                        type="button"
                        onClick={handleCopyTag}
                        title="닉네임#태그 복사"
                        className="relative mt-2 inline-block font-sans text-[12.5px] tabular-nums text-ink-faint transition-colors hover:text-ink-sub"
                      >
                        @{handle}
                        <span
                          aria-live="polite"
                          className={`absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap text-[11px] transition-opacity ${
                            copied ? 'text-accent opacity-100' : 'opacity-0'
                          }`}
                        >
                          복사됨
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 띠지 — 소개 한 줄을 가운데에, 그 아래 출판사 자리의 표식 */}
                {obiBand(
                  profile.bio ? (
                    <>
                      <p className="line-clamp-3 text-balance break-keep font-serif text-[14px] leading-relaxed text-ink">
                        {profile.bio}
                      </p>
                      <Seal className="opacity-70">Readiary</Seal>
                    </>
                  ) : isOwnProfile ? (
                    <>
                      <Link
                        href="/protected/profile/edit"
                        className="font-serif text-[13.5px] text-ink-faint transition-colors hover:text-accent"
                      >
                        띠지에 한 줄 소개를 써 두세요 →
                      </Link>
                      <Seal className="opacity-70">Readiary</Seal>
                    </>
                  ) : (
                    <Seal className="opacity-70">Readiary</Seal>
                  )
                )}
              </div>

              {/* 앞표지 안쪽 — 면지 */}
              <div
                aria-hidden
                className={`${FACE} flex items-center justify-center rounded-l-[3px] rounded-r-[8px] border border-hairline-strong bg-card-raised [transform:rotateY(180deg)]`}
              >
                <Seal className="opacity-40">讀者</Seal>
              </div>
            </div>

            {/* ── 펼친 면 — 판권면 또는 책갈피가 꽂힌 발췌집 ── */}
            <div
              inert={!open}
              className={`${FACE} border border-hairline bg-card`}
              style={{ transform: `translateZ(${T / 2 - 1}px)`, inset: '2px 3px 2px 0' }}
            >
              {page === 'bookmark' && bookmark ? (
                <div className="flex h-full flex-col px-7 pb-6 pt-8">
                  <Seal>발췌집</Seal>
                  <p className="mt-1 text-balance break-keep font-serif text-[15px] font-bold leading-snug text-ink">
                    {bookmark.title}
                  </p>
                  {bookmark.quotes.length === 0 ? (
                    <p className="mt-5 font-serif text-[13.5px] text-ink-faint">
                      아직 옮겨 적은 문장이 없습니다.
                    </p>
                  ) : (
                    <ul className="mt-4 divide-y divide-hairline border-t border-hairline">
                      {bookmark.quotes.map((q, i) => (
                        <li
                          key={i}
                          className="line-clamp-3 break-keep py-3 font-serif text-[13px] leading-relaxed text-ink"
                        >
                          {q}
                        </li>
                      ))}
                    </ul>
                  )}
                  {bookmarkHref && (
                    <Link
                      href={bookmarkHref}
                      className="mt-auto self-end text-[12.5px] text-ink-faint transition-colors hover:text-accent"
                    >
                      발췌집 전체 <span className="tabular-nums">{bookmark.quoteCount}</span> →
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex h-full flex-col px-7 pb-6 pt-8">
                  <Seal>판권</Seal>
                  <p className="mt-1 font-serif text-[15px] font-bold text-ink">{displayName}</p>
                  {stats ? (
                    <ProfileColophon stats={stats} className="mt-5" />
                  ) : (
                    <p className="mt-5 text-body-sm text-ink-faint">
                      통계 정보를 불러올 수 없습니다.
                    </p>
                  )}
                  <p className="mt-auto text-[12px] leading-relaxed text-ink-faint">
                    {finished > 0
                      ? `완독 ${finished}권만큼 두꺼워진 책 — 한 권 읽을 때마다 조금씩 두꺼워집니다.`
                      : '아직 얇은 책 — 완독할 때마다 조금씩 두꺼워집니다.'}
                  </p>
                </div>
              )}
            </div>

            {/* ── 뒷표지 — 골라 둔 인용 한 토막 ── */}
            <div
              inert={!isFlipped}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('button, a')) return;
                flip(1);
              }}
              className={`${FACE} cursor-pointer overflow-hidden rounded-l-[8px] rounded-r-[3px] border border-hairline-strong bg-card p-[5px]`}
              style={{ transform: `rotateY(180deg) translateZ(${T / 2}px)` }}
            >
              <div className="relative h-full w-full overflow-hidden rounded-l-[5px] rounded-r-[2px] border border-hairline">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 right-2 w-px bg-hairline"
                />
                <div
                  className="flex flex-col items-center justify-center px-8 text-center"
                  style={{ height: H - OBI_H - OBI_BOTTOM - 10 }}
                >
                  {featuredQuote ? (
                    <blockquote className="min-w-0 max-w-full">
                      <p className="line-clamp-[9] text-balance break-keep font-serif text-[16.5px] leading-[1.75] text-ink">
                        {featuredQuote.quote}
                      </p>
                      {(featuredQuote.bookTitle || featuredQuote.author) && (
                        <footer className="mt-4 text-[12.5px] text-ink-sub">
                          {featuredQuote.bookTitle && `『${featuredQuote.bookTitle}』`}
                          {featuredQuote.bookTitle && featuredQuote.author && ', '}
                          {featuredQuote.author}
                        </footer>
                      )}
                    </blockquote>
                  ) : isOwnProfile ? (
                    <Link
                      href="/protected/profile/edit#featured-quote"
                      className="font-serif text-[14px] leading-relaxed text-ink-faint transition-colors hover:text-accent"
                    >
                      뒷표지에 실을 문장을
                      <br />
                      골라 두세요 →
                    </Link>
                  ) : (
                    <p className="font-serif text-[14px] text-ink-faint">
                      아직 뒷표지에 실린 문장이 없습니다.
                    </p>
                  )}
                </div>
              </div>
              {obiBand(
                <>
                  <span className="font-sans text-[12px] tabular-nums text-ink-sub">@{handle}</span>
                  <Seal className="opacity-70">Readiary</Seal>
                </>
              )}
            </div>

            {/* ── 책등 ── */}
            <div
              aria-hidden
              className="absolute left-0 top-0 overflow-hidden border border-hairline-strong bg-card [backface-visibility:hidden]"
              style={{
                width: T,
                height: H,
                transform: `translateX(${-T / 2}px) rotateY(-90deg)`,
              }}
            >
              {T >= 18 && (
                <div
                  className="absolute inset-x-0 top-6 flex justify-center font-serif text-[11px] tracking-[0.1em] text-ink"
                  style={{ writingMode: 'vertical-rl', height: H - OBI_H - OBI_BOTTOM - 40 }}
                >
                  <SpineTitle title={displayName} />
                </div>
              )}
              <div
                className="absolute inset-x-0 border-y border-hairline-strong bg-card-raised"
                style={{ bottom: OBI_BOTTOM, height: OBI_H }}
              />
            </div>

            {/* ── 앞마구리 — 종이 단면 ── */}
            <div
              aria-hidden
              className="absolute right-0 [backface-visibility:hidden]"
              style={{
                width: T,
                height: H - 4,
                top: 2,
                transform: `translateX(${T / 2}px) rotateY(90deg)`,
                ...pageEdge('to right'),
              }}
            />
            {/* ── 윗면·아랫면 ── */}
            <div
              aria-hidden
              className="absolute left-0 top-0 [backface-visibility:hidden]"
              style={{
                width: W - 3,
                height: T,
                transform: `translateY(${-T / 2}px) rotateX(90deg)`,
                ...pageEdge('to bottom'),
              }}
            />
            <div
              aria-hidden
              className="absolute bottom-0 left-0 [backface-visibility:hidden]"
              style={{
                width: W - 3,
                height: T,
                transform: `translateY(${T / 2}px) rotateX(-90deg)`,
                ...pageEdge('to bottom'),
              }}
            />

            {/* ── 책갈피 — 골라 둔 발췌집 하나. 윗면에서 삐져나오고, 누르면 그 자리로 펼쳐진다 ── */}
            {(bookmark || showBookmarkSlot) && (
              <div
                className="absolute [transform-style:preserve-3d]"
                style={{
                  left: BOOKMARK_LEFT,
                  top: -BOOKMARK_EXPOSED,
                  width: BOOKMARK_W,
                  height: BOOKMARK_H,
                }}
              >
                {bookmark ? (
                  <>
                    <svg
                      aria-hidden
                      viewBox="0 0 54 48"
                      className="pointer-events-none absolute left-0 overflow-visible"
                      style={{
                        top: -BOOKMARK_CORD,
                        width: BOOKMARK_W,
                        height: BOOKMARK_CORD + 14,
                      }}
                      fill="none"
                      strokeLinecap="round"
                    >
                      <path d={CORD_PATH} stroke="rgb(var(--ink-faint))" strokeWidth="3" />
                      <path d={CORD_PATH} stroke="rgb(var(--card))" strokeWidth="1.3" />
                    </svg>
                    <button
                      type="button"
                      inert={isFlipped}
                      onClick={openBookmark}
                      aria-pressed={open && page === 'bookmark'}
                      title={`${bookmark.title} 발췌집 · 문장 ${bookmark.quoteCount}`}
                      className={`${FACE} group overflow-hidden rounded-[3px] border border-hairline-strong transition-transform duration-200 hover:-translate-y-2`}
                      style={{ backgroundColor: bookmarkTint(bookmark.userBookId) }}
                    >
                      {bookmarkHole}
                      <span
                        className="absolute left-1/2 top-[22px] -translate-x-1/2 overflow-hidden whitespace-nowrap font-serif text-[12px] tracking-[0.08em] text-ink group-hover:text-accent"
                        style={{ writingMode: 'vertical-rl', maxHeight: BOOKMARK_EXPOSED + 60 }}
                      >
                        <SpineTitle title={bookmark.title} />
                      </span>
                    </button>
                    {/* 책갈피 뒷면 — 종이색만 */}
                    <div
                      aria-hidden
                      className={`${FACE} rounded-[3px] border border-hairline-strong [transform:rotateY(180deg)]`}
                      style={{ backgroundColor: bookmarkTint(bookmark.userBookId) }}
                    >
                      {bookmarkHole}
                    </div>
                  </>
                ) : (
                  <Link
                    href="/protected/profile/edit#bookmark"
                    inert={isFlipped}
                    className={`${FACE} flex justify-center rounded-[3px] border border-dashed border-hairline-strong pt-6 font-serif text-[12px] tracking-[0.08em] text-ink-faint transition-colors hover:border-accent hover:text-accent`}
                    style={{ writingMode: 'vertical-rl' }}
                  >
                    책갈피 꽂기
                  </Link>
                )}
              </div>
            )}

            {/* ── 인덱스 — 기록한 달. 앞마구리에서 삐져나온다 ── */}
            {months.map((m, i) => {
              const label = indexLabel(m.label);
              const tint = INDEX_TINTS[i % INDEX_TINTS.length];
              const top = 28 + i * (INDEX_H + INDEX_GAP);
              const face =
                'absolute inset-0 flex items-center justify-end rounded-r-[3px] pr-2 font-sans text-[10px] font-medium tabular-nums leading-none tracking-[0.04em] text-ink [backface-visibility:hidden]';
              return (
                <div
                  key={m.label}
                  title={`${m.label} · 기록 ${m.count}`}
                  className="absolute [transform-style:preserve-3d]"
                  style={{
                    left: W - INDEX_OVERLAP,
                    top,
                    width: INDEX_W,
                    height: INDEX_H,
                    transform: `translateZ(${innerZ(i, months.length)}px)`,
                  }}
                >
                  <div className={face} style={{ backgroundColor: tint }}>
                    {label}
                  </div>
                  <div
                    className={`${face} flex-row-reverse pl-2 pr-0 [transform:rotateY(180deg)]`}
                    style={{ backgroundColor: tint }}
                  >
                    {label}
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      </div>

      {/* 조작 — 왼쪽은 책을 다루는 것, 오른쪽은 계정을 다루는 것 */}
      <div className="mt-5 flex items-center justify-between gap-4 text-[13px] text-ink-faint">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleOpen}
            aria-pressed={open}
            className="flex items-center gap-1 transition-colors hover:text-accent"
          >
            <BookOpen size={13} /> {open ? '덮기' : '펼치기'}
          </button>
          <button
            type="button"
            onClick={() => flip(1)}
            aria-label={isFlipped ? '앞표지 보기' : '뒷표지 보기'}
            className="flex items-center gap-1 transition-colors hover:text-accent"
          >
            <Repeat size={13} /> 뒤집기
          </button>
        </div>
        <div className="flex items-center gap-4">
          {isOwnProfile ? (
            <>
              <button
                type="button"
                onClick={handleShareInvite}
                className="transition-colors hover:text-ink-sub"
              >
                초대 링크
              </button>
              <Link href="/protected/profile/edit" className="transition-colors hover:text-ink-sub">
                프로필 수정
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="transition-colors hover:text-danger"
              >
                로그아웃
              </button>
            </>
          ) : isFriend ? (
            <RemoveFriendButton friendId={profile.id} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
