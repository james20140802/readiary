'use client';

import { apiFetch } from '@/lib/api/fetch';
import { useState, useEffect, useRef } from 'react';
import { useActionLock } from '@/hooks/useActionLock';
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
    <div className="mt-10 space-y-6">
      <div className="flex items-center justify-between px-1">
        {/* 책 상세의 '독서 기록' 헤딩과 같은 문법 */}
        <h3 className="font-serif text-section-title font-bold text-ink">
          댓글{' '}
          <span className="ml-1 text-caption font-normal tabular-nums text-ink-faint">
            {comments.length}
          </span>
        </h3>
      </div>

      <div className="min-h-[100px]">
        {isLoading ? (
          <div className="py-10 text-center text-ink-faint text-caption">기록을 불러오는 중...</div>
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
                    onDelete={handleDeleteComment}
                    onReplyClick={() => {
                      if (!postingRef.current && !deletion.isLocked()) setReplyingTo(rootComment);
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
                          onDelete={handleDeleteComment}
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

      <div className="pt-4">
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
        {!hideInput && (
          <CommentInput
            onCommentSubmit={handleAddComment}
            entryId={entryId}
            disabled={isDeleting || !hasLoaded}
            onBusyChange={onPosting}
            replyingTo={replyingTo} // 정보 전달
            onCancelReply={() => setReplyingTo(null)}
          />
        )}
      </div>

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
    </div>
  );
}
