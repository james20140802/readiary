'use client';

import { useState, useEffect } from 'react';
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  const [deleteModalCommentId, setDeleteModalCommentId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(null);

  // 1. 데이터 로딩
  useEffect(() => {
    if (!isOpen) return;
    async function load() {
      try {
        const res = await fetch(`/api/comments?entry_id=${entryId}`);
        const data = await res.json();
        setComments(data);
        onCountChange?.(data.length);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [entryId, isOpen]);

  // 2. 댓글 작성 (대댓글 포함)
  const handleAddComment = async (content: string) => {
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, content, parentId: replyingTo?.id || null }),
      });
      const newComment = await res.json();
      const updated = [...comments, newComment];
      setComments(updated);
      setReplyingTo(null);
      onCountChange?.(updated.length);
    } catch (e) {
      console.error(e);
      setErrorModalMessage('등록 실패');
    }
  };

  // 3. 댓글 삭제 (대댓글 포함 카운트 반영)
  const handleDelete = async (id: string) => {
    setDeleteModalCommentId(id);
  };

  const confirmDeleteComment = async () => {
    if (!deleteModalCommentId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/comments?id=${deleteModalCommentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      const updated = comments.filter(
        (c) => c.id !== deleteModalCommentId && c.parent_id !== deleteModalCommentId
      );
      setComments(updated);
      onCountChange?.(updated.length);
    } catch (e) {
      console.error(e);
      setErrorModalMessage('삭제 실패');
    } finally {
      setIsDeleting(false);
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
              onClick={onClose}
              className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-surface dark:bg-dark-surface shadow-2xl max-h-[90vh] rounded-t-[20px] flex flex-col w-full mx-auto sm:max-w-[640px] sm:bottom-4 sm:rounded-[24px]"
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle dark:border-dark-border">
                <h3 className="text-[16px] font-bold">댓글 {comments.length}</h3>
                <button
                  onClick={onClose}
                  className="p-1.5 bg-surface-raised dark:bg-dark-raised rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 리스트 영역 (스크롤) */}
              <div className="flex-1 overflow-y-auto px-5 py-2 custom-scrollbar min-h-[300px]">
                {isLoading ? (
                  <div className="py-10 text-center text-label-muted text-sm">
                    기록을 불러오는 중...
                  </div>
                ) : comments.length > 0 ? (
                  <div className="divide-y divide-border-subtle dark:divide-dark-border">
                    {comments
                      .filter((c) => !c.parent_id)
                      .map((rootComment) => (
                        <div key={rootComment.id} className="flex flex-col">
                          {/* 부모 댓글 */}
                          <CommentItem
                            comment={rootComment}
                            currentUserId={currentUserId}
                            onDelete={handleDelete}
                            onReplyClick={() => setReplyingTo(rootComment)} // 답글 달기 버튼 클릭 시
                          />

                          {/* 2. 해당 부모를 parent_id로 가지는 대댓글들 필터링 */}
                          <div className="ml-10 border-l-2 border-border-subtle dark:border-dark-border">
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
                  <div className="py-12 text-center text-label-muted text-[14px]">
                    아직 댓글이 없어요. 첫 인사를 남겨보세요! 💬
                  </div>
                )}
              </div>

              {/* 고정 입력창 (Sticky) */}
              <div className="p-4 border-t border-border-subtle dark:border-dark-border bg-surface dark:bg-dark-surface sm:rounded-b-[24px]">
                <CommentInput
                  onCommentSubmit={handleAddComment}
                  replyingTo={replyingTo}
                  onCancelReply={() => setReplyingTo(null)}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 삭제 확인 모달 */}
      <Modal isOpen={!!deleteModalCommentId} onClose={() => setDeleteModalCommentId(null)}>
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-label dark:text-label-invert">
            정말 삭제하시겠어요?
          </h2>
          <p className="text-sm text-secondary dark:text-label-muted">
            이 작업은 되돌릴 수 없습니다.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" onClick={() => setDeleteModalCommentId(null)}>
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
          <h2 className="text-lg font-bold text-label dark:text-label-invert">알림</h2>
          <p className="text-sm text-secondary dark:text-label-muted">{errorModalMessage}</p>
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
