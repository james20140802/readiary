'use client';

import { Heart, MessageCircle } from 'lucide-react';
import { LikeState, useLike } from './useLike';

interface SocialActionBarProps {
  entryId: string;
  initialLikeCount: number;
  initialLiked: boolean;
  commentCount?: number;
  onCommentClick?: () => void;
  /** 전달하면 좋아요 숫자가 별도 버튼이 되어 명단(대출카드)을 연다 */
  onLikeCountClick?: () => void;
  showCommentCount?: boolean;
  border?: boolean;
  /** 액션 바가 한 기록의 여러 면(엽서 앞·뒷면)에 놓일 때 부모의 상태를 공유한다 */
  like?: LikeState;
}

export default function SocialActionBar({
  entryId,
  initialLikeCount,
  initialLiked,
  commentCount: initialCommentCount = 0,
  onCommentClick = () => {},
  onLikeCountClick,
  showCommentCount = true,
  border = true,
  like,
}: SocialActionBarProps) {
  const internalLike = useLike(entryId, initialLiked, initialLikeCount);
  const { isLiked, likeCount, isLoading, toggle } = like ?? internalLike;

  const handleLikeToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void toggle();
  };

  const formatCount = (count: number) => {
    if (count >= 10000) return (count / 10000).toFixed(1).replace(/\.0$/, '') + '만';
    return count.toLocaleString();
  };

  return (
    <div
      className={`${border && 'flex items-center px-5 py-2.5 border-t border-hairline bg-card-raised/30'}`}
    >
      <div className="flex items-center gap-4">
        {/* 좋아요 버튼 — 하트는 토글, 숫자는(콜백이 있으면) 명단 열기 */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleLikeToggle}
            aria-label={isLiked ? '좋아요 취소' : '좋아요'}
            className={`flex items-center gap-1.5 transition-all active:scale-90 ${
              isLiked ? 'text-accent' : 'text-ink-faint hover:text-accent'
            } ${isLoading ? 'cursor-progress' : ''}`}
          >
            <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} strokeWidth={1.75} />
            {!onLikeCountClick && (
              <span className="text-caption font-medium tabular-nums">
                {formatCount(likeCount)}
              </span>
            )}
          </button>
          {onLikeCountClick && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onLikeCountClick();
              }}
              aria-label="좋아요 명단 보기"
              className={`text-caption font-medium tabular-nums transition-colors ${
                isLiked ? 'text-accent' : 'text-ink-faint hover:text-ink-sub'
              }`}
            >
              {formatCount(likeCount)}
            </button>
          )}
        </div>

        {/* 댓글 버튼 (나중에 여기서 댓글 리스트 토글 로직을 추가하면 됩니다) */}
        <button
          className="flex items-center gap-1.5 text-ink-faint hover:text-accent transition-all active:scale-95"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCommentClick();
          }}
        >
          <MessageCircle size={18} strokeWidth={1.75} />
          {showCommentCount && (
            <span className="text-caption font-medium tabular-nums">
              {formatCount(initialCommentCount)}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
