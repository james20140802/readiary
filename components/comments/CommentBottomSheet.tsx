'use client';

import { apiFetch } from '@/lib/api/fetch';
import { useState, useEffect, useRef } from 'react';
import { useActionLock } from '@/hooks/useActionLock';
import { AnimatePresence } from 'framer-motion';
import { useFold } from '@/hooks/useFold';
import { FoldDiv, FoldList } from '@/components/ui/FoldList';
import { Comment } from '@/types/comments';
import CommentItem from './CommentItem';
import CommentInput from './CommentInput';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';

interface Props {
  entryId: string;
  currentUserId?: string;
  isOpen: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
  /** 시트 머리 아래에 한 줄로 보이는 맥락(어느 문장에 단 댓글인지) */
  context?: string;
}

export default function CommentBottomSheet({
  entryId,
  currentUserId,
  isOpen,
  onClose,
  onCountChange,
  context,
}: Props) {
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

  // 1. 데이터 로딩
  useEffect(() => {
    if (!isOpen) return;
    async function load() {
      const version = mutationVersion.current;
      try {
        const res = await apiFetch(`/api/comments?entry_id=${entryId}`);
        if (!res.ok) throw new Error('댓글을 불러오지 못했어요.');
        const data = await res.json();
        if (version !== mutationVersion.current) return;
        setComments(data);
        setHasLoaded(true);
        onCountChange?.(data.length);
      } catch {
        setErrorModalMessage('댓글을 불러오지 못했어요. 다시 불러오기를 눌러 주세요.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [entryId, isOpen, loadAttempt]);

  // 2. 댓글 작성 (대댓글 포함)
  const handleAddComment = (newComment: Comment) => {
    mutationVersion.current++;
    setHasLoaded(true);
    setComments((previous) => [...previous.filter((c) => c.id !== newComment.id), newComment]);
    setReplyingTo(null);
  };
  useEffect(() => {
    if (hasLoaded) onCountChange?.(comments.length);
  }, [comments, onCountChange, hasLoaded]);

  // 3. 댓글 삭제 (대댓글 포함 카운트 반영)
  const handleDelete = async (id: string) => {
    if (!postingRef.current && !deletion.isLocked()) setDeleteModalCommentId(id);
  };

  const confirmDeleteComment = async () => {
    if (!deleteModalCommentId || postingRef.current || !deletion.acquire()) return;
    try {
      mutationVersion.current++;
      const res = await apiFetch(`/api/comments?id=${deleteModalCommentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      const updated = comments.filter(
        (c) => c.id !== deleteModalCommentId && c.parent_id !== deleteModalCommentId
      );
      setComments(updated);
      onCountChange?.(updated.length);
    } catch (e) {
      console.error(e);
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

  const requestClose = () => {
    if (!postingRef.current && !deletion.isLocked()) onClose();
  };
  const roots = comments.filter((c) => !c.parent_id);

  return (
    <>
      <Sheet open={isOpen} onClose={requestClose} title={`댓글 ${comments.length}`}>
        {context && (
          <p className="pb-3 font-serif text-[16px] leading-[1.6] text-ink-sub">{context}</p>
        )}
        <div className="min-h-[160px]">
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
              {roots.map((rootComment) => (
                <FoldDiv key={rootComment.id} {...fold}>
                  <CommentItem
                    comment={rootComment}
                    currentUserId={currentUserId}
                    onDelete={handleDelete}
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
                              onDelete={handleDelete}
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

        {/* 입력줄은 목록이 길어도 시트 아래에 붙어 있다 */}
        <div className="sticky bottom-0 -mx-[22px] bg-sheet px-[22px] pb-1">
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
          <CommentInput
            onCommentSubmit={handleAddComment}
            entryId={entryId}
            disabled={isDeleting || !hasLoaded}
            onBusyChange={onPosting}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
          />
        </div>
      </Sheet>

      {/* 지우기 확인 */}
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

      {/* 오류 안내 */}
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
    </>
  );
}
