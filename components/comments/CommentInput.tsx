'use client';
import { SessionExpiredError } from '@/lib/api/fetch';

import { useState, useRef, useEffect } from 'react';
import { useActionLock } from '@/hooks/useActionLock';
import { useCreationSubmission } from '@/hooks/useCreationSubmission';
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

  const replying = creation.snapshot ? creation.snapshot.payload.parentId : replyingTo;

  // 시안 .cin2 — 위에 헤어라인, 부리 글씨로 쓰는 한 줄과 먹색 "남기기"
  return (
    <div className="border-t border-hairline pt-3">
      {replying && (
        <div className="flex items-center justify-between gap-3 pb-1">
          <p className="font-sans text-[14px] font-medium text-ink-sub">
            {creation.snapshot ? (
              '이전에 고른 댓글에 답글을 남기는 중'
            ) : (
              <>
                <span className="font-semibold text-ink">{replyingTo?.profile.name}</span>에게 답글
                남기는 중
              </>
            )}
          </p>
          <button
            type="button"
            onClick={onCancelReply}
            disabled={isSubmitting || !!creation.snapshot}
            className="min-h-8 font-sans text-[14px] font-semibold text-accent disabled:opacity-40"
          >
            답글 그만두기
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={replying ? '답글 남기기' : '댓글 남기기'}
          aria-label={replying ? '답글' : '댓글'}
          className="h-11 min-w-0 flex-1 border-none bg-transparent font-serif text-[17px] text-ink outline-none placeholder:text-ink-faint"
          disabled={disabled || isSubmitting || !creation.ready || !!creation.snapshot}
        />
        <button
          type="submit"
          disabled={!content.trim() || disabled || isSubmitting || !creation.ready}
          className="inline-flex min-h-10 shrink-0 items-center rounded-full bg-ink px-4 font-sans text-button-sm text-ink-invert transition-[opacity,transform] duration-150 ease-ink-out active:scale-[0.97] disabled:opacity-40 motion-reduce:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {creation.snapshot ? '다시 남기기' : isSubmitting ? '남기는 중…' : '남기기'}
        </button>
      </form>
      {creation.error && (
        <p role="alert" className="mt-1 font-sans text-[14px] text-danger">
          {creation.error}
        </p>
      )}
      {creation.snapshot && !isSubmitting && (
        <p className="mt-1 font-sans text-[14px] text-ink-sub">
          &lsquo;다시 남기기&rsquo;를 누르면 이전 댓글이 저장됐는지 확인하고 이어서 남겨요.
        </p>
      )}
    </div>
  );
}
