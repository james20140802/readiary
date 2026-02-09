'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Comment } from '@/types/comments';
import CommentItem from './CommentItem';
import CommentInput from './CommentInput';

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
      alert('등록 실패');
    }
  };

  // 3. 댓글 삭제 (대댓글 포함 카운트 반영)
  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/comments?id=${id}`, { method: 'DELETE' });
      const updated = comments.filter((c) => c.id !== id && c.parent_id !== id);
      setComments(updated);
      onCountChange?.(updated.length);
    } catch (e) {
      console.error(e);
      alert('삭제 실패');
    }
  };

  return (
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
            className="fixed bottom-0 left-0 right-0 z-[70] bg-white dark:bg-zinc-900 shadow-2xl max-h-[90vh] rounded-t-[20px] flex flex-col w-full mx-auto sm:max-w-[640px] sm:bottom-4 sm:rounded-[24px]"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50 dark:border-zinc-800">
              <h3 className="text-[16px] font-bold">댓글 {comments.length}</h3>
              <button onClick={onClose} className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                <X size={18} />
              </button>
            </div>

            {/* 리스트 영역 (스크롤) */}
            <div className="flex-1 overflow-y-auto px-5 py-2 custom-scrollbar min-h-[300px]">
              {isLoading ? (
                <div className="py-10 text-center text-zinc-400 text-sm">기록을 불러오는 중...</div>
              ) : comments.length > 0 ? (
                <div className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
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
                        <div className="ml-10 border-l-2 border-zinc-50 dark:border-zinc-800/50">
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
                <div className="py-12 text-center text-zinc-400 text-[14px]">
                  아직 댓글이 없어요. 첫 인사를 남겨보세요! 💬
                </div>
              )}
            </div>

            {/* 고정 입력창 (Sticky) */}
            <div className="p-4 border-t border-zinc-50 dark:border-zinc-800 bg-white dark:bg-zinc-900 sm:rounded-b-[24px]">
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
  );
}
