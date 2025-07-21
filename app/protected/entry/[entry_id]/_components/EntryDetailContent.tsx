'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';
import { Entry } from '@/types/entry';
import { Book } from '@/types/book';
import Button from '@/components/ui/Button';

interface Props {
  entry: Entry;
  book: Book;
}

export default function EntryDetailContent({ entry, book }: Props) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError('');

    try {
      const res = await fetch(`/api/entries/${entry.id}/delete?book_id=${book.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const { message } = await res.json();
        throw new Error(message || '삭제에 실패했어요. 다시 시도해주세요.');
      }

      router.push(`/protected/books/${book.id}`);
    } catch (error) {
      const err = error as Error;
      setDeleteError(err.message);
      setIsDeleting(false);
    }
  };

  return (
    <Fragment>
      <section className="space-y-6">
        <div
          className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition"
          onClick={() => router.push(`/protected/books/${book.id}`)}
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

        <div className="bg-background dark:bg-darkbg rounded-xl p-6 shadow-md space-y-4">
          <h1 className="text-page-title font-bold text-label dark:text-white">
            ✍️ 오늘의 독서 기록
          </h1>
          <p className="text-body-text text-label dark:text-gray-100 whitespace-pre-wrap">
            {entry.summary ?? ''}
          </p>
          <hr className="border-t border-gray-200 dark:border-gray-700" />
          <p className="text-sm text-secondary">
            📅 {entry.date ? new Date(entry.date).toLocaleDateString() : '날짜 정보 없음'} | 📖{' '}
            {entry.from_page ?? ''}~{entry.to_page ?? ''}쪽
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" onClick={() => router.push(`/protected/entry/${entry.id}/edit`)}>
              수정하기
            </Button>
            <Button size="sm" variant="danger" onClick={() => setIsDeleteDialogOpen(true)}>
              삭제하기
            </Button>
          </div>
        </div>
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
