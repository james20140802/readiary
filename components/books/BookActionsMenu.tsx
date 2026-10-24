'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BookOpen, Ellipsis, Search, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import Sheet from '@/components/ui/Sheet';
import { useActionLock } from '@/hooks/useActionLock';
import { apiFetch, SessionExpiredError } from '@/lib/api/fetch';
import { BTN_DANGER, BTN_LINE } from './buttonStyles';

const ROW =
  'flex min-h-[54px] w-full items-center gap-3 border-t border-hairline text-left font-sans text-[17px] font-medium text-ink focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent';

/**
 * 책 메뉴 — 시안 book-layer.html `#bmenu`. 상단 바(모바일)나 옆 칸(데스크톱)의 "더 보기"로 여는 바텀 시트.
 * 책 지우기는 한 번 더 묻는다(덧붙인 생각·댓글·좋아요·공유 링크까지 함께 사라지고 되돌릴 수 없다).
 */
export default function BookActionsMenu({
  userBookId,
  title,
  bookId,
  isFinished = false,
  triggerClassName,
}: {
  userBookId: string;
  title: string;
  bookId?: string;
  isFinished?: boolean;
  triggerClassName?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');
  const action = useActionLock();

  const closeConfirm = () => {
    if (!action.isLocked()) setConfirmOpen(false);
  };
  const remove = async () => {
    if (!action.acquire()) return;
    setError('');
    try {
      const response = await apiFetch(`/api/books/${userBookId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('delete failed');
      // A fresh document clears visited pages from the client Router Cache.
      window.location.replace('/books');
    } catch (cause) {
      if (!(cause instanceof SessionExpiredError)) {
        setError('지웠는지 확인하지 못했어요. 다시 시도해 주세요.');
      }
      action.release();
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="책 메뉴"
        aria-haspopup="dialog"
        onClick={() => setMenuOpen(true)}
        className={clsx(
          'grid h-11 w-11 place-items-center rounded-full text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent',
          triggerClassName
        )}
      >
        <Ellipsis size={23} strokeWidth={1.75} aria-hidden />
      </button>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} ariaLabel="책 메뉴">
        <div className="[&>*:last-child]:border-b [&>*:last-child]:border-hairline">
          {isFinished && bookId && (
            <Link href={`/books/${bookId}/excerpts`} className={ROW}>
              <BookOpen size={20} strokeWidth={1.75} className="text-ink-sub" aria-hidden />
              발췌집 펼치기
            </Link>
          )}
          <Link href="/search" className={ROW}>
            <Search size={20} strokeWidth={1.75} className="text-ink-sub" aria-hidden />
            책과 기록 찾기
          </Link>
          <button
            type="button"
            className={clsx(ROW, 'text-danger')}
            onClick={() => {
              setMenuOpen(false);
              setError('');
              setConfirmOpen(true);
            }}
          >
            <Trash2 size={20} strokeWidth={1.75} aria-hidden />이 책 지우기
          </button>
        </div>
      </Sheet>

      <Sheet open={confirmOpen} onClose={closeConfirm} title="이 책과 기록을 지울까요?">
        <p className="break-words font-serif text-[18px] font-semibold text-ink">{title}</p>
        <div className="mt-3 space-y-2 font-serif text-[17px] leading-[1.65] text-ink-sub">
          <p>이 책과 남긴 문장·생각이 모두 지워져요. 덧붙인 생각, 댓글과 좋아요도 함께 지워져요.</p>
          <p>공유 링크로도 볼 수 없게 되고, 지운 기록은 되돌릴 수 없어요.</p>
        </div>
        {error && (
          <p role="alert" className="mt-4 font-sans text-caption text-danger">
            {error}
          </p>
        )}
        <div className="mt-5 flex gap-2" aria-busy={action.busy}>
          <button
            type="button"
            onClick={closeConfirm}
            disabled={action.busy}
            data-autofocus
            className={`${BTN_LINE} flex-1`}
          >
            그대로 두기
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={action.busy}
            className={`${BTN_DANGER} flex-1`}
          >
            {action.busy ? '지우는 중…' : '책과 기록 지우기'}
          </button>
        </div>
      </Sheet>
    </>
  );
}
