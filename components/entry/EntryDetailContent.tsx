'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';
import { Entry } from '@/types/entry';
import { Book } from '@/types/book';
import Button from '@/components/ui/Button';
import { Profile } from '@/types/profile';
import AnimatedSection from '@/components/ui/AnimatedSection';
import { Heart, MessageCircle } from 'lucide-react';

interface Props {
  entry: Entry;
  book: Book;
  isFriend?: boolean;
  friendProfile?: Profile;
  initialLiked: boolean;
  initialLikeCount: number;
}

export default function EntryDetailContent({
  entry,
  book,
  isFriend = false,
  friendProfile,
  initialLiked,
  initialLikeCount,
}: Props) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // 좋아요 상태 관리
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLikeLoading, setIsLikeLoading] = useState(false);

  // 좋아요 토글 로직
  const handleLikeToggle = async () => {
    if (isLikeLoading) return;

    const prevLiked = isLiked;
    const prevCount = likeCount;

    setIsLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);
    setIsLikeLoading(true);

    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: entry.id }),
      });

      if (!response.ok) throw new Error('Failed to like');
    } catch (error) {
      console.error('Error liking entry:', error);
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/entries/${entry.id}/delete?book_id=${book.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('삭제 실패');
      router.push(`/protected/books/${book.id}`);
    } catch (error) {
      setDeleteError((error as Error).message);
      setIsDeleting(false);
    }
  };

  // 숫자 포맷팅 함수 (10,000 이상일 때 '만' 단위 표시)
  const formatLikeCount = (count: number) => {
    if (count >= 10000) {
      return (count / 10000).toFixed(1).replace(/\.0$/, '') + '만';
    }
    return count.toLocaleString();
  };

  const bookUrl =
    isFriend && friendProfile
      ? `/protected/social/u/${friendProfile.nickname + '-' + friendProfile.tag}/books/${book.id}`
      : `/protected/books/${book.id}`;

  return (
    <Fragment>
      <section className="space-y-6">
        <div
          className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition"
          onClick={() => router.push(bookUrl)}
        >
          <Image
            src={book.cover_url ?? '/images/default-book-cover.png'}
            alt="Book cover"
            width={48}
            height={72}
            className="rounded shadow object-cover"
          />
          <div className="space-y-1">
            <h2 className="text-section-title text-label dark:text-white">
              {book.title ?? '제목 없음'}
            </h2>
            <p className="text-sm text-secondary">{book.author ?? '저자 미상'}</p>
          </div>
        </div>

        <AnimatedSection>
          <div className="bg-background dark:bg-darkbg rounded-xl shadow-md overflow-hidden flex flex-col">
            {/* 1. 본문 영역 */}
            <div className="p-5 sm:p-6 pb-4 space-y-4">
              <h1 className="text-[1.125rem] font-bold text-label dark:text-white flex items-center gap-2">
                ✍️ 오늘의 독서 기록
              </h1>
              <p className="text-[0.9375rem] leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {entry.summary ?? ''}
              </p>
            </div>

            {/* 2. 하단 액션 통합 바 (정보 + 소셜) */}
            <div className="px-5 sm:px-6 py-4 bg-zinc-50/50 dark:bg-zinc-800/20 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* 정보와 소셜 버튼을 한 그룹으로 묶어 왼쪽 정렬 */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <p className="text-[0.75rem] sm:text-[0.875rem] text-zinc-400 tabular-nums">
                    📅 {new Date(entry.date).toLocaleDateString()} <span className="mx-1">|</span>{' '}
                    📖 {entry.from_page}~{entry.to_page}쪽
                  </p>

                  {/* 구분선 (데스크탑에서만 노출) */}
                  <div className="hidden sm:block h-3 w-[1px] bg-zinc-200 dark:bg-zinc-700" />

                  {/* 소셜 버튼들 */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleLikeToggle}
                      className="flex items-center gap-1.5 transition-colors group"
                    >
                      <Heart
                        size={18}
                        className={`transition-transform active:scale-125 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-zinc-400'}`}
                      />
                      <span
                        className={`text-[0.8125rem] font-bold tabular-nums ${isLiked ? 'text-rose-500' : 'text-zinc-400'}`}
                      >
                        {formatLikeCount(likeCount)}
                      </span>
                    </button>
                    <button className="flex items-center gap-1.5 text-zinc-400 hover:text-tint transition-colors">
                      <MessageCircle size={18} />
                      <span className="text-[0.8125rem] font-bold">0</span>
                    </button>
                  </div>
                </div>

                {/* 3. 내 글 관리 영역: 모바일에서 아주 가볍게 처리 */}
                {!isFriend && (
                  <div className="flex items-center gap-4 self-end sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => router.push(`/protected/entry/${entry.id}/edit`)}
                      className="text-[0.75rem] font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="text-[0.75rem] font-bold text-rose-400/80 hover:text-rose-600"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </AnimatedSection>
      </section>

      <Modal isOpen={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-label dark:text-white">정말 삭제하시겠어요?</h2>
          <p className="text-sm text-secondary dark:text-gray-300">이 작업은 되돌릴 수 없습니다.</p>
          {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" onClick={() => setIsDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button size="sm" variant="danger" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? '삭제 중...' : '삭제하기'}
            </Button>
          </div>
        </div>
      </Modal>
    </Fragment>
  );
}
