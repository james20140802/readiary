'use client';

import { Comment } from '@/types/comments';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string; // 현재 로그인한 유저 ID
  onDelete: (id: string) => void;
  isReply?: boolean;
  onReplyClick?: () => void;
  /** 답글 묶음 — 이 댓글 아래 들여 쓴다 */
  children?: React.ReactNode;
}

const ACTION =
  'min-h-8 font-sans text-[13px] font-semibold text-ink-sub hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent';

/** 댓글 한 줄 — 이름(산세리프) 아래 말(부리), 그 아래 답글·지우기와 시각. 답글은 왼쪽 선 안으로 들여 쓴다 */
export default function CommentItem({
  comment,
  currentUserId,
  onDelete,
  isReply,
  onReplyClick,
  children,
}: CommentItemProps) {
  const isMyComment = currentUserId === comment.user_id;
  // 브라우저 타임존 기준 상대 시간. 서버/클라이언트 렌더 시각 차이로 문구가
  // 달라질 수 있어 해당 텍스트만 하이드레이션 경고를 억제한다.
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
    locale: ko,
  });

  return (
    <div
      className={
        isReply
          ? 'ml-[18px] mt-2 pl-3 pt-2 shadow-[inset_2px_0_0_rgb(var(--hairline))]'
          : 'border-t border-hairline py-3'
      }
    >
      <p className="font-sans text-[15px] font-semibold text-ink">
        {comment.profile.name}
        <span className="sr-only">
          {' '}
          @{comment.profile.nickname}
          {comment.profile.tag ? `#${comment.profile.tag}` : ''}
        </span>
      </p>
      <p className="mt-0.5 whitespace-pre-wrap font-serif text-[17px] leading-[1.55] text-ink">
        {comment.content}
      </p>
      <div className="mt-1 flex items-center gap-3">
        {!isReply && onReplyClick && (
          <button type="button" onClick={onReplyClick} className={ACTION}>
            답글
          </button>
        )}
        {isMyComment && (
          <button
            type="button"
            onClick={() => onDelete(comment.id)}
            className={ACTION}
            aria-label="이 댓글 지우기"
          >
            지우기
          </button>
        )}
        <time
          dateTime={comment.created_at}
          className="ml-auto font-sans text-[13px] font-medium text-ink-sub"
          suppressHydrationWarning
        >
          {timeAgo}
        </time>
      </div>
      {children}
    </div>
  );
}
