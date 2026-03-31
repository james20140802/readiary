'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from './ui/Card';
import SocialActionBar from './social/SocialActionBar';
import CommentBottomSheet from './comments/CommentBottomSheet';

import { Lock } from 'lucide-react';

interface EntryCardProps {
  id: string;
  summary: string;
  date: string;
  isPrivate?: boolean;
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
  isPrivate = false,
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

  const handleCardClick = () => {
    router.push(targetHref);
  };

  return (
    <Card className="!p-0 overflow-hidden transition-all hover:border-border-strong dark:hover:border-dark-border group">
      {/* 1. 콘텐츠 영역 */}
      <div className="p-5 pb-3 cursor-default">
        {summary && summary.trim() !== '' && (
          <div className="relative">
            <p
              className={`text-[15px] leading-relaxed text-label-sub dark:text-label-muted whitespace-pre-wrap ${
                !isExpanded ? 'line-clamp-4' : ''
              }`}
            >
              {summary}
            </p>
            {summary.length > 120 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="mt-1 text-[13px] font-bold text-label-muted hover:text-label-sub dark:hover:text-label-invert transition-colors"
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
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] text-label-muted tabular-nums">
              {new Date(date).toLocaleDateString()}
            </p>
            {isPrivate && <Lock size={10} className="text-label-muted/70" />}
          </div>
          <span className="text-[11px] font-bold text-label-muted group-hover/link:text-tint transition-colors">
            상세 보기 →
          </span>
        </div>
      </div>

      {/* 3. 하단 액션 바 */}
      <div className="border-t border-border dark:border-dark-border/50">
        <SocialActionBar
          entryId={id}
          initialLikeCount={initialLikeCount}
          initialLiked={initialLiked}
          commentCount={commentCount}
          onCommentClick={() => setIsCommentOpen(true)}
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
