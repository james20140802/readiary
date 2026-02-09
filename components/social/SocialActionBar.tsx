'use client';

import { useState } from 'react';
import { Heart, MessageCircle } from 'lucide-react';

interface SocialActionBarProps {
  entryId: string;
  initialLikeCount: number;
  initialLiked: boolean;
  initialCommentCount?: number;
  onCommentClick?: () => void;
  showCommentCount?: boolean;
  border?: boolean;
}

export default function SocialActionBar({
  entryId,
  initialLikeCount,
  initialLiked,
  initialCommentCount = 0,
  onCommentClick = () => {},
  showCommentCount = true,
  border = true,
}: SocialActionBarProps) {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLoading, setIsLoading] = useState(false);

  // 좋아요 로직 (공통 사용)
  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
        body: JSON.stringify({ entryId }),
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

  const formatCount = (count: number) => {
    if (count >= 10000) return (count / 10000).toFixed(1).replace(/\.0$/, '') + '만';
    return count.toLocaleString();
  };

  return (
    <div
      className={`${border && 'flex items-center px-5 py-2.5 border-t border-zinc-50 dark:border-zinc-800/50 bg-zinc-50/30 dark:bg-zinc-800/10'}`}
    >
      <div className="flex items-center gap-4">
        {/* 좋아요 버튼 */}
        <button
          onClick={handleLikeToggle}
          className={`flex items-center gap-1.5 transition-all active:scale-90 hover:text-rose-500 ${
            isLiked ? 'text-rose-500' : 'text-zinc-400 hover:text-rose-500'
          } ${isLoading ? 'cursor-progress' : ''}`}
        >
          <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} strokeWidth={2} />
          <span className="text-[12.5px] font-extrabold tabular-nums">
            {formatCount(likeCount)}
          </span>
        </button>

        {/* 댓글 버튼 (나중에 여기서 댓글 리스트 토글 로직을 추가하면 됩니다) */}
        <button
          className="flex items-center gap-1.5 text-zinc-400 hover:text-tint transition-all active:scale-95"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCommentClick();
          }}
        >
          <MessageCircle size={18} strokeWidth={2} />
          {showCommentCount && (
            <span className="text-[12.5px] font-extrabold tabular-nums">
              {formatCount(initialCommentCount)}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
