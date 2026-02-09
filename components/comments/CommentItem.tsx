'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { Comment } from '@/types/comments';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string; // 현재 로그인한 유저 ID
  onDelete: (id: string) => void;
}

export default function CommentItem({ comment, currentUserId, onDelete }: CommentItemProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');
  const isMyComment = currentUserId === comment.user_id;

  useEffect(() => {
    // 브라우저 타임존 기준으로 상대 시간 계산
    setTimeAgo(formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ko }));
  }, [comment.created_at]);

  return (
    <div className="group flex gap-3 py-4 border-b border-zinc-50 dark:border-zinc-800/50 last:border-none">
      {/* 1. 프로필 이미지 */}
      <div className="relative w-9 h-9 overflow-hidden rounded-full shrink-0 bg-zinc-100 dark:bg-zinc-800">
        {comment.profile.profile_image ? (
          <Image
            src={comment.profile.profile_image}
            alt={comment.profile.nickname}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-400">
            {comment.profile.name[0]}
          </div>
        )}
      </div>

      {/* 2. 댓글 본문 영역 */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-bold text-zinc-900 dark:text-zinc-100">
              {comment.profile.name}
            </span>
            <span className="text-[11px] text-zinc-400 tabular-nums">{timeAgo || '...'}</span>
          </div>

          {/* 3. 삭제 버튼 (본인일 때만, 마우스 오버 시 노출) */}
          {isMyComment && (
            <button
              onClick={() => onDelete(comment.id)}
              className="p-1 text-zinc-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
              title="댓글 삭제"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        <p className="text-[14.5px] text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {comment.content}
        </p>
      </div>
    </div>
  );
}
