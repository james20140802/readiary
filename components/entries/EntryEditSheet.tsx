'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Entry } from '@/types/entry';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import EntryFormBody, { EntryFormValues } from './EntryFormBody';

interface Props {
  /** 고칠 기록. 닫히는 동안에도 마지막 기록을 들고 있어야 퇴장 애니메이션 중 내용이 사라지지 않는다 */
  entry: Entry | null;
  bookId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (entryId: string, values: EntryFormValues) => void;
  onDeleted: (entryId: string) => void;
}

/**
 * 책 상세 안에서 그 자리에서 고치는 바텀시트 — 페이지 이동 없이 문장·생각·쪽수·날짜·공개 여부를
 * 고치고, 하단의 조용한 링크로 지울 수도 있다. 댓글 시트와 같은 문법(모바일은 하단, sm 이상은 가운데 카드).
 */
export default function EntryEditSheet({
  entry,
  bookId,
  isOpen,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Esc로 닫기 — 삭제 확인창이 떠 있을 땐 그쪽(headless Dialog)이 먼저 받는다
  useEffect(() => {
    if (!isOpen || isDeleteOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isDeleteOpen, onClose]);

  const handleSubmit = async (values: EntryFormValues): Promise<string | null> => {
    if (!entry) return null;
    try {
      const res = await fetch(`/api/entries/${entry.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        return data?.error ?? '수정에 실패했어요.';
      }
      onSaved(entry.id, values);
      return null;
    } catch {
      return '서버와 통신 중 오류가 발생했습니다.';
    }
  };

  const confirmDelete = async () => {
    if (!entry) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/entries/${entry.id}/delete?book_id=${bookId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? '삭제 실패');
      }
      setIsDeleteOpen(false);
      onDeleted(entry.id);
    } catch (error) {
      setDeleteError((error as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && entry && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="entry-edit-sheet-title"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[70] mx-auto flex max-h-[90vh] w-full flex-col rounded-t-[20px] border border-hairline bg-card sm:bottom-4 sm:max-w-[640px] sm:rounded-[24px]"
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
                <h3
                  id="entry-edit-sheet-title"
                  className="font-serif text-[16px] font-bold text-ink"
                >
                  기록 고치기
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="닫기"
                  className="rounded-full bg-card-raised p-1.5"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 원고 — 스크롤 영역. 기록이 바뀌면 key로 폼 상태를 새로 잡는다 */}
              <div className="custom-scrollbar flex-1 overflow-y-auto px-5 pb-5 sm:rounded-b-[24px]">
                <EntryFormBody
                  key={entry.id}
                  totalPages={entry.book?.total_pages}
                  submitLabel="고쳐 남기기"
                  initial={{
                    quote: entry.quote ?? '',
                    note: entry.note ?? '',
                    fromPage: entry.from_page,
                    toPage: entry.to_page,
                    date: entry.date,
                    isPrivate: entry.is_private,
                  }}
                  onSubmit={handleSubmit}
                  secondaryAction={
                    <button
                      type="button"
                      onClick={() => setIsDeleteOpen(true)}
                      className="text-[12.5px] text-ink-faint transition-colors hover:text-danger"
                    >
                      삭제
                    </button>
                  }
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 삭제 확인 — entry 상세와 같은 문구 */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => {
          if (!isDeleting) setIsDeleteOpen(false);
        }}
      >
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-ink">정말 삭제하시겠어요?</h2>
          <p className="text-sm text-ink-sub">이 작업은 되돌릴 수 없습니다.</p>
          {deleteError && <p className="text-sm text-danger">{deleteError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              취소
            </Button>
            <Button size="sm" variant="danger" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? '삭제 중...' : '삭제하기'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
