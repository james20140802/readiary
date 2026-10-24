'use client';

import { useState } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { LikeState, useLike } from './useLike';

interface SocialActionBarProps {
  entryId: string;
  initialLikeCount: number;
  initialLiked: boolean;
  commentCount?: number;
  onCommentClick?: () => void;
  /** 전달하면 좋아요 숫자가 별도 버튼이 되어 좋아한 사람 명단을 연다 */
  onLikeCountClick?: () => void;
  showCommentCount?: boolean;
  /** true면 위에 헤어라인을 긋는다(기본). 간지 안에서는 false */
  border?: boolean;
  /** 같은 기록의 좋아요를 다른 곳과 함께 쓸 때 부모의 상태를 받는다 */
  like?: LikeState;
}

// 시안 .acts: 높이 44 알약, 15px 글자, 20px 아이콘, 보조 잉크색
const ACT =
  'inline-flex h-11 items-center gap-1.5 rounded-full px-2.5 font-sans text-[15px] font-medium tabular-nums ' +
  'transition-[color,transform] duration-150 ease-ink-out active:scale-[0.97] motion-reduce:active:scale-100 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent';

export function formatCount(count: number) {
  if (count >= 10000) return (count / 10000).toFixed(1).replace(/\.0$/, '') + '만';
  return count.toLocaleString();
}

export default function SocialActionBar({
  entryId,
  initialLikeCount,
  initialLiked,
  commentCount = 0,
  onCommentClick = () => {},
  onLikeCountClick,
  showCommentCount = true,
  border = true,
  like,
}: SocialActionBarProps) {
  const internalLike = useLike(entryId, initialLiked, initialLikeCount);
  const { isLiked, likeCount, isLoading, toggle } = like ?? internalLike;

  // 이 버튼으로 방금 좋아요를 켰는지 — 그때만 하트가 부푼다(globals.css .heart-pop)
  const [popped, setPopped] = useState(false);

  const handleLikeToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) setPopped(!isLiked);
    void toggle();
  };

  const likeTone = isLiked ? 'text-accent' : 'text-ink-sub hover:text-ink';

  return (
    <div
      className={`-ml-2.5 flex items-center gap-0.5 ${border ? 'mt-2 border-t border-hairline pt-1' : ''}`}
    >
      <button
        type="button"
        onClick={handleLikeToggle}
        aria-label={`좋아요 ${formatCount(likeCount)}개`}
        aria-pressed={isLiked}
        className={`${ACT} ${likeTone} ${isLoading ? 'cursor-progress' : ''}`}
      >
        <Heart
          aria-hidden="true"
          className={popped && isLiked ? 'heart-pop' : undefined}
          size={20}
          fill={isLiked ? 'currentColor' : 'none'}
          strokeWidth={1.75}
        />
        {!onLikeCountClick && <span>{formatCount(likeCount)}</span>}
      </button>
      {onLikeCountClick && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onLikeCountClick();
          }}
          aria-label={`좋아요 ${formatCount(likeCount)}개, 좋아한 사람 보기`}
          className={`${ACT} -ml-2 ${likeTone}`}
        >
          {formatCount(likeCount)}
        </button>
      )}

      <button
        type="button"
        aria-label={`댓글 ${formatCount(commentCount)}개 보기`}
        className={`${ACT} text-ink-sub hover:text-ink`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCommentClick();
        }}
      >
        <MessageCircle aria-hidden="true" size={20} strokeWidth={1.75} />
        {showCommentCount && <span>{formatCount(commentCount)}</span>}
      </button>
    </div>
  );
}
