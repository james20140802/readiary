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

  // 박스 대신 괘선 하나 — 종이의 줄 위에 쓰는 문법. 포커스하면 줄이 살짝 진해진다
  return (
    <div className="border-b border-hairline transition-colors focus-within:border-hairline-strong">
      {/* 답글 모드일 때 상단에 표시되는 바 */}
      {replyingTo && (
        <div className="flex items-center justify-between pb-1 animate-in fade-in slide-in-from-top-1">
          <p className="text-[12px] text-ink-sub">
            <span className="font-bold text-accent">@{replyingTo.profile.nickname}</span>님에게 답글
            남기는 중
          </p>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-[11px] text-ink-faint hover:text-ink-sub"
          >
            취소
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="칭찬과 응원은 큰 힘이 됩니다"
          className="flex-1 bg-transparent border-none outline-none text-[14px] py-2.5 text-ink placeholder:text-ink-faint"
          disabled={isSubmitting}
        />

        <button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          aria-label="댓글 남기기"
          className={`p-1.5 transition-colors ${
            content.trim() && !isSubmitting ? 'text-accent' : 'text-ink-faint'
          }`}
        >
          <Send size={17} className={isSubmitting ? 'animate-pulse' : ''} />
        </button>
      </form>
    </div>
  );
}
