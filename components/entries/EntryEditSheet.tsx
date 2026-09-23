'use client';

import { updateEntry } from '@/lib/actions/updateEntry';
import EntryDeleteWarning from '@/components/reflections/EntryDeleteWarning';
import { useActionLock } from '@/hooks/useActionLock';
import { apiFetch } from '@/lib/api/fetch';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Entry } from '@/types/entry';
import InertBackground from '@/components/ui/InertBackground';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import EntryFormBody, { EntryFormValues } from './EntryFormBody';

interface Props {
  /** 고칠 기록. 닫히는 동안에도 마지막 기록을 들고 있어야 퇴장 애니메이션 중 내용이 사라지지 않는다 */
  entry: Entry | null;
  bookId: string;
  isOpen: boolean;
  onClose: () => void;
  /** `isCurrent`가 false면 요청을 보낸 뒤 시트가 닫혔다 다시 열린 것 — 목록엔 반영하되 지금 시트는 닫지 말 것 */
  onSaved: (entryId: string, values: EntryFormValues, isCurrent: boolean) => void;
  onDeleted: (entryId: string, isCurrent: boolean) => void;
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
  const deletion = useActionLock();
  const isDeleting = deletion.busy;
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);
  const onSaving = (busy: boolean) => {
    saving.current = busy;
    setIsSaving(busy);
  };
  const close = () => {
    if (!saving.current && !deletion.isLocked()) onClose();
  };
  const [deleteReady, setDeleteReady] = useState<number | null>(null);
  const [deleteCheck, setDeleteCheck] = useState(0);
  const [deleteError, setDeleteError] = useState('');

  // 시트가 닫히면 거기 딸린 삭제 확인창도 같이 닫는다 — 저장이 늦게 돌아와 시트를 닫는 사이 확인창이 열려
  // 있었다면 고아 모달만 남는다. React의 '이전 props 기억' 패턴(렌더 중 되맞춤).
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (!isOpen) {
      setIsDeleteOpen(false);
      setDeleteError('');
    }
  }

  // 열림 세션 번호 — 같은 기록을 닫았다 다시 열어도 번호가 바뀐다. 느린 요청이 돌아왔을 때 붙잡아 둔 번호와
  // 다르면 그 사이 시트가 닫혔다 다시 열린 것이므로, 새 시트(와 거기 쓰던 내용)를 닫지 않는다.
  const sessionRef = useRef(0);
  useEffect(() => {
    if (isOpen) sessionRef.current += 1;
  }, [isOpen]);

  const handleSubmit = async (values: EntryFormValues): Promise<string | null> => {
    if (!entry) return null;
    const session = sessionRef.current;
    const error = await updateEntry(entry.id, values);
    if (error) return error;
    onSaved(entry.id, values, session === sessionRef.current);
    return null;
  };

  const confirmDelete = async () => {
    if (deleteReady === null || !entry || saving.current || !deletion.acquire()) return;
    const session = sessionRef.current;

    setDeleteError('');
    try {
      const res = await apiFetch(
        `/api/entries/${entry.id}/delete?book_id=${bookId}&reflection_count=${deleteReady}`,
        {
          method: 'DELETE',
        }
      );
      if (res.status === 409) {
        setDeleteReady(null);
        setDeleteCheck((v) => v + 1);
        throw new Error('함께 삭제할 생각 수가 변경됐어요. 다시 확인해 주세요.');
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? '삭제 실패');
      }
      setIsDeleteOpen(false);
      onDeleted(entry.id, session === sessionRef.current);
    } catch (error) {
      setDeleteError((error as Error).message);
    } finally {
      deletion.release();
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && entry && (
          // 삭제 확인창(아래 Modal, z-100)이 떠 있는 동안엔 그쪽이 맨 위 레이어라 Esc·바깥 클릭을 먼저 받는다
          <Dialog static open={isOpen} onClose={close} className="relative z-[60]">
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
                  <DialogTitle as="h3" className="font-serif text-body font-bold text-ink">
                    기록 고치기
                  </DialogTitle>
                  <button
                    type="button"
                    onClick={close}
                    disabled={isSaving || isDeleting}
                    aria-label="닫기"
                    className="rounded-full bg-card-raised p-1.5"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* 원고 — 스크롤 영역. 기록이 바뀌면 key로 폼 상태를 새로 잡는다 */}
                <div className="custom-scrollbar flex-1 overflow-y-auto px-5 pb-5 sm:rounded-b-[24px]">
                  <EntryFormBody
                    entryId={entry.id}
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
                    onBusyChange={onSaving}
                    disabled={isDeleting}
                    secondaryAction={
                      <button
                        type="button"
                        onClick={() => {
                          if (!saving.current && !deletion.isLocked()) setIsDeleteOpen(true);
                        }}
                        disabled={isSaving || isDeleting}
                        className="text-button-sm text-ink-faint transition-colors hover:text-danger"
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
          <h2 className="text-section-title font-bold text-ink">정말 삭제하시겠어요?</h2>
          {isDeleteOpen && entry?.id && (
            <EntryDeleteWarning key={deleteCheck} entryId={entry?.id} onReady={setDeleteReady} />
          )}
          {deleteError && <p className="text-caption text-danger">{deleteError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            {/* 지우는 중엔 취소도 막는다 — Modal.onClose의 isDeleting 가드와 같은 규칙. 여기서 빠져나가
                시트를 닫고 같은 기록을 다시 열면, 늦게 성공한 DELETE가 이미 지워진 기록의 시트를 남긴다 */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
            >
              취소
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={confirmDelete}
              disabled={isDeleting || deleteReady === null}
            >
              {isDeleting ? '삭제 중...' : '삭제하기'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
