'use client';

import { useState, useEffect } from 'react';
import { Comment } from '@/types/comments';
import CommentItem from './CommentItem';
import CommentInput from './CommentInput';

interface CommentSectionProps {
  entryId: string;
  currentUserId?: string;
  onCountChange?: (count: number) => void;
}

export default function CommentSection({
  entryId,
  currentUserId,
  onCountChange = () => {},
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        body: JSON.stringify({ entryId, content }),
      });

      if (!res.ok) throw new Error('작성 실패');
      const newComment = await res.json();

      const updatedComments = [...comments, newComment];
      setComments(updatedComments);
      onCountChange?.(updatedComments.length);
    } catch (error) {
      console.error('댓글 추가 에러:', error);
      alert('댓글 등록에 실패했습니다.');
    }
  };

  // 3. DELETE: 댓글 삭제
  const handleDeleteComment = async (id: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/comments?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('삭제 실패');

      const updatedComments = comments.filter((c) => c.id !== id);
      setComments(updatedComments);
      onCountChange?.(updatedComments.length);
    } catch (error) {
      console.error('댓글 삭제 에러:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  return (
    <div className="mt-10 space-y-6">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[16px] font-extrabold text-zinc-900 dark:text-zinc-100">
          댓글 <span className="text-tint ml-1">{comments.length}</span>
        </h3>
      </div>

      <div className="min-h-[100px]">
        {isLoading ? (
          <div className="py-10 text-center text-zinc-400 text-sm">기록을 불러오는 중...</div>
        ) : comments.length > 0 ? (
          <div className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                onDelete={handleDeleteComment}
              />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-zinc-400 text-[14px]">
            아직 댓글이 없어요. 첫 인사를 남겨보세요! 💬
          </div>
        )}
      </div>

      <div className="pt-4">
        <CommentInput onCommentSubmit={handleAddComment} />
      </div>
    </div>
  );
}
