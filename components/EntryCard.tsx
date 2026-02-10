'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from './ui/Card';
import SocialActionBar from './social/SocialActionBar';
import CommentBottomSheet from './comments/CommentBottomSheet';

interface EntryCardProps {
  id: string;
  summary: string;
  date: string;
  userId?: string;
  href?: string;
  initialLikeCount?: number;
  initialCommentCount?: number;
  initialLiked?: boolean;
}

export default function EntryCard({
  id,
  summary,
  date,
  userId,
  href,
  initialLikeCount = 0,
  initialCommentCount = 0,
  initialLiked = false,
}: EntryCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(initialCommentCount);

  const targetHref = href ?? `/protected/entry/${id}`;

  // 카드 전체 클릭 핸들러 (버튼 클릭 시에는 동작 안 함)
  const handleCardClick = () => {
    router.push(targetHref);
  };

  return (
    <Card className="!p-0 overflow-hidden transition-all hover:border-zinc-300 dark:hover:border-zinc-600 group">
      {/* 1. 콘텐츠 영역: 더보기 클릭 시 이벤트 전파 차단 */}
      <div className="p-5 pb-3 cursor-default">
        {summary && summary.trim() !== '' && (
          <div className="relative">
            <p
              className={`text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap ${
                !isExpanded ? 'line-clamp-4' : ''
              }`}
            >
              {summary}
            </p>

            {summary.length > 120 && (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Link 이동 방지
                  setIsExpanded(!isExpanded);
                }}
                className="mt-1 text-[13px] font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                {isExpanded ? '접기' : '...더 보기'}
              </button>
            )}
          </div>
        )}

        {/* 2. 날짜 및 상세 이동 유도 영역 */}
        <div
          onClick={handleCardClick}
          className="mt-4 flex justify-between items-center cursor-pointer group/link"
        >
          <p className="text-[11px] text-zinc-400 tabular-nums">
            {new Date(date).toLocaleDateString()}
          </p>
          <span className="text-[11px] font-bold text-zinc-300 group-hover/link:text-tint transition-colors">
            상세 보기 →
          </span>
        </div>
      </div>

      {/* 3. 하단 액션 바 */}
      <div className="border-t border-zinc-50 dark:border-zinc-800/50">
        <SocialActionBar
          entryId={id}
          initialLikeCount={initialLikeCount}
          initialLiked={initialLiked}
          commentCount={commentCount}
          onCommentClick={() => {
            setIsCommentOpen(true);
          }}
        />
      </div>

      {/* 바텀시트 */}
      <CommentBottomSheet
        entryId={id}
        currentUserId={userId}
        isOpen={isCommentOpen}
        onClose={() => setIsCommentOpen(false)}
        onCountChange={setCommentCount}
      />
    </Card>
  );
}
