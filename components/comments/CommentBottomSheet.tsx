'use client';

import { apiFetch } from '@/lib/api/fetch';
import { useState, useEffect, useRef } from 'react';
import { useActionLock } from '@/hooks/useActionLock';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Comment } from '@/types/comments';
import CommentItem from './CommentItem';
import CommentInput from './CommentInput';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface Props {
  entryId: string;
  currentUserId?: string;
  isOpen: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

export default function CommentBottomSheet({
  entryId,
  currentUserId,
  isOpen,
  onClose,
  onCountChange,
}: Props) {
  const [loadAttempt, setLoadAttempt] = useState(0);
  const mutationVersion = useRef(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  const [deleteModalCommentId, setDeleteModalCommentId] = useState<string | null>(null);
  const deletion = useActionLock();
  const isDeleting = deletion.busy;
  const [isPosting, setIsPosting] = useState(false);
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

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!postingRef.current && !deletion.isLocked()) onClose();
              }}
              className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-card border border-hairline max-h-[90vh] rounded-t-[20px] flex flex-col w-full mx-auto sm:max-w-[640px] sm:bottom-4 sm:rounded-[24px]"
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
                <h3 className="text-section-title font-bold">댓글 {comments.length}</h3>
                <button
                  disabled={isPosting || isDeleting}
                  onClick={() => {
                    if (!postingRef.current && !deletion.isLocked()) onClose();
                  }}
                  className="p-1.5 bg-card-raised rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 리스트 영역 (스크롤) */}
              <div className="flex-1 overflow-y-auto px-5 py-2 custom-scrollbar min-h-[300px]">
                {isLoading ? (
                  <div className="py-10 text-center text-ink-faint text-caption">
                    기록을 불러오는 중...
                  </div>
                ) : comments.length > 0 ? (
                  <div className="divide-y divide-hairline">
                    {comments
                      .filter((c) => !c.parent_id)
                      .map((rootComment) => (
                        <div key={rootComment.id} className="flex flex-col">
                          {/* 부모 댓글 */}
                          <CommentItem
                            comment={rootComment}
                            currentUserId={currentUserId}
                            onDelete={handleDelete}
                            onReplyClick={() => {
                              if (!postingRef.current && !deletion.isLocked())
                                setReplyingTo(rootComment);
                            }} // 답글 달기 버튼 클릭 시
                          />

                          {/* 2. 해당 부모를 parent_id로 가지는 대댓글들 필터링 */}
                          <div className="ml-10 border-l-2 border-hairline">
                            {comments
                              .filter((reply) => reply.parent_id === rootComment.id)
                              .map((reply) => (
                                <CommentItem
                                  key={reply.id}
                                  comment={reply}
                                  currentUserId={currentUserId}
                                  onDelete={handleDelete}
                                  isReply // 대댓글임을 표시하는 prop (디자인 조정용)
                                />
                              ))}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-ink-faint text-caption">
                    아직 댓글이 없어요. 첫 인사를 남겨보세요!
                  </div>
                )}
              </div>

              {/* 고정 입력창 (Sticky) */}
              <div className="p-4 border-t border-hairline bg-card sm:rounded-b-[24px]">
                {!hasLoaded && !isLoading && (
                  <button
                    type="button"
                    className="text-caption underline"
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
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={!!deleteModalCommentId}
        onClose={() => {
          if (!deletion.isLocked()) setDeleteModalCommentId(null);
        }}
      >
        <div className="space-y-4">
          <h2 className="text-section-title font-bold text-ink">정말 삭제하시겠어요?</h2>
          <p className="text-caption text-ink-sub">이 작업은 되돌릴 수 없습니다.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" disabled={isDeleting} onClick={() => setDeleteModalCommentId(null)}>
              취소
            </Button>
            <Button size="sm" variant="danger" onClick={confirmDeleteComment} disabled={isDeleting}>
              {isDeleting ? '삭제 중...' : '삭제하기'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 에러 모달 */}
      <Modal isOpen={!!errorModalMessage} onClose={() => setErrorModalMessage(null)}>
        <div className="space-y-4">
          <h2 className="text-section-title font-bold text-ink">알림</h2>
          <p className="text-caption text-ink-sub">{errorModalMessage}</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" onClick={() => setErrorModalMessage(null)}>
              확인
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
