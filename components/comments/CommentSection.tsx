'use client';

import { useState, useEffect } from 'react';
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  const [deleteModalCommentId, setDeleteModalCommentId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(null);

  // 1. GET: 댓글 목록 불러오기
  useEffect(() => {
    async function loadComments() {
      try {
        const res = await fetch(`/api/comments?entry_id=${entryId}`);
        if (!res.ok) throw new Error('불러오기 실패');
        const data = await res.json();
        setComments(data);
        onCountChange(data.length);
      } catch (error) {
        console.error('댓글 로딩 에러:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadComments();
  }, [entryId]);

  // 2. POST: 댓글 추가
  const handleAddComment = async (content: string) => {
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, content, parentId: replyingTo?.id }),
      });

      if (!res.ok) throw new Error('작성 실패');
      const newComment = await res.json();

      const updatedComments = [...comments, newComment];
      setComments(updatedComments);
      setReplyingTo(null);
      onCountChange?.(updatedComments.length);
    } catch (error) {
      console.error('댓글 추가 에러:', error);
      setErrorModalMessage('댓글 등록에 실패했습니다.');
    }
  };

  // 3. DELETE: 댓글 삭제
  const handleDeleteComment = async (id: string) => {
    setDeleteModalCommentId(id);
  };

  const confirmDeleteComment = async () => {
    if (!deleteModalCommentId) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/comments?id=${deleteModalCommentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');

      const updatedComments = comments.filter((c) => c.id !== deleteModalCommentId && c.parent_id !== deleteModalCommentId);

      setComments(updatedComments);
      onCountChange?.(updatedComments.length);
    } catch (error) {
      console.error('댓글 삭제 에러:', error);
      setErrorModalMessage('삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
      setDeleteModalCommentId(null);
    }
  };
  return (
    <div className="mt-10 space-y-6">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[16px] font-extrabold text-label dark:text-label-invert">
          댓글 <span className="text-tint ml-1">{comments.length}</span>
        </h3>
      </div>

      <div className="min-h-[100px]">
        {isLoading ? (
          <div className="py-10 text-center text-label-muted text-sm">기록을 불러오는 중...</div>
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
                    onDelete={handleDeleteComment}
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
                          onDelete={handleDeleteComment}
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

      <div className="pt-4">
        {!hideInput && (
          <CommentInput
            onCommentSubmit={handleAddComment}
            replyingTo={replyingTo} // 👈 정보 전달
            onCancelReply={() => setReplyingTo(null)}
          />
        )}
      </div>

      {/* 삭제 확인 모달 */}
      <Modal isOpen={!!deleteModalCommentId} onClose={() => setDeleteModalCommentId(null)}>
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-label dark:text-label-invert">정말 삭제하시겠어요?</h2>
          <p className="text-sm text-secondary dark:text-label-muted">이 작업은 되돌릴 수 없습니다.</p>
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
    </div>
  );
}
