'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';
import { Entry } from '@/types/entry';
import { Book } from '@/types/book';
import { Profile } from '@/types/profile';
import AnimatedSection from '@/components/ui/AnimatedSection';
import SocialActionBar from '../social/SocialActionBar';
import { MoreHorizontal, Edit2, Trash2 } from 'lucide-react'; // 아이콘 추가
import Button from '../ui/Button';
import CommentSection from '../comments/CommentSection';

interface Props {
  entry: Entry;
  book: Book;
  isFriend?: boolean;
  friendProfile?: Profile;
  initialLiked: boolean;
  initialLikeCount: number;
  currentUserId?: string;
}

export default function EntryDetailContent({
  entry,
  book,
  isFriend = false,
  friendProfile,
  initialLiked,
  initialLikeCount,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false); // 메뉴 토글 상태
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const commentRef = useRef<HTMLDivElement>(null);
  const [commentCount, setCommentCount] = useState(0);

  // 1. 메뉴 영역을 참조하기 위한 Ref 생성
  const menuRef = useRef<HTMLDivElement>(null);

  // 2. 바깥 클릭 감지 로직
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 메뉴가 열려있고, 클릭한 대상이 메뉴 영역(menuRef) 외부라면 닫기
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    // 마우스 다운 이벤트 등록
    document.addEventListener('mousedown', handleClickOutside);

    // 컴포넌트 언마운트 시 이벤트 제거 (메모리 누수 방지)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]); // 상태가 바뀔 때마다 리스너 최신화

  const scrollToComments = () => {
    commentRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const bookUrl =
    isFriend && friendProfile
      ? `/protected/social/u/${friendProfile.nickname + '-' + friendProfile.tag}/books/${book.id}`
      : `/protected/books/${book.id}`;

  return (
    <Fragment>
      <section className="space-y-6">
        {/* 상단 책 정보 영역 */}
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
              <div className="flex items-center justify-between relative">
                <h1 className="text-[1.125rem] font-bold text-label dark:text-white flex items-center gap-2">
                  ✍️ 오늘의 독서 기록
                </h1>

                {/* 관리 메뉴 (본인 글일 때만 노출) */}
                {!isFriend && (
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
                    >
                      <MoreHorizontal size={20} />
                    </button>

                    {/* 드롭다운 메뉴 */}
                    {isMenuOpen && (
                      <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-xl z-10 py-1.5">
                        <button
                          onClick={() => {
                            router.push(`/protected/entry/${entry.id}/edit`);
                            setIsMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-[13px] font-medium flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                        >
                          <Edit2 size={14} /> 수정하기
                        </button>
                        <button
                          onClick={() => {
                            setIsDeleteDialogOpen(true);
                            setIsMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-[13px] font-medium flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-rose-500"
                        >
                          <Trash2 size={14} /> 삭제하기
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <p className="text-[0.9375rem] leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {entry.summary ?? ''}
              </p>
            </div>

            {/* 2. 하단 액션 통합 바 (정보 + 소셜) */}
            <div className="px-5 sm:px-6 py-4 bg-zinc-50/50 dark:bg-zinc-800/10 border-t border-zinc-50 dark:border-zinc-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <p className="text-[0.75rem] sm:text-[0.875rem] text-zinc-400 tabular-nums">
                    📅 {new Date(entry.date).toLocaleDateString()} <span className="mx-1">|</span>{' '}
                    📖 {entry.from_page}~{entry.to_page}쪽
                  </p>

                  <SocialActionBar
                    entryId={entry.id}
                    initialLikeCount={initialLikeCount}
                    initialLiked={initialLiked}
                    commentCount={commentCount}
                    onCommentClick={scrollToComments}
                    border={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>
        {/* 3. 댓글 섹션 배치 (블로그 스타일) */}
        <div ref={commentRef} className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <CommentSection
            entryId={entry.id}
            currentUserId={currentUserId}
            onCountChange={setCommentCount}
          />
        </div>
      </section>

      {/* 삭제 확인 모달 */}
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
