'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistance } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MoreHorizontal, User, BookOpen, Maximize2 } from 'lucide-react';
import { DetailSocialFeedEntry } from '@/types/entry';
import Card from '@/components/ui/Card';
import SocialActionBar from '@/components/social/SocialActionBar';
import { toZonedTime } from 'date-fns-tz';
import CommentBottomSheet from '@/components/comments/CommentBottomSheet';
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

  const readRange =
    entry.from_page && entry.to_page
      ? `${entry.from_page}→${entry.to_page}p`
      : `${entry.to_page || entry.from_page}p까지`;

  return (
    <Card aria-label="상세 소셜 피드 항목" className="!p-0 overflow-hidden" hoverable={false}>
      {/* 1. 헤더 */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <Link href={userProfilePath} className="flex items-center gap-3 group">
          <Avatar
            alt={`${profile.nickname}의 프로필 이미지`}
            fallbackText={profile.nickname.charAt(0).toUpperCase()}
            src={getImageUrl(profile.profile_image) || undefined}
            size="md"
          />
          <div>
            <span className="text-body-sm font-bold text-label dark:text-label-invert group-hover:underline">
              {profile.name}
            </span>
            <p className="text-caption text-label-muted">
              {formatDistance(targetDate, now, { addSuffix: true, locale: ko })}
            </p>
          </div>
        </Link>

        {/* 드롭다운 */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-label-muted hover:text-label-sub p-2 hover:bg-surface-raised dark:hover:bg-dark-raised rounded-full transition-colors"
          >
            <MoreHorizontal size={18} />
          </button>
          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute right-0 mt-1 w-36 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-xl shadow-card-lg z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                <button
                  onClick={() => {
                    router.push(userProfilePath);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-caption font-medium text-label-sub dark:text-label-muted hover:bg-surface-raised dark:hover:bg-dark-raised transition-colors"
                >
                  <User size={13} className="text-label-muted" /> 프로필 방문
                </button>
                <button
                  onClick={() => {
                    router.push(bookDetailPath);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-caption font-medium text-label-sub dark:text-label-muted hover:bg-surface-raised dark:hover:bg-dark-raised transition-colors"
                >
                  <BookOpen size={13} className="text-label-muted" /> 도서 정보
                </button>
                <button
                  onClick={() => {
                    router.push(entryDetailPath);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-caption font-semibold text-tint hover:bg-tint-subtle dark:hover:bg-tint/10 border-t border-border dark:border-dark-border transition-colors"
                >
                  <Maximize2 size={13} /> 상세 보기
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. 도서 정보 — 테두리만, 배경 없음 */}
      <Link href={bookDetailPath}>
        <div className="mx-4 mb-3 flex gap-4 rounded-xl p-3 border border-border dark:border-dark-border hover:border-border-strong dark:hover:border-dark-border transition-colors">
          <div className="relative w-[52px] h-[72px] shrink-0 rounded-lg overflow-hidden shadow-card-md">
            <Image
              src={book.cover_url || '/images/default-book-cover.png'}
              alt={book.title}
              fill
              className="object-cover"
              sizes="52px"
            />
          </div>
          <div className="flex flex-col justify-center gap-1.5 min-w-0">
            <div>
              <h3 className="text-body-sm font-bold text-label dark:text-label-invert line-clamp-1">
                {book.title}
              </h3>
              <p className="text-caption text-label-muted line-clamp-1">{book.author}</p>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tint-subtle dark:bg-tint/10 border border-tint/20 text-tint text-[11px] font-bold w-fit">
              📖 {readRange}
            </span>
          </div>
        </div>
      </Link>

      {/* 3. 독서 기록 본문 */}
      {entry.summary && entry.summary.trim() !== '' && (
        <div className="px-4 pb-3">
          <p
            className={`text-body-sm leading-relaxed text-label-sub dark:text-label-muted whitespace-pre-wrap ${
              !isExpanded ? 'line-clamp-4' : ''
            }`}
          >
            {entry.summary}
          </p>
          {entry.summary.length > 120 && !isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="mt-2 text-caption font-bold text-tint hover:text-tint-hover transition-colors"
            >
              ...더 보기
            </button>
          )}
          {isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="mt-2 text-caption font-medium text-label-muted hover:text-label-sub transition-colors"
            >
              접기
            </button>
          )}
        </div>
      )}

      {/* 4. 소셜 액션 바 */}
      <SocialActionBar
        entryId={entry.id}
        initialLikeCount={initialLikeCount}
        initialLiked={initialLiked}
        commentCount={commentCount}
        onCommentClick={() => setIsCommentOpen(true)}
      />

      <CommentBottomSheet
        entryId={entry.id}
        currentUserId={userId}
        isOpen={isCommentOpen}
        onClose={() => setIsCommentOpen(false)}
        onCountChange={setCommentCount}
      />
    </Card>
  );
}
