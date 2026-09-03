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

/** 펼쳐서 보는 면 — 판권, 책갈피가 꽂힌 발췌집, 인덱스가 붙은 달 */
type Page = 'colophon' | 'bookmark' | `month:${string}`;
const monthPage = (label: string): Page => `month:${label}`;

const W = BOOK_W;
const H = BOOK_H;
/** 띠지 — 표지 아래쪽을 감싸는 별지. 띠지 아래로 표지가 OBI_BOTTOM만큼 보인다 */
const OBI_H = 100;
const OBI_BOTTOM = 18;
/** 무대 폭 — 인덱스가 오른쪽으로 삐져나올 자리까지 */
const STAGE_W = W + INDEX_W - INDEX_OVERLAP;
/** 위쪽 여백 — 꽂힌 책갈피가 삐져나올 자리. 들어 올리면 그만큼 여백이 늘어 책이 내려앉는다 */
const TOP_PAD = BOOKMARK_EXPOSED + 12;
/** 책갈피 자리 — 사진처럼 가운데보다 조금 오른쪽 */
const BOOKMARK_LEFT = Math.round(W * 0.6);
/** 책갈피가 얹히는 오른쪽 위를 발췌집 면의 제목이 피해 가도록 비워 두는 폭 */
const BOOKMARK_CLEAR = W - BOOKMARK_LEFT - 28 + 8;

const FACE = 'absolute inset-0 [backface-visibility:hidden]';
const TURN =
  'transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:duration-0';
const EASE = 'cubic-bezier(0.4,0,0.2,1)';
/** 표지가 열리고 닫히는 시간 — TURN의 duration-700과 같다 */
const COVER_MS = 700;
/** 낱장 한 장이 넘어가는 시간과, 여러 장을 넘길 때 장마다 두는 시차 */
const LEAF_MS = 600;
const LEAF_STAGGER = 120;
/** 책갈피를 들거나 꽂는 시간 */
/** 낱장 사이 간격(z). 오른쪽 더미는 앞장일수록 표지 쪽, 넘어간 왼쪽 더미는 뒷장일수록 위 */
const LEAF_DZ = 1;
/** 종이 단면 — 낱장이 겹친 줄무늬 */
const pageEdge = (dir: 'to right' | 'to bottom'): CSSProperties => ({
  backgroundImage: `repeating-linear-gradient(${dir}, rgb(var(--card)) 0 1px, rgb(var(--hairline)) 1px 2px)`,
});

/**
 * 프로필 책 — 이 사람을 책 한 권으로. 완독 권수만큼 두꺼운 3D 상자 한 권이 서 있고,
 * 표지를 누르면 펼쳐져 판권면(통계)이, 책갈피를 누르면 책갈피가 뽑히며 그 자리로 펼쳐져 발췌집이,
 * 인덱스를 누르면 그 달 페이지가 보인다. 펼친 왼쪽 면은 차례. 책 바깥을 누르면 덮인다.
 * 문지르거나 뒤집기를 누르면 돌아 뒷표지의 인용이 보인다. 띠지는 앞표지·책등·뒷표지를 한 바퀴 감싼다.
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
  // 직전 상태 — 이번 이동이 펼침·덮음·펼친 채 면 옮김 중 무엇인지에 따라 넘김 순서와 시차가 달라진다
  const [prev, setPrev] = useState<{ open: boolean; page: Page }>({
    open: false,
    page: 'colophon',
  });
  const close = () => {
    setPrev({ open, page });
    setOpen(false);
  };
  const openAt = (next: Page) => {
    setPrev({ open, page });
    setPage(next);
    setOpen(true);
  };
  const flip = (dir: 1 | -1) => {
    close();
    setFlipAngle((angle) => angle + dir * 180);
  };
  // 표지를 눌러 펼치면 판권부터. 덮을 때는 보던 면 그대로 닫힌다
  const toggleOpen = () => {
    if (isFlipped) {
      flip(1);
      return;
    }
    if (open) {
      close();
      return;
    }
    openAt('colophon');
  };
  // 책갈피·인덱스·차례를 누르면 그 면으로 펼쳐진다 — 뒤집혀 있었으면 앞으로 돌리면서
  const goTo = (next: Page) => {
    if (isFlipped) setFlipAngle((angle) => angle + 180);
    openAt(next);
  };
  const isBookmarkPage = open && page === 'bookmark';
  // 인덱스 강조는 펼쳐 있을 때만
  const activeMonth = open && page.startsWith('month:') ? page.slice('month:'.length) : null;

  // 펼쳐진 책 바깥을 누르면 덮인다 — 책 자체와 조작 줄은 바깥이 아니다
  const bookRef = useRef<HTMLElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (bookRef.current?.contains(target) || controlsRef.current?.contains(target)) return;
      closeRef.current();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

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
  // 마우스로 문질러 뒤집으면 브라우저가 같은 자리에 click도 보낸다 — 표지 클릭이 한 번 더 뒤집지 않도록
  // 스와이프로 소비한 직후의 click 한 번은 무대에서 삼킨다(click은 pointerup과 같은 태스크에서 온다)
  const swipeConsumed = useRef(false);
  const handleClickCapture = (e: React.MouseEvent) => {
    if (!swipeConsumed.current) return;
    swipeConsumed.current = false;
    e.stopPropagation();
    e.preventDefault();
  };
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
    swipeConsumed.current = true;
    // 터치처럼 click이 따라오지 않는 입력이면 다음 탭을 삼키지 않도록 곧 되돌린다
    setTimeout(() => {
      swipeConsumed.current = false;
    }, 0);
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
  // 낱장 순서 = 차례 순서. 판권이 첫 장, 그다음 책갈피 책, 그다음 기록한 달들
  const order: Page[] = [
    'colophon',
    ...(bookmark ? (['bookmark'] as Page[]) : []),
    ...months.map((m) => monthPage(m.label)),
  ];
  const leafIndex = Math.max(0, order.indexOf(page));
  const prevLeaf = Math.max(0, order.indexOf(prev.page));
  /** 책갈피가 꽂힌 장 — 없으면 빈 자리는 첫 장에 */
  const bookmarkLeaf = bookmark ? 1 : 0;

  // 펼친 채 면을 옮기면 사이의 낱장들이 한 장씩 시차를 두고 넘어간다. 펼치거나 덮을 때는 표지와 함께 움직인다
  const navigating = open && prev.open;
  const turning = navigating ? Math.abs(leafIndex - prevLeaf) : 0;
  const leafTiming = (i: number): { duration: number; delay: number } => {
    if (!navigating) return { duration: COVER_MS, delay: 0 };
    if (leafIndex > prevLeaf && i >= prevLeaf && i < leafIndex)
      return { duration: LEAF_MS, delay: (i - prevLeaf) * LEAF_STAGGER };
    if (leafIndex < prevLeaf && i >= leafIndex && i < prevLeaf)
      return { duration: LEAF_MS, delay: (prevLeaf - 1 - i) * LEAF_STAGGER };
    return { duration: LEAF_MS, delay: 0 };
  };
  // 이번 이동(넘김·펼침·덮음)이 끝나는 시각 — 떠난 면의 책갈피·인덱스는 그 뒤에야
  // 책 속으로 감춰진다(이동 중에는 종이 위에 붙어 있다)
  const moveMs = navigating
    ? turning > 0
      ? (turning - 1) * LEAF_STAGGER + LEAF_MS
      : 0
    : open !== prev.open
      ? COVER_MS
      : 0;

  const obiBand = (children: ReactNode) => (
    <div
      className="absolute inset-x-0 flex flex-col items-center justify-center gap-2 border-y border-hairline-strong bg-card-raised px-6 text-center shadow-[0_-1px_0_rgb(var(--card)),0_1px_0_rgb(var(--card))]"
      style={{ bottom: OBI_BOTTOM, height: OBI_H }}
    >
      {children}
    </div>
  );

  const showBookmarkSlot = !bookmark && isOwnProfile && canBookmark;

  // 차례 — 펼친 왼쪽 면. 누르면 그 면으로 넘어간다
  const contents: { key: Page; title: string; note: string | null }[] = [
    { key: 'colophon', title: '판권', note: stats ? `완독 ${finished}` : null },
    ...(bookmark
      ? [{ key: 'bookmark' as Page, title: bookmark.title, note: `문장 ${bookmark.quoteCount}` }]
      : []),
    ...months.map((m) => ({ key: monthPage(m.label), title: m.label, note: `기록 ${m.count}` })),
  ];

  // 차례 — 면지와 낱장 뒷면에. 누르면 그 면으로 넘어간다
  const renderContents = () => (
    <>
      <Seal>차례</Seal>
      <p className="mt-1 font-serif text-[15px] font-bold text-ink">{displayName}</p>
      <ol className="mt-5 border-t border-hairline">
        {contents.map((c) => {
          const current = page === c.key;
          return (
            <li key={c.key} className="border-b border-hairline">
              <button
                type="button"
                onClick={() => goTo(c.key)}
                aria-current={current ? 'page' : undefined}
                className={`flex w-full items-baseline justify-between gap-3 py-2.5 text-left transition-colors ${
                  current ? 'text-accent' : 'text-ink hover:text-accent'
                }`}
              >
                <span className="min-w-0 truncate font-serif text-[13.5px]">{c.title}</span>
                {c.note && (
                  <span className="shrink-0 font-sans text-[11px] tabular-nums text-ink-faint">
                    {c.note}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <Seal className="mt-auto self-center opacity-40">讀者</Seal>
    </>
  );

  // 낱장 앞면 — 판권, 책갈피가 꽂힌 발췌집, 인덱스가 붙은 달
  const renderRecto = (p: Page, m: MonthlySummary | null) => (
    <>
      {m ? (
        <div className="flex h-full flex-col px-7 pb-6 pt-8">
          <Seal>{indexLabel(m.label)}</Seal>
          <p className="mt-1 font-serif text-[15px] font-bold leading-snug text-ink">
            {m.label}
            <span className="ml-2 font-sans text-[12px] font-normal tabular-nums text-ink-faint">
              기록 {m.count}
            </span>
          </p>
          {m.books.length > 0 && (
            <p className="mt-3 line-clamp-3 break-keep text-[12.5px] leading-relaxed text-ink-sub">
              {m.books.map((t) => `『${t}』`).join(' ')}
            </p>
          )}
          {m.quotes.length === 0 ? (
            <p className="mt-5 font-serif text-[13.5px] text-ink-faint">
              이 달에는 옮겨 적은 문장이 없습니다.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-hairline border-t border-hairline">
              {m.quotes.map((q, i) => (
                <li key={i} className="py-3">
                  <p className="line-clamp-3 break-keep font-serif text-[13px] leading-relaxed text-ink">
                    {q}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : p === 'bookmark' && bookmark ? (
        <div className="flex h-full flex-col px-7 pb-6 pt-8">
          {/* 오른쪽 위에는 책갈피가 얹혀 있다 */}
          <div style={{ paddingRight: BOOKMARK_CLEAR }}>
            <Seal>발췌집</Seal>
            <p className="mt-1 text-balance break-keep font-serif text-[15px] font-bold leading-snug text-ink">
              {bookmark.title}
            </p>
          </div>
          {bookmark.quotes.length === 0 ? (
            <p className="mt-5 font-serif text-[13.5px] text-ink-faint">
              아직 옮겨 적은 문장이 없습니다.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-hairline border-t border-hairline">
              {bookmark.quotes.map((q, i) => (
                <li key={i} className="py-3">
                  <p className="line-clamp-3 break-keep font-serif text-[13px] leading-relaxed text-ink">
                    {q}
                  </p>
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
            <p className="mt-5 text-body-sm text-ink-faint">통계 정보를 불러올 수 없습니다.</p>
          )}
          <p className="mt-auto text-[12px] leading-relaxed text-ink-faint">
            {finished > 0
              ? `완독 ${finished}권만큼 두꺼워진 책 — 한 권 읽을 때마다 조금씩 두꺼워집니다.`
              : '아직 얇은 책 — 완독할 때마다 조금씩 두꺼워집니다.'}
          </p>
        </div>
      )}
    </>
  );

  // 책갈피 — 골라 둔 발췌집 하나. 제 낱장 위에 얹혀 윗면으로 삐져나온다. 그 낱장이 맨 위에 있는
  // 동안은 종이 위에 통째로 보이고, 다른 장 아래에 있을 때는 종이 위 부분을 clip-path로 감춘다
  // (깊이에 맡기면 Safari가 얇은 z 차이를 잘못 그린다). 감추는 것은 이동이 끝난 뒤에, 드러내는
  // 것은 바로 — 넘어오는 장 아래에 이미 붙어 있다. 누르면 그 면으로 넘어가고, 그 면에서 다시 누르면 덮는다
  const renderBookmark = () => {
    const lifted = isBookmarkPage;
    const onPage = open && leafIndex === bookmarkLeaf;
    const clip = onPage ? 'inset(0 0 0 0)' : `inset(0 0 ${BOOKMARK_H - BOOKMARK_EXPOSED}px 0)`;
    const faceTransition = `clip-path 0s linear ${onPage ? 0 : moveMs}ms, box-shadow 200ms, color 150ms, transform 200ms`;
    return (
      <div
        className="absolute [transform-style:preserve-3d]"
        style={{
          left: BOOKMARK_LEFT,
          top: -BOOKMARK_EXPOSED - 2,
          width: BOOKMARK_W,
          height: BOOKMARK_H,
          transform: 'translateZ(0.5px)',
        }}
      >
        {bookmark ? (
          <>
            <button
              type="button"
              inert={isFlipped}
              onClick={() => (lifted ? close() : goTo('bookmark'))}
              aria-pressed={lifted}
              title={
                lifted
                  ? '책갈피를 다시 꽂고 덮기'
                  : `${bookmark.title} 발췌집 · 문장 ${bookmark.quoteCount}`
              }
              className={`${FACE} group overflow-hidden rounded-[3px] border border-hairline-strong motion-reduce:!duration-0 ${
                lifted ? 'shadow-[2px_4px_12px_rgb(var(--ink)/0.22)]' : 'hover:-translate-y-2'
              }`}
              style={{
                backgroundColor: bookmarkTint(bookmark.userBookId),
                clipPath: clip,
                transition: faceTransition,
              }}
            >
              <span
                className="absolute left-1/2 top-[18px] -translate-x-1/2 overflow-hidden whitespace-nowrap font-serif text-[12px] tracking-[0.08em] text-ink group-hover:text-accent"
                style={{
                  writingMode: 'vertical-rl',
                  maxHeight: onPage ? BOOKMARK_H - 60 : BOOKMARK_EXPOSED + 60,
                }}
              >
                <SpineTitle title={bookmark.title} />
              </span>
              {onPage && (
                <span className="absolute inset-x-0 bottom-2.5 font-sans text-[10px] tabular-nums text-ink-sub">
                  {bookmark.quoteCount}
                </span>
              )}
            </button>
            {/* 책갈피 뒷면 — 낱장이 넘어가면 이쪽이 보인다. 제목은 양면에 */}
            <button
              type="button"
              inert={isFlipped}
              onClick={() => goTo('bookmark')}
              title={`${bookmark.title} 발췌집 · 문장 ${bookmark.quoteCount}`}
              className={`${FACE} group overflow-hidden rounded-[3px] border border-hairline-strong [transform:rotateY(180deg)] hover:-translate-y-2 motion-reduce:!duration-0`}
              style={{
                backgroundColor: bookmarkTint(bookmark.userBookId),
                clipPath: clip,
                transition: faceTransition,
              }}
            >
              <span
                className="absolute left-1/2 top-[18px] -translate-x-1/2 overflow-hidden whitespace-nowrap font-serif text-[12px] tracking-[0.08em] text-ink group-hover:text-accent"
                style={{ writingMode: 'vertical-rl', maxHeight: BOOKMARK_EXPOSED + 60 }}
              >
                <SpineTitle title={bookmark.title} />
              </span>
            </button>
          </>
        ) : (
          <Link
            href="/protected/profile/edit#bookmark"
            inert={isFlipped}
            className={`${FACE} flex justify-center rounded-[3px] border border-dashed border-hairline-strong pt-6 font-serif text-[12px] tracking-[0.08em] text-ink-faint transition-colors hover:border-accent hover:text-accent`}
            style={{ writingMode: 'vertical-rl', clipPath: clip, transition: faceTransition }}
          >
            책갈피 꽂기
          </Link>
        )}
      </div>
    );
  };

  // 인덱스 — 기록한 달. 제 낱장의 앞마구리에서 삐져나오고, 누르면 그 달로 넘어간다.
  // 종이에 붙는 OVERLAP만큼은 다른 장 아래에서는 잘라 두고, 그 낱장이 맨 위에 오면 바로 종이 위로
  // 이어져 보인다. 떠날 때는 이동이 끝난 뒤에 감춘다
  const renderIndex = (m: MonthlySummary) => {
    const i = months.indexOf(m);
    const label = indexLabel(m.label);
    const tint = INDEX_TINTS[i % INDEX_TINTS.length];
    const top = 26 + i * (INDEX_H + INDEX_GAP);
    const active = activeMonth === m.label;
    const timing = `0s linear ${active ? 0 : moveMs}ms`;
    const face =
      'absolute inset-0 flex items-center justify-end rounded-r-[3px] pr-2 font-sans text-[10px] font-medium tabular-nums leading-none tracking-[0.04em] text-ink [backface-visibility:hidden] hover:brightness-95 motion-reduce:!duration-0';
    const go = () => (active ? close() : goTo(monthPage(m.label)));
    return (
      <div
        className="absolute [transform-style:preserve-3d] motion-reduce:!duration-0"
        style={{
          left: W - INDEX_OVERLAP,
          top,
          width: INDEX_W,
          height: INDEX_H,
          transform: 'translateZ(0.5px)',
        }}
      >
        <button
          type="button"
          inert={isFlipped}
          onClick={go}
          aria-pressed={active}
          title={`${m.label} · 기록 ${m.count}`}
          className={`${face} ${active ? 'font-bold shadow-[0_1px_4px_rgb(var(--ink)/0.2)]' : ''}`}
          style={{
            backgroundColor: tint,
            clipPath: active ? 'inset(0 0 0 0)' : `inset(0 0 0 ${INDEX_OVERLAP}px)`,
            transition: `clip-path ${timing}, filter 150ms`,
          }}
        >
          {label}
        </button>
        {/* 뒷면 — 낱장이 넘어가 왼쪽에 꽂히면 이쪽이 보인다 */}
        <button
          type="button"
          inert={isFlipped}
          onClick={go}
          title={`${m.label} · 기록 ${m.count}`}
          className={`${face} flex-row-reverse pl-2 pr-0 [transform:rotateY(180deg)]`}
          style={{ backgroundColor: tint, clipPath: `inset(0 ${INDEX_OVERLAP}px 0 0)` }}
        >
          {label}
        </button>
      </div>
    );
  };

  return (
    <div ref={wrapRef} className="w-full" style={{ overflowX: 'clip' }}>
      <div
        className="relative mx-auto [perspective:1800px] [touch-action:pan-y]"
        style={{ width: STAGE_W, paddingTop: TOP_PAD, height: TOP_PAD + H }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onClickCapture={handleClickCapture}
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
            ref={bookRef}
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

              {/* 앞표지 안쪽 — 면지에 차례. 첫 장을 펼쳤을 때 왼쪽 면이 된다 */}
              <div
                inert={!open || leafIndex > 0}
                className={`${FACE} flex flex-col rounded-l-[3px] rounded-r-[8px] border border-hairline-strong bg-card-raised px-7 pb-6 pt-8 [transform:rotateY(180deg)]`}
              >
                {renderContents()}
              </div>
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

            {/* ── 낱장들 — 차례 순서대로. 경첩을 축으로 넘어가고, 넘어간 장은 면지 위에 쌓인다.
                책갈피와 인덱스는 제 낱장에 붙어 있어 함께 넘어간다 ── */}
            {order.map((p, i) => {
              const turned = open && i < leafIndex;
              const current = open && i === leafIndex;
              const { duration, delay } = leafTiming(i);
              const m = p.startsWith('month:')
                ? (months.find((x) => x.label === p.slice('month:'.length)) ?? null)
                : null;
              return (
                <div
                  key={p}
                  className="absolute [transform-style:preserve-3d] motion-reduce:!duration-0"
                  style={{
                    inset: '2px 3px 2px 0',
                    transformOrigin: '0 50%',
                    transform: turned
                      ? `translateZ(${T / 2 + 1 + i * LEAF_DZ}px) rotateY(-180deg)`
                      : `translateZ(${T / 2 - 1 - i * LEAF_DZ}px) rotateY(0deg)`,
                    transition: `transform ${duration}ms ${EASE} ${delay}ms`,
                  }}
                >
                  {/* 앞면 — 그 면의 내용 */}
                  <div inert={!current} className={`${FACE} border border-hairline bg-card`}>
                    {renderRecto(p, m)}
                  </div>
                  {/* 뒷면 — 넘어가면 왼쪽 면이 된다. 차례를 다시 실어 어디서든 옮겨 갈 수 있게 */}
                  <div
                    inert={!(turned && i === leafIndex - 1)}
                    className={`${FACE} flex flex-col border border-hairline bg-card px-7 pb-6 pt-8 [transform:rotateY(180deg)]`}
                  >
                    {renderContents()}
                  </div>
                  {i === bookmarkLeaf && (bookmark || showBookmarkSlot) && renderBookmark()}
                  {m && renderIndex(m)}
                </div>
              );
            })}
          </section>
        </div>
      </div>

      {/* 조작 — 왼쪽은 책을 다루는 것, 오른쪽은 계정을 다루는 것. 좁으면 두 줄로 나뉜다 */}
      <div
        ref={controlsRef}
        className="mt-4 flex flex-col items-center gap-2 whitespace-nowrap text-[15px] text-ink-faint sm:flex-row sm:justify-between sm:gap-5"
      >
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={toggleOpen}
            aria-pressed={open}
            className="flex items-center gap-1.5 px-1 py-1.5 transition-colors hover:text-accent"
          >
            <BookOpen size={16} /> {open ? '덮기' : '펼치기'}
          </button>
          <button
            type="button"
            onClick={() => flip(1)}
            aria-label={isFlipped ? '앞표지 보기' : '뒷표지 보기'}
            className="flex items-center gap-1.5 px-1 py-1.5 transition-colors hover:text-accent"
          >
            <Repeat size={16} /> 뒤집기
          </button>
        </div>
        <div className="flex items-center justify-center gap-5 sm:justify-end">
          {isOwnProfile ? (
            <>
              <button
                type="button"
                onClick={handleShareInvite}
                className="px-1 py-1.5 transition-colors hover:text-ink-sub"
              >
                초대 링크
              </button>
              <Link
                href="/protected/profile/edit"
                className="px-1 py-1.5 transition-colors hover:text-ink-sub"
              >
                프로필 수정
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-1 py-1.5 transition-colors hover:text-danger"
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
