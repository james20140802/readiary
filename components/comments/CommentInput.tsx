'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Comment } from '@/types/comments';

interface CommentInputProps {
  onCommentSubmit: (content: string) => Promise<void>;
  replyingTo?: Comment | null;
  onCancelReply?: () => void;
}

export default function CommentInput({
  onCommentSubmit,
  replyingTo,
  onCancelReply,
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 비어있거나 공백만 있는 경우 방지
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onCommentSubmit(content);
      setContent(''); // 성공 시 입력창 비우기
    } catch (error) {
      console.error('댓글 전송 에러:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* 답글 모드일 때 상단에 표시되는 바 */}
      {replyingTo && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-surface-raised dark:bg-dark-raised rounded-t-xl border-b border-surface dark:border-dark-border animate-in slide-in-from-bottom-2">
          <p className="text-[12px] text-label-sub">
            <span className="font-bold text-tint">@{replyingTo.profile.nickname}</span>님에게 답글
            남기는 중
          </p>
          <button onClick={onCancelReply} className="text-[11px] text-label-muted hover:text-label-sub">
            취소
          </button>
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center gap-3 bg-surface-raised dark:bg-dark-raised/50 p-2 pl-4 rounded-2xl border border-border-subtle dark:border-dark-border focus-within:border-tint/50 transition-all"
      >
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="칭찬과 응원은 큰 힘이 됩니다 ✍️"
          className="flex-1 bg-transparent border-none outline-none text-[14px] py-1.5 text-label-sub dark:text-label-invert placeholder:text-label-muted"
          disabled={isSubmitting}
        />

        <button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          className={`p-2 rounded-xl transition-all ${
            content.trim() && !isSubmitting
              ? 'text-tint bg-tint/10'
              : 'text-label-muted bg-transparent'
          }`}
        >
          <Send size={18} className={isSubmitting ? 'animate-pulse' : ''} />
        </button>
      </form>
    </div>
  );
}
