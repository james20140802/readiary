'use client';

import { apiFetch } from '@/lib/api/fetch';
import { useState, useEffect, useRef } from 'react';
import { useActionLock } from '@/hooks/useActionLock';
import { useFold } from '@/hooks/useFold';
import { AnimatePresence } from 'framer-motion';
import { FoldDiv, FoldList } from '@/components/ui/FoldList';
import { Comment } from '@/types/comments';
import CommentItem from './CommentItem';
import CommentInput from './CommentInput';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface CommentSectionProps {
  entryId: string;
  currentUserId?: string;
  onCountChange?: (count: number) => void;
  hideInput?: boolean;
}

export default function CommentSection({
  entryId,
  currentUserId,
  onCountChange = () => {},
  hideInput = false,
}: CommentSectionProps) {
  const [loadAttempt, setLoadAttempt] = useState(0);
  const mutationVersion = useRef(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  const [deleteModalCommentId, setDeleteModalCommentId] = useState<string | null>(null);
  const deletion = useActionLock();
  // 지운 댓글은 접히며 빠지고 아래 댓글이 그만큼 올라온다(이미 있던 댓글과 새 댓글은 그 자리에 놓인다)
  const fold = useFold();
  const isDeleting = deletion.busy;
  const [, setIsPosting] = useState(false);
  const postingRef = useRef(false);
  const onPosting = (busy: boolean) => {
    postingRef.current = busy;
    setIsPosting(busy);
  };
  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(null);

  // 1. GET: 댓글 목록 불러오기
  useEffect(() => {
    async function loadComments() {
      const version = mutationVersion.current;
      try {
        const res = await apiFetch(`/api/comments?entry_id=${entryId}`);
        if (!res.ok) throw new Error('불러오기 실패');
        const data = await res.json();
        if (version !== mutationVersion.current) return;
        setComments(data);
        setHasLoaded(true);
        onCountChange(data.length);
      } catch (error) {
        console.error('댓글 로딩 에러:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadComments();
  }, [entryId, loadAttempt]);

  // 2. POST: 댓글 추가
  const handleAddComment = (newComment: Comment) => {
    mutationVersion.current++;
    setHasLoaded(true);
    setComments((previous) => [...previous.filter((c) => c.id !== newComment.id), newComment]);
    setReplyingTo(null);
  };
  useEffect(() => {
    if (hasLoaded) onCountChange?.(comments.length);
  }, [comments, onCountChange, hasLoaded]);

  // 3. DELETE: 댓글 삭제
  const handleDeleteComment = async (id: string) => {
    if (!postingRef.current && !deletion.isLocked()) setDeleteModalCommentId(id);
  };

  const confirmDeleteComment = async () => {
    if (!deleteModalCommentId || postingRef.current || !deletion.acquire()) return;

    try {
      mutationVersion.current++;
      const res = await apiFetch(`/api/comments?id=${deleteModalCommentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');

      const updatedComments = comments.filter(
        (c) => c.id !== deleteModalCommentId && c.parent_id !== deleteModalCommentId
      );

      setComments(updatedComments);
      onCountChange?.(updatedComments.length);
    } catch (error) {
      console.error('댓글 삭제 에러:', error);
      try {
        const response = await apiFetch(`/api/comments?entry_id=${entryId}`);
        if (!response.ok) throw new Error('조회 실패');
        const latest: Comment[] = await response.json();
        setComments(latest);
        setHasLoaded(true);
        if (latest.some((comment) => comment.id === deleteModalCommentId))
          setErrorModalMessage('삭제 결과를 확인하지 못했어요. 현재 목록을 확인해 주세요.');
      } catch {
        setErrorModalMessage(
          '삭제 결과를 확인하지 못했어요. 새로고침해 현재 목록을 확인해 주세요.'
        );
      }
    } finally {
      deletion.release();
      setDeleteModalCommentId(null);
    }
  };
  return (
    <div className="mt-10">
      <h3 className="font-sans text-overline text-ink-sub">
        댓글 <span className="tabular-nums">{comments.length}</span>
      </h3>

      <div className="mt-2 min-h-[100px]">
        {isLoading ? (
          <p role="status" className="py-10 text-center font-sans text-caption text-ink-sub">
            댓글을 불러오는 중…
          </p>
        ) : (
          <FoldList
            isEmpty={comments.length === 0}
            empty={
              <p className="border-t border-hairline py-10 text-center font-sans text-caption text-ink-sub">
                아직 댓글이 없어요. 처음으로 한마디 남겨 보세요.
              </p>
            }
          >
            {comments
              .filter((c) => !c.parent_id)
              .map((rootComment) => (
                <FoldDiv key={rootComment.id} {...fold}>
                  <CommentItem
                    comment={rootComment}
                    currentUserId={currentUserId}
                    onDelete={handleDeleteComment}
                    onReplyClick={() => {
                      if (!postingRef.current && !deletion.isLocked()) setReplyingTo(rootComment);
                    }}
                  >
                    <AnimatePresence initial={false}>
                      {comments
                        .filter((reply) => reply.parent_id === rootComment.id)
                        .map((reply) => (
                          <FoldDiv key={reply.id} {...fold}>
                            <CommentItem
                              comment={reply}
                              currentUserId={currentUserId}
                              onDelete={handleDeleteComment}
                              isReply
                            />
                          </FoldDiv>
                        ))}
                    </AnimatePresence>
                  </CommentItem>
                </FoldDiv>
              ))}
          </FoldList>
        )}
      </div>

      <div className="pt-2">
        {!hasLoaded && !isLoading && (
          <button
            type="button"
            className="mb-2 min-h-11 font-sans text-button-sm text-accent"
            onClick={() => {
              setIsLoading(true);
              setLoadAttempt((n) => n + 1);
            }}
          >
            댓글 다시 불러오기
          </button>
        )}
        {!hideInput && (
          <CommentInput
            onCommentSubmit={handleAddComment}
            entryId={entryId}
            disabled={isDeleting || !hasLoaded}
            onBusyChange={onPosting}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
          />
        )}
      </div>

      {/* 삭제 확인 모달 */}
      <Modal
        ariaLabel="이 댓글을 지울까요?"
        isOpen={!!deleteModalCommentId}
        onClose={() => {
          if (!deletion.isLocked()) setDeleteModalCommentId(null);
        }}
      >
        <div className="space-y-4">
          <h2 className="font-sans text-[18px] font-bold text-ink">이 댓글을 지울까요?</h2>
          <p className="font-sans text-body-sm text-ink-sub">
            답글도 함께 지워지고, 되돌릴 수 없어요.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={isDeleting}
              onClick={() => setDeleteModalCommentId(null)}
            >
              그대로 두기
            </Button>
            <Button size="sm" variant="danger" onClick={confirmDeleteComment} disabled={isDeleting}>
              {isDeleting ? '지우는 중…' : '지우기'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 에러 모달 */}
      <Modal
        ariaLabel="댓글 안내"
        isOpen={!!errorModalMessage}
        onClose={() => setErrorModalMessage(null)}
      >
        <div className="space-y-4">
          <p className="font-sans text-body text-ink">{errorModalMessage}</p>
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => setErrorModalMessage(null)}>
              확인
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
