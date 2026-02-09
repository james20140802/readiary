'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MoreHorizontal } from 'lucide-react'; // 아이콘 통일
import { DetailSocialFeedEntry } from '@/types/entry';
import Card from '@/components/ui/Card';
import SocialActionBar from '@/components/social/SocialActionBar';

interface Props {
  item: DetailSocialFeedEntry;
}

export default function DetailSocialFeedItem({ item }: Props) {
  const { profile, entry, initialLikeCount, initialLiked } = item;
  const { book } = entry;

  // 1. 상태 관리

  const [isExpanded, setIsExpanded] = useState(false);

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
      {/* 3. 콘텐츠: 독서 기록 (줄임 및 더보기 기능 추가) */}
      {entry.summary && entry.summary.trim() !== '' && (
        <div className="px-5 pb-4">
          <p
            className={`text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap ${
              !isExpanded ? 'line-clamp-4' : ''
            }`}
          >
            {entry.summary}
          </p>

          {/* 5줄 이상의 텍스트일 때만 '더 보기' 버튼 노출 (임계점은 유동적) */}
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

      {/* 4. 하단 액션 바 */}
      <SocialActionBar
        entryId={entry.id}
        initialLikeCount={initialLikeCount}
        initialLiked={initialLiked}
        initialCommentCount={0}
      />
    </Card>
  );
}
