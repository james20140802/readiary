'use client';

import { useRef, useState } from 'react';
import { Dialog, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Ellipsis, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useActionLock } from '@/hooks/useActionLock';
import { apiFetch, SessionExpiredError } from '@/lib/api/fetch';

export default function BookActionsMenu({
  userBookId,
  title,
}: {
  userBookId: string;
  title: string;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const action = useActionLock();
  const close = () => {
    if (!action.isLocked()) setOpen(false);
  };
  const remove = async () => {
    if (!action.acquire()) return;
    setError('');
    try {
      const response = await apiFetch(`/api/books/${userBookId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('delete failed');
      // A fresh document clears visited pages from the client Router Cache.
      window.location.replace('/protected/books');
    } catch (cause) {
      if (!(cause instanceof SessionExpiredError)) {
        setError('삭제를 완료했는지 확인하지 못했어요. 다시 시도해 주세요.');
      }
      action.release();
    }
  };
  return (
    <>
      <Menu>
        <MenuButton
          ref={trigger}
          aria-label="책 관리"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-sub transition-colors hover:bg-card-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          <Ellipsis className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </MenuButton>
        <MenuItems
          anchor="bottom end"
          modal={false}
          className="z-50 w-44 rounded-md border border-hairline-strong bg-card p-1 [--anchor-gap:6px] [--anchor-padding:16px] focus:outline-none"
        >
          <MenuItem>
            {({ close: closeMenu }) => (
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3 rounded px-3 text-left font-sans text-button text-danger data-[focus]:bg-card-raised"
                onClick={() => {
                  closeMenu();
                  // The menu item unmounts. Keep the durable trigger as the
                  // dialog's restore target before moving focus into it.
                  trigger.current?.focus();
                  setError('');
                  setOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />책 삭제
              </button>
            )}
          </MenuItem>
        </MenuItems>
      </Menu>
      <Modal isOpen={open} onClose={close}>
        <Dialog.Title className="font-serif text-section-title font-bold text-ink">
          책과 기록을 삭제할까요?
        </Dialog.Title>
        <Dialog.Description as="div" className="mt-4 space-y-3 text-body text-ink-sub">
          <p className="break-words font-serif font-bold text-ink">{title}</p>
          <p>
            내 책장에서 이 책과 남긴 모든 문장·생각을 삭제해요. 덧붙인 생각, 댓글과 좋아요도 함께
            삭제돼요.
          </p>
          <p>공유 링크로도 기록을 볼 수 없게 되며, 삭제한 내용은 되돌릴 수 없어요.</p>
        </Dialog.Description>
        {error && (
          <p role="alert" className="mt-4 text-caption text-danger">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2" aria-busy={action.busy}>
          <Button variant="secondary" onClick={close} disabled={action.busy} data-autofocus>
            취소
          </Button>
          <Button variant="danger" onClick={remove} loading={action.busy}>
            {action.busy ? '삭제 중…' : '책과 기록 삭제'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
