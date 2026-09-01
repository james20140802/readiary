'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistance } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MoreHorizontal, User, BookOpen, Maximize2 } from 'lucide-react';
import { DetailSocialFeedEntry } from '@/types/entry';
import SentenceCard from '@/components/entries/SentenceCard';
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

  return (
    <article aria-label="상세 소셜 피드 항목" className="py-5">
      {/* 1. 헤더 — 아바타·이름·시간 한 줄 */}
      <div className="flex items-center justify-between mb-3">
        <Link href={userProfilePath} className="flex items-center gap-2.5 group min-w-0">
          <Avatar
            alt={`${profile.nickname}의 프로필 이미지`}
            fallbackText={profile.nickname.charAt(0).toUpperCase()}
            src={getImageUrl(profile.profile_image) || undefined}
            size="sm"
          />
          <span className="text-body-sm font-semibold text-ink group-hover:underline truncate">
            {profile.name}
          </span>
          <span className="text-caption text-ink-faint shrink-0">
            {formatDistance(targetDate, now, { addSuffix: true, locale: ko })}
          </span>
        </Link>

        {/* 드롭다운 */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-ink-faint hover:text-ink-sub p-2 -mr-2 hover:bg-card-raised rounded-full transition-colors"
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

      {/* 2. 본문 — 발췌집과 같은 문장 카드로 수렴. 내용이 없어도
          『책』 저자 · 날짜 · 페이지 한 줄이 조용한 독서 기록이 된다 */}
      <div ref={contentRef}>
        <SentenceCard
          quote={entry.quote}
          note={entry.note}
          bookTitle={book.title}
          bookAuthor={book.author}
          dateLabel={dateLabel}
          coverUrl={book.cover_url ?? null}
          collapsed={!isExpanded}
        />
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

      {/* 3. 소셜 액션 */}
      <div className="mt-3">
        <SocialActionBar
          entryId={entry.id}
          initialLikeCount={initialLikeCount}
          initialLiked={initialLiked}
          commentCount={commentCount}
          onCommentClick={() => setIsCommentOpen(true)}
          onLikeCountClick={() => setIsLikersOpen(true)}
          border={false}
        />
      </div>

      <LikersBottomSheet
        entryId={entry.id}
        bookTitle={book.title}
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
