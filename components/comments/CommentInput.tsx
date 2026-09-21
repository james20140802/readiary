'use client';
import { SessionExpiredError } from '@/lib/api/fetch';

import { useState, useRef, useEffect } from 'react';
import { useActionLock } from '@/hooks/useActionLock';
import { useCreationSubmission } from '@/hooks/useCreationSubmission';
import { Send } from 'lucide-react';
import { Comment } from '@/types/comments';

interface CommentInputProps {
  onCommentSubmit: (comment: Comment) => void;
  entryId: string;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  replyingTo?: Comment | null;
  onCancelReply?: () => void;
}

export default function CommentInput({
  onCommentSubmit,
  replyingTo,
  onCancelReply,
  entryId,
  disabled = false,
  onBusyChange,
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const action = useActionLock();
  const isSubmitting = action.busy;
  const creation = useCreationSubmission<{
    entryId: string;
    content: string;
    parentId: string | null;
  }>(`comment:${entryId}`, '/api/comments', 'client_comment_id');
  const cancelReply = useRef(onCancelReply);
  const replyAccount = useRef<string | null>(null);
  useEffect(() => {
    cancelReply.current = onCancelReply;
  });
  useEffect(() => {
    if (replyAccount.current && replyAccount.current !== creation.accountId)
      cancelReply.current?.();
    replyAccount.current = creation.accountId;
  }, [creation.accountId]);
  const [lastAccount, setLastAccount] = useState(creation.accountId);
  if (lastAccount !== creation.accountId) {
    setLastAccount(creation.accountId);
    setContent('');
  }
  const [restoredId, setRestoredId] = useState<string | null>(null);
  if (creation.snapshot && creation.snapshot.id !== restoredId) {
    setRestoredId(creation.snapshot.id);
    setContent(creation.snapshot.payload.content);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 비어있거나 공백만 있는 경우 방지
    if (!content.trim() || disabled || !creation.ready || !action.acquire()) return;

    onBusyChange?.(true);
    let leaving = false;
    try {
      const result = await creation.submit({ entryId, content, parentId: replyingTo?.id ?? null });
      if (!result) return;
      onCommentSubmit(result as unknown as Comment);
      setContent(''); // 성공 시 입력창 비우기
    } catch (error) {
      if (error instanceof SessionExpiredError) leaving = true;
      else console.error('댓글 전송 에러:', error);
    } finally {
      if (!leaving) {
        action.release();
        onBusyChange?.(false);
      }
    }
  };

  // 박스 대신 괘선 하나 — 종이의 줄 위에 쓰는 문법. 포커스하면 줄이 살짝 진해진다
  return (
    <div className="border-b border-hairline transition-colors focus-within:border-hairline-strong">
      {/* 답글 모드일 때 상단에 표시되는 바 */}
      {(creation.snapshot ? creation.snapshot.payload.parentId : replyingTo) && (
        <div className="flex items-center justify-between pb-1 animate-in fade-in slide-in-from-top-1">
          <p className="text-caption text-ink-sub">
            {creation.snapshot ? (
              '이전에 선택한 댓글에 답글을 남기는 중'
            ) : (
              <>
                <span className="font-bold text-accent">@{replyingTo?.profile.nickname}</span>님에게
                답글 남기는 중
              </>
            )}
          </p>
          <button
            type="button"
            onClick={onCancelReply}
            disabled={isSubmitting || !!creation.snapshot}
            className="text-button-sm text-ink-faint hover:text-ink-sub"
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
          className="flex-1 bg-transparent border-none outline-none text-input py-2.5 text-ink placeholder:text-ink-faint"
          disabled={disabled || isSubmitting || !creation.ready || !!creation.snapshot}
        />

        <button
          type="submit"
          disabled={!content.trim() || disabled || isSubmitting || !creation.ready}
          aria-label={creation.snapshot ? '저장 확인·재시도' : '댓글 남기기'}
          className={`p-1.5 transition-colors ${
            content.trim() && !isSubmitting ? 'text-accent' : 'text-ink-faint'
          }`}
        >
          <Send size={17} className={isSubmitting ? 'animate-pulse' : ''} />
        </button>
      </form>
      {creation.error && (
        <p role="alert" className="text-caption text-danger">
          {creation.error}
        </p>
      )}
      {creation.snapshot && !isSubmitting && (
        <p className="text-caption text-ink-sub">
          보내기 버튼을 눌러 이전 댓글의 저장을 확인해 주세요.
        </p>
      )}
    </div>
  );
}
