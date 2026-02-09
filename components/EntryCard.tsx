'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(initialCommentCount);

  return (
    <Card className="!p-0 overflow-hidden transition-all hover:border-zinc-300 dark:hover:border-zinc-600">
      <Link href={href ?? `/protected/entry/${id}`} className="block p-5 pb-3">
        {summary && summary.trim() !== '' && (
          <div>
            <p
              className={`text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap ${
                !isExpanded ? 'line-clamp-4' : ''
              }`}
            >
              {summary}
            </p>

            {/* 5줄 이상의 텍스트일 때만 '더 보기' 버튼 노출 (임계점은 유동적) */}
            {summary.length > 120 && !isExpanded && (
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
        <p className="mt-3 text-[11px] text-zinc-400 tabular-nums">
          {new Date(date).toLocaleDateString()}
        </p>
      </Link>

      {/* 3. 하단 액션 바: 클릭 이벤트 전파 방지 처리 */}
      <SocialActionBar
        entryId={id}
        initialLikeCount={initialLikeCount}
        initialLiked={initialLiked}
        commentCount={commentCount}
        onCommentClick={() => setIsCommentOpen(true)}
      />
      {/* 바텀시트 배치 */}
      <CommentBottomSheet
        entryId={id}
        currentUserId={userId}
        isOpen={isCommentOpen}
        onClose={() => setIsCommentOpen(false)}
        onCountChange={setCommentCount} // 댓글 작성/삭제 시 피드의 숫자도 동기화
      />
    </Card>
  );
}
