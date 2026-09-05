'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
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
  /** `isCurrent`가 false면 요청을 보낸 뒤 시트가 닫혔다 다시 열린 것 — 목록엔 반영하되 지금 시트는 닫지 말 것 */
  onSaved: (entryId: string, values: EntryFormValues, isCurrent: boolean) => void;
  onDeleted: (entryId: string, isCurrent: boolean) => void;
}

/**
 * 열려 있는 동안 portal-root 밖의 배경(body 직계 자식)을 스크린리더·포커스에서 빼고, 사라질 때 대상마다
 * 우리가 보기 전의 값으로 되돌린다.
 * Headless UI 2.2의 inert 계산은 이 트리에서 첫 열림엔 비어 있고(메인 트리 노드가 늦게 잡히는데 effect deps가
 * 고정), 위에 삭제 Modal이 떴다 닫히면 그제야 MAIN을 잡는다 — 그때 '이전 값'으로 우리가 건 true를 기억해
 * 언마운트 때 되돌리므로, 이 컴포넌트는 반드시 Dialog *안*에 둔다: 마운트는 자식 effect가 먼저(우리가 원래
 * 값을 본다), 언마운트는 부모 cleanup이 먼저(Headless가 되돌린 뒤 우리가 마지막으로 원래 값으로 되돌린다).
 */
function InertBackground() {
  useEffect(() => {
    const targets = Array.from(document.body.children).filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement && el.id !== 'headlessui-portal-root' && el.tagName !== 'SCRIPT'
    );
    const previous = targets.map((el) => ({
      el,
      inert: el.inert,
      ariaHidden: el.getAttribute('aria-hidden'),
    }));
    for (const el of targets) {
      el.inert = true;
      el.setAttribute('aria-hidden', 'true');
    }
    return () => {
      for (const { el, inert, ariaHidden } of previous) {
        el.inert = inert;
        if (ariaHidden === null) el.removeAttribute('aria-hidden');
        else el.setAttribute('aria-hidden', ariaHidden);
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
      onSaved(entry.id, values, session === sessionRef.current);
      return null;
    } catch {
      return '서버와 통신 중 오류가 발생했습니다.';
    }
  };

  const confirmDelete = async () => {
    if (!entry) return;
    const session = sessionRef.current;
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
      onDeleted(entry.id, session === sessionRef.current);
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
            <Button size="sm" variant="danger" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? '삭제 중...' : '삭제하기'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
