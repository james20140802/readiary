'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Heart, MessageCircle, MoreHorizontal } from 'lucide-react'; // 아이콘 통일
import { DetailSocialFeedEntry } from '@/types/entry';
import Card from '@/components/ui/Card';

interface Props {
  item: DetailSocialFeedEntry;
}

export default function DetailSocialFeedItem({ item }: Props) {
  const { profile, entry, initialLikeCount, initialLiked } = item;
  const { book } = entry;

  // 1. 상태 관리
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLoading, setIsLoading] = useState(false);

  // 2. 좋아요 토글 핸들러 (낙관적 업데이트 적용)
  const handleLikeToggle = async () => {
    if (isLoading) return; // 연속 클릭 방지

    // [Step 1] 이전 상태 저장 (롤백용)
    const prevLiked = isLiked;
    const prevCount = likeCount;

    // [Step 2] UI 즉시 업데이트 (낙관적)
    setIsLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);
    setIsLoading(true);

    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: entry.id }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      // 성공 시 서버에서 최종 상태를 확인하고 싶다면 아래 주석 해제
      const result = await response.json();
      setIsLiked(result.liked);
    } catch (error) {
      // [Step 3] 에러 발생 시 롤백
      console.error('Like failed:', error);
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setIsLoading(false);
    }
  };

  // 읽은 페이지 계산
  const readRange =
    entry.from_page && entry.to_page
      ? `${entry.from_page}p → ${entry.to_page}p`
      : `${entry.to_page || entry.from_page}p까지`;

  return (
    <Card aria-label="상세 소셜 피드 항목" className="py-6 !p-0 overflow-hidden" hoverable={false}>
      {/* 1. 헤더: 유저 정보 */}
      <div className="flex items-center justify-between p-5 pb-3">
        <Link
          href={`/protected/social/u/${profile.nickname}-${profile.tag}`}
          className="flex items-center gap-3 group"
        >
          <div className="relative w-11 h-11 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            {profile.profile_image ? (
              <Image
                src={profile.profile_image}
                alt={profile.nickname}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold">
                {profile.nickname[0]}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:underline">
                {profile.name}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              {formatDistanceToNow(new Date(entry.date), { addSuffix: true, locale: ko })}
            </p>
          </div>
        </Link>
        <button className="text-zinc-400 hover:text-zinc-600 p-2 hover:bg-zinc-50 rounded-full transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* 2. 유저 코멘트 (SNS 본문 스타일로 상단 배치) */}
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

      {/* 3. 콘텐츠: 독서 기록 카드 */}
      {entry.summary && entry.summary.trim() !== '' && (
        <div className="px-5 pb-4">
          <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
            {entry.summary}
          </p>
        </div>
      )}

      {/* 4. 하단 액션 바 */}
      <div className="flex items-center px-5 py-3 border-t border-zinc-50 dark:border-zinc-800">
        {/* 좋아요 버튼 영역: 고정 너비를 주어 댓글 버튼 밀림 방지 */}
        <div className="flex items-center w-[70px]">
          <button
            onClick={handleLikeToggle}
            disabled={isLoading}
            className={`flex items-center gap-1.5 transition-all active:scale-90 ${
              isLiked ? 'text-rose-500' : 'text-zinc-500 hover:text-rose-500'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Heart
              size={20}
              fill={isLiked ? 'currentColor' : 'none'}
              strokeWidth={isLiked ? 0 : 2}
              className="shrink-0" // 아이콘 크기 고정
            />

            {/* 숫자가 바뀔 때 옆으로 밀리지 않도록 고정 폭 확보 */}
            <span className="text-xs font-bold min-w-[12px] text-left">
              {likeCount > 0 ? likeCount : '좋아요'}
            </span>
          </button>
        </div>

        {/* 댓글 버튼 영역 */}
        <button className="flex items-center gap-1.5 text-zinc-500 hover:text-tint transition-colors ml-2">
          <MessageCircle size={20} className="shrink-0" />
          <span className="text-xs font-bold">댓글</span>
        </button>
      </div>
    </Card>
  );
}
