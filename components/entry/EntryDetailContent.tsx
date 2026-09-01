'use client';

import { Fragment, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Entry } from '@/types/entry';
import { Book } from '@/types/book';
import { Profile } from '@/types/profile';
import { formatKoreanDate } from '@/lib/dates';
import AnimatedSection from '@/components/ui/AnimatedSection';
import SocialActionBar from '../social/SocialActionBar';
import ShareEntryButton from '@/components/entries/ShareEntryButton';
import Button from '../ui/Button';
import CommentSection from '../comments/CommentSection';

interface Props {
  entry: Entry;
  book: Book;
  isFriend?: boolean;
  friendProfile?: Profile;
  initialLiked: boolean;
  initialLikeCount: number;
  initialCommentCount: number;
  currentUserId?: string;
}

function formatPages(fromPage?: number | null, toPage?: number | null) {
  if (fromPage != null && toPage != null && fromPage !== toPage) return `p.${fromPage}–${toPage}`;
  const page = fromPage ?? toPage;
  return page != null ? `p.${page}` : null;
}

/** 기록 상세 — 카드 박스 없이 원고 흐름 문법으로, 문장이 지면의 주인공이 된다 */
export default function EntryDetailContent({
  entry,
  book,
  isFriend = false,
  friendProfile,
  initialLiked,
  initialLikeCount,
  initialCommentCount,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const commentRef = useRef<HTMLDivElement>(null);
  const [commentCount, setCommentCount] = useState(initialCommentCount);

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

  const pages = formatPages(entry.from_page, entry.to_page);

  return (
    <Fragment>
      <section className="space-y-8">
        {/* 출처 — 이 문장이 어느 책에서 왔는지 */}
        <Link href={bookUrl} className="group flex items-center gap-4">
          <Image
            src={book.cover_url ?? '/images/default-book-cover.png'}
            alt={`『${book.title ?? '제목 없음'}』 표지`}
            width={48}
            height={72}
            className="rounded border border-hairline object-cover"
          />
          <div>
            <h2 className="font-serif text-xl leading-tight text-ink transition-colors group-hover:text-accent">
              {book.title ?? '제목 없음'}
            </h2>
            <p className="mt-1 text-sm text-ink-sub">{book.author ?? '저자 미상'}</p>
          </div>
        </Link>

        <AnimatedSection>
          <article>
            {entry.quote && (
              <div>
                <span aria-hidden className="block font-serif text-[40px] leading-none text-accent">
                  &ldquo;
                </span>
                <blockquote className="mt-1 whitespace-pre-wrap font-serif text-[19px] leading-[1.9] text-ink">
                  {entry.quote}
                </blockquote>
              </div>
            )}
            {entry.note && (
              <p
                className={`whitespace-pre-wrap font-serif leading-[1.9] ${
                  entry.quote ? 'mt-6 text-[15px] text-ink-sub' : 'text-[17px] text-ink'
                }`}
              >
                {entry.note}
              </p>
            )}

            {/* 여백의 기록 — 날짜·쪽수·공개 여부와 조용한 행동들 */}
            <footer className="mt-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-hairline pt-4">
              <div className="flex items-center gap-3 text-[11.5px] tabular-nums text-ink-faint">
                <time>{formatKoreanDate(entry.date) ?? entry.date}</time>
                {pages && <span>{pages}</span>}
                {entry.is_private && (
                  <span className="flex items-center gap-1">
                    <Lock size={10} aria-hidden />
                    비공개
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <SocialActionBar
                  entryId={entry.id}
                  initialLikeCount={initialLikeCount}
                  initialLiked={initialLiked}
                  commentCount={commentCount}
                  onCommentClick={scrollToComments}
                  border={false}
                />
                <ShareEntryButton
                  entryId={entry.id}
                  quote={entry.quote}
                  note={entry.note}
                  date={entry.date}
                  isPrivate={entry.is_private}
                  bookTitle={book.title}
                  bookAuthor={book.author}
                />
                {!isFriend && (
                  <>
                    <span aria-hidden className="h-4 w-px bg-hairline" />
                    <Link
                      href={`/protected/entry/${entry.id}/edit`}
                      className="text-[11.5px] text-ink-faint transition-colors hover:text-accent"
                    >
                      수정
                    </Link>
                    <button
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="text-[11.5px] text-ink-faint transition-colors hover:text-danger"
                    >
                      삭제
                    </button>
                  </>
                )}
              </div>
            </footer>
          </article>
        </AnimatedSection>

        <div ref={commentRef} className="border-t border-hairline pt-4">
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
          <h2 className="text-lg font-bold text-ink">정말 삭제하시겠어요?</h2>
          <p className="text-sm text-ink-sub">이 작업은 되돌릴 수 없습니다.</p>
          {deleteError && <p className="text-sm text-danger">{deleteError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>
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
