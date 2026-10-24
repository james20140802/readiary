'use client';
import { useReflectionFeature } from '@/components/features/ReflectionFeatureProvider';

import ReflectionThread from '@/components/reflections/ReflectionThread';
import EntryDeleteWarning from '@/components/reflections/EntryDeleteWarning';
import { useActionLock } from '@/hooks/useActionLock';
import { apiFetch } from '@/lib/api/fetch';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Share, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Sheet from '@/components/ui/Sheet';
import { Entry } from '@/types/entry';
import { Book } from '@/types/book';
import { Profile } from '@/types/profile';
import SocialActionBar from '../social/SocialActionBar';
import ShareEntrySheet from '@/components/entries/ShareEntrySheet';
import Button from '../ui/Button';
import CommentSection from '../comments/CommentSection';
import EntryLayer from './EntryLayer';

interface Props {
  entry: Entry;
  book: Book;
  isFriend?: boolean;
  friendProfile?: Profile;
  initialLiked: boolean;
  initialLikeCount: number;
  initialCommentCount: number;
  currentUserId?: string;
  openComposer?: boolean;
}

const MENU_ROW =
  'flex min-h-[54px] w-full items-center gap-3 border-t border-hairline text-left font-sans text-[17px] font-medium text-ink first:border-t-0';

/** 기록 한 장(시안 entry-layer.html) — 데이터와 동작을 맡고, 모양은 EntryLayer가 그린다 */
export default function EntryDetailContent({
  entry,
  book,
  isFriend = false,
  friendProfile,
  initialLiked,
  initialLikeCount,
  initialCommentCount,
  currentUserId,
  openComposer = false,
}: Props) {
  const enabled = useReflectionFeature();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const deletion = useActionLock();
  const isDeleting = deletion.busy;
  const [deleteReady, setDeleteReady] = useState<number | null>(null);
  const [deleteCheck, setDeleteCheck] = useState(0);
  const [deleteError, setDeleteError] = useState('');
  const [commentCount, setCommentCount] = useState(initialCommentCount);

  const scrollToComments = () => {
    document.getElementById('entry-comments')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = async () => {
    if (deleteReady === null || !deletion.acquire()) return;
    setDeleteError('');
    try {
      const res = await apiFetch(
        `/api/entries/${entry.id}/delete?book_id=${book.id}&reflection_count=${deleteReady}`,
        {
          method: 'DELETE',
        }
      );
      if (res.status === 409) {
        setDeleteReady(null);
        setDeleteCheck((v) => v + 1);
        throw new Error('함께 지울 생각 수가 바뀌었어요. 다시 확인해 주세요.');
      }
      if (!res.ok) throw new Error('지우지 못했어요. 다시 시도해 주세요.');
      router.push(`/books/${book.id}`);
    } catch (error) {
      setDeleteError((error as Error).message);
      deletion.release();
    }
  };

  const bookUrl =
    isFriend && friendProfile
      ? `/social/u/${friendProfile.nickname + '-' + friendProfile.tag}/books/${book.id}`
      : `/books/${book.id}`;

  const canShare = !isFriend && !entry.is_private;

  return (
    <>
      <EntryLayer
        entry={entry}
        book={book}
        bookUrl={bookUrl}
        isFriend={isFriend}
        back={isFriend ? { href: bookUrl, label: '책' } : { href: '/today', label: '오늘' }}
        onShare={canShare ? () => setShareOpen(true) : undefined}
        onMore={isFriend ? undefined : () => setMenuOpen(true)}
        reflections={
          enabled ? (
            <ReflectionThread
              openComposer={openComposer && !isFriend}
              entryId={entry.id}
              entryDate={entry.date}
              quote={entry.quote}
            />
          ) : undefined
        }
        reactions={
          <>
            <div className="flex min-h-10 items-center">
              <SocialActionBar
                entryId={entry.id}
                initialLikeCount={initialLikeCount}
                initialLiked={initialLiked}
                commentCount={commentCount}
                onCommentClick={scrollToComments}
                border={false}
              />
            </div>
            <div id="entry-comments" className="scroll-mt-24">
              <CommentSection
                entryId={entry.id}
                currentUserId={currentUserId}
                onCountChange={setCommentCount}
              />
            </div>
          </>
        }
      />

      {!isFriend && (
        <>
          <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} ariaLabel="기록 메뉴">
            <div className="-mt-3">
              {canShare && (
                <button
                  type="button"
                  className={MENU_ROW}
                  onClick={() => {
                    setMenuOpen(false);
                    setShareOpen(true);
                  }}
                >
                  <Share size={20} strokeWidth={1.75} className="text-ink-sub" aria-hidden />
                  공유하기
                </button>
              )}
              <Link href={`/entry/${entry.id}/edit`} className={MENU_ROW}>
                <Pencil size={20} strokeWidth={1.75} className="text-ink-sub" aria-hidden />
                원문 고치기
              </Link>
              <button
                type="button"
                className={`${MENU_ROW} text-danger`}
                onClick={() => {
                  setMenuOpen(false);
                  setIsDeleteDialogOpen(true);
                }}
              >
                <Trash2 size={20} strokeWidth={1.75} aria-hidden />
                지우기
              </button>
            </div>
          </Sheet>

          {canShare && (
            <ShareEntrySheet
              open={shareOpen}
              onClose={() => setShareOpen(false)}
              entryId={entry.id}
              quote={entry.quote}
              note={entry.note}
              date={entry.date}
              bookTitle={book.title}
              bookAuthor={book.author}
            />
          )}

          {/* 지우기 확인 */}
          <Modal
            ariaLabel="이 기록을 지울까요"
            isOpen={isDeleteDialogOpen}
            onClose={() => {
              if (!deletion.isLocked()) setIsDeleteDialogOpen(false);
            }}
          >
            <h2 className="font-sans text-[18px] font-bold text-ink">이 기록을 지울까요</h2>
            <div className="mt-2">
              {isDeleteDialogOpen && entry.id && (
                <EntryDeleteWarning key={deleteCheck} entryId={entry.id} onReady={setDeleteReady} />
              )}
            </div>
            {deleteError && (
              <p role="alert" className="mt-3 font-sans text-caption text-danger">
                {deleteError}
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                disabled={isDeleting}
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                그대로 두기
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleDelete}
                disabled={isDeleting || deleteReady === null}
              >
                {isDeleting ? '지우는 중…' : '지우기'}
              </Button>
            </div>
          </Modal>
        </>
      )}
    </>
  );
}
