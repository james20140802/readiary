'use client';

import { Fragment, useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
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
 * 열려 있는 동안 portal-root 밖의 배경(body 직계 자식)을 스크린리더·포커스에서 뺀다.
 * Headless UI 2.2의 inert 계산은 이 트리에서 첫 열림엔 비어 있고(메인 트리 노드가 늦게 잡히는데 effect deps가
 * 고정), 위에 삭제 Modal이 떴다 닫히면 그제야 MAIN을 잡는다 — 그때 '이전 값'으로 우리가 건 true를 기억해
 * 언마운트 때 되돌리므로, 이 컴포넌트는 Dialog *안*에 두어 수명을 맞추고(언마운트는 부모 cleanup이 먼저)
 * cleanup에서 캡처값 복원 대신 무조건 걷어낸다. 남는 inert는 페이지를 못 쓰게 하니 그쪽이 안전하다.
 */
function InertBackground() {
  useEffect(() => {
    const targets = Array.from(document.body.children).filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement && el.id !== 'headlessui-portal-root' && el.tagName !== 'SCRIPT'
    );
    for (const el of targets) {
      el.inert = true;
      el.setAttribute('aria-hidden', 'true');
    }
    return () => {
      for (const el of targets) {
        el.inert = false;
        el.removeAttribute('aria-hidden');
      }
    };
  }, []);
  return null;
}

/**
 * 책 상세 안에서 그 자리에서 고치는 바텀시트 — 페이지 이동 없이 문장·생각·쪽수·날짜·공개 여부를
 * 고치고, 하단의 조용한 링크로 지울 수도 있다. 댓글 시트와 같은 모양(모바일은 하단, sm 이상은 가운데 카드)이되
 * 껍데기는 Headless UI Dialog라 포커스 가두기·배경 inert·Esc·바깥 클릭·포커스 복원을 얻는다.
 * 애니메이션은 `static` Dialog를 AnimatePresence 안에 두는 공식 패턴.
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
          // 삭제 확인창(아래 Modal, z-100)이 떠 있는 동안엔 그쪽이 맨 위 레이어라 Esc·바깥 클릭을 먼저 받는다
          <Dialog static open={isOpen} onClose={onClose} className="relative z-[60]">
            <InertBackground />
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <DialogPanel as={Fragment}>
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 mx-auto flex max-h-[90vh] w-full flex-col rounded-t-[20px] border border-hairline bg-card sm:bottom-4 sm:max-w-[640px] sm:rounded-[24px]"
              >
                {/* 헤더 */}
                <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
                  <DialogTitle as="h3" className="font-serif text-[16px] font-bold text-ink">
                    기록 고치기
                  </DialogTitle>
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
            </DialogPanel>
          </Dialog>
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
