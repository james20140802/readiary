'use client';

import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Comment } from '@/types/comments';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getImageUrl } from '@/utils/profile';
import { Avatar } from '../ui/Avatar';

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string; // 현재 로그인한 유저 ID
  onDelete: (id: string) => void;
  isReply?: boolean;
  onReplyClick?: () => void;
}

export default function CommentItem({
  comment,
  currentUserId,
  onDelete,
  isReply,
  onReplyClick,
}: CommentItemProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');
  const isMyComment = currentUserId === comment.user_id;

  useEffect(() => {
    // 브라우저 타임존 기준으로 상대 시간 계산
    setTimeAgo(formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ko }));
  }, [comment.created_at]);

  return (
    <div
      className={`group flex gap-3 py-4 border-b border-zinc-50 dark:border-zinc-800/50 last:border-none ${isReply ? 'pl-4 pb-2' : 'py-4'}`}
    >
      {/* 1. 프로필 이미지 */}
      <div
        className={`relative w-9 h-9 overflow-hidden rounded-full shrink-0 bg-zinc-100 dark:bg-zinc-800 ${isReply ? 'w-7 h-7' : 'w-9 h-9'}`}
      >
        <Avatar
          alt={`${comment.profile.nickname}의 프로필 이미지`}
          fallbackText={comment.profile.nickname.charAt(0).toUpperCase()}
          src={getImageUrl(comment.profile.profile_image) || undefined}
          size="md"
        />
      </div>

      {/* 2. 댓글 본문 영역 */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-bold text-zinc-900 dark:text-zinc-100">
              {comment.profile.name}
            </span>
            {/* 닉네임과 태그 */}
            <span className="text-[12px] text-zinc-400 dark:text-zinc-500 font-medium">
              @{comment.profile.nickname}
              {comment.profile.tag && (
                <span className="text-[10px] opacity-70">#{comment.profile.tag}</span>
              )}
            </span>
            <span className="text-[11px] text-zinc-400 tabular-nums">{timeAgo || '...'}</span>
          </div>

          {/* 3. 삭제 버튼 (본인일 때만, 마우스 오버 시 노출) */}
          {isMyComment && (
            <button
              onClick={() => onDelete(comment.id)}
              className="p-1 text-zinc-300 hover:text-rose-500 transition-colors"
              title="댓글 삭제"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        <p className="text-[14.5px] text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {comment.content}
        </p>

        {/* 답글 달기 버튼 (대댓글이 아닐 때만 노출하거나, 인스타처럼 둘 다 노출 가능) */}
        {!isReply && (
          <button
            onClick={onReplyClick}
            className="text-[11px] font-bold text-zinc-400 hover:text-tint mt-1"
          >
            답글 달기
          </button>
        )}
      </div>
    </div>
  );
}
