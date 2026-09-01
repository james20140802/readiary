'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { formatDistance } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MoreHorizontal, User, BookOpen, Maximize2 } from 'lucide-react';
import { DetailSocialFeedEntry } from '@/types/entry';
import SocialActionBar from '@/components/social/SocialActionBar';
import { toZonedTime } from 'date-fns-tz';
import CommentBottomSheet from '@/components/comments/CommentBottomSheet';
import LikersBottomSheet from '@/components/social/LikersBottomSheet';
import { getImageUrl } from '@/utils/profile';
import { Avatar } from '@/components/ui/Avatar';

interface Props {
  item: DetailSocialFeedEntry;
  userId: string;
}

/**
 * 피드 카드 — 친구가 부쳐 온 엽서.
 * 위쪽은 사연(문장·감상), 아래쪽은 괘선 주소칸(책·날짜)과 표지, "from." 서명 줄.
 */
export default function DetailSocialFeedItem({ item, userId }: Props) {
  const router = useRouter();
  const { profile, entry, initialLikeCount, initialLiked, initialCommentCount } = item;
  const { book } = entry;

  const timeZone = 'Asia/Seoul';
  const now = toZonedTime(new Date(), timeZone);
  const targetDate = toZonedTime(new Date(entry.created_at), timeZone);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isLikersOpen, setIsLikersOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  // "더 보기"는 추측이 아니라 실제 잘림 여부로 판단한다
  const contentRef = useRef<HTMLDivElement>(null);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    const check = () => {
      const el = contentRef.current;
      if (!el) return;
      const clamped = Array.from(el.querySelectorAll('.line-clamp-4, .line-clamp-3')).some(
        (node) => node.scrollHeight > node.clientHeight + 1
      );
      setIsClamped(clamped);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [isExpanded, entry.quote, entry.note]);

  const readRange =
    entry.from_page != null && entry.to_page != null
      ? `${entry.from_page}→${entry.to_page}p`
      : entry.from_page != null || entry.to_page != null
        ? `${entry.to_page ?? entry.from_page}p까지`
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

  return (
    <article aria-label="상세 소셜 피드 항목">
      <div className="overflow-hidden rounded-[6px] border border-hairline-strong bg-card">
        <div className="px-5 pt-4 pb-5 sm:px-6">
          {/* 엽서 상단 — 인쇄된 표제와 메뉴 */}
          <div className="flex items-center justify-between">
            <span className="text-seal text-ink-faint">POST CARD</span>
            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-ink-faint hover:text-ink-sub p-2 -my-2 -mr-2 hover:bg-card-raised rounded-full transition-colors"
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

          {/* 사연 — 문장과 감상 */}
          <div ref={contentRef} className="mt-4">
            {entry.quote && (
              <blockquote
                className={`font-serif text-quote text-ink whitespace-pre-wrap ${
                  !isExpanded ? 'line-clamp-4' : ''
                }`}
              >
                “{entry.quote}”
              </blockquote>
            )}
            {entry.note && (
              <p
                className={`text-body-sm text-ink-sub whitespace-pre-wrap ${
                  entry.quote ? 'mt-3' : ''
                } ${!isExpanded ? 'line-clamp-3' : ''}`}
              >
                {entry.note}
              </p>
            )}
          </div>
          {isClamped && !isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="mt-2 text-caption font-bold text-accent hover:text-accent-hover transition-colors"
            >
              ...더 보기
            </button>
          )}
          {isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="mt-2 text-caption font-medium text-ink-faint hover:text-ink-sub transition-colors"
            >
              접기
            </button>
          )}

          {/* 주소칸 — 괘선 위에 책의 주소, 옆에는 표지 */}
          <div className="mt-6 flex items-end gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate border-b border-hairline-strong pb-1.5 font-serif text-body-sm font-semibold text-ink">
                『{book.title}』
              </p>
              <p className="truncate border-b border-hairline-strong pb-1.5 pt-2 text-caption text-ink-faint">
                {addressLine}
              </p>
            </div>
            <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-[3px] border border-hairline">
              <Image
                src={book.cover_url ?? '/images/default-book-cover.png'}
                alt={`『${book.title}』 표지`}
                fill
                className="object-cover"
                sizes="40px"
              />
              {/* 가름끈 — 표지에 끼워 둔 책갈피 리본 */}
              <span
                aria-hidden
                className="absolute -top-px right-1.5 h-[15px] w-[5px] bg-accent/90"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 70%, 0 100%)' }}
              />
            </div>
          </div>

          {/* 서명 줄 — 보낸 사람 */}
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
            <span className="text-caption text-ink-faint shrink-0">
              {formatDistance(targetDate, now, { addSuffix: true, locale: ko })}
            </span>
          </div>
        </div>

        {/* 액션 바 — 엽서 하단 경계 스트립 */}
        <SocialActionBar
          entryId={entry.id}
          initialLikeCount={initialLikeCount}
          initialLiked={initialLiked}
          commentCount={commentCount}
          onCommentClick={() => setIsCommentOpen(true)}
          onLikeCountClick={() => setIsLikersOpen(true)}
        />
      </div>

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
