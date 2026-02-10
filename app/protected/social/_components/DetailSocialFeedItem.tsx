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

  // 시간대 설정
  const timeZone = 'Asia/Seoul';
  const now = toZonedTime(new Date(), timeZone);
  const targetDate = toZonedTime(new Date(entry.created_at), timeZone);

  // 상태 관리
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // 드롭다운 바깥 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // 경로 설정
  const userProfilePath = `/protected/social/u/${profile.nickname}-${profile.tag}`;
  const bookDetailPath = `/protected/social/u/${profile.nickname}-${profile.tag}/books/${book.id}`;
  const entryDetailPath = `/protected/social/u/${profile.nickname}-${profile.tag}/entry/${entry.id}`;

  const readRange =
    entry.from_page && entry.to_page
      ? `${entry.from_page}p → ${entry.to_page}p`
      : `${entry.to_page || entry.from_page}p까지`;

  return (
    <Card
      aria-label="상세 소셜 피드 항목"
      className="py-6 !p-0 overflow-hidden relative"
      hoverable={false}
    >
      {/* 1. 헤더: 유저 정보 및 드롭다운 메뉴 */}
      <div className="flex items-center justify-between p-5 pb-3">
        <Link href={userProfilePath} className="flex items-center gap-3 group">
          <Avatar
            alt={`${profile.nickname}의 프로필 이미지`}
            fallbackText={profile.nickname.charAt(0).toUpperCase()}
            src={getImageUrl(profile.profile_image) || undefined}
            size="md"
          />

          <div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:underline">
                {profile.name}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              {formatDistance(targetDate, now, { addSuffix: true, locale: ko })}
            </p>
          </div>
        </Link>

        {/* 드롭다운 메뉴 영역 */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-zinc-400 hover:text-zinc-600 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <MoreHorizontal size={20} />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
              <button
                onClick={() => router.push(userProfilePath)}
                className="flex items-center gap-2 w-full px-3.5 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left text-[13px] font-medium transition-colors"
              >
                <User size={14} className="text-zinc-400" /> 프로필 방문
              </button>
              <button
                onClick={() => router.push(bookDetailPath)}
                className="flex items-center gap-2 w-full px-3.5 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left text-[13px] font-medium transition-colors"
              >
                <BookOpen size={14} className="text-zinc-400" /> 도서 정보
              </button>
              <button
                onClick={() => router.push(entryDetailPath)}
                className="flex items-center gap-2 w-full px-3.5 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left text-[13px] font-semibold border-t border-zinc-50 dark:border-zinc-800 text-tint transition-colors"
              >
                <Maximize2 size={14} /> 상세 보기
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. 도서 정보 섹션 */}
      <div className="mx-5 mb-5 flex gap-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-zinc-100/50 dark:border-zinc-700/30">
        <div className="relative w-20 h-28 shrink-0 shadow-lg rotate-[-2deg] transition-transform hover:rotate-0">
          <Image
            src={book.cover_url || '/images/default-book-cover.png'}
            alt={book.title}
            fill
            className="rounded-md object-cover"
          />
        </div>
        <div className="flex flex-col justify-center">
          <div className="mb-2">
            <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 line-clamp-1">
              {book.title}
            </h3>
            <p className="text-xs text-zinc-500 line-clamp-1">{book.author}</p>
          </div>
          <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-tint text-[11px] font-bold w-fit">
            📖 {readRange}
          </div>
        </div>
      </div>

      {/* 3. 독서 기록 요약 (더보기/접기 포함) */}
      {entry.summary && entry.summary.trim() !== '' && (
        <div className="px-5 pb-4">
          <p
            className={`text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap ${
              !isExpanded ? 'line-clamp-4' : ''
            }`}
          >
            {entry.summary}
          </p>

          {entry.summary.length > 120 && !isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="mt-1 text-[13px] font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              ...더 보기
            </button>
          )}

          {isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="mt-2 text-[12px] font-medium text-zinc-400 hover:underline"
            >
              접기
            </button>
          )}
        </div>
      )}

      {/* 4. 하단 소셜 액션 바 */}
      <SocialActionBar
        entryId={entry.id}
        initialLikeCount={initialLikeCount}
        initialLiked={initialLiked}
        commentCount={commentCount}
        onCommentClick={() => setIsCommentOpen(true)}
      />

      {/* 댓글 바텀시트 */}
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
