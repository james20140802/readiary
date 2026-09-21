'use client';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import InertBackground from '@/components/ui/InertBackground';
import Button from '@/components/ui/Button';
import ReflectionThread from '@/components/reflections/ReflectionThread';
import { X } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { apiFetch, SessionExpiredError } from '@/lib/api/fetch';
import type { EntryReadData } from '@/types/entry';

/** Mounted only while open: close discards content, reopening always checks current access. */
export default function EntryReader({
  entryId,
  onClose,
  openComposer = false,
}: {
  entryId: string;
  openComposer?: boolean;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [unsafe, setUnsafe] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [hasThoughts, setHasThoughts] = useState(false);
  const summaryChanged = useCallback(
    (summary: { total: number } | null) => setHasThoughts(!!summary?.total),
    []
  );
  const close = () => (unsafe ? setConfirmClose(true) : onClose());
  const [entry, setEntry] = useState<EntryReadData | null>(null);
  const [error, setError] = useState<'unavailable' | 'failed' | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function read() {
      try {
        const response = await apiFetch(`/api/entries/${encodeURIComponent(entryId)}/read`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (controller.signal.aborted) return;
        if (!response.ok) {
          if ([401, 403, 404].includes(response.status)) setEntry(null);
          setError(response.status === 404 ? 'unavailable' : 'failed');
          return;
        }
        const data: EntryReadData = await response.json();
        if (!controller.signal.aborted) setEntry(data);
      } catch (cause) {
        if (!controller.signal.aborted && !(cause instanceof SessionExpiredError))
          setError('failed');
      }
    }
    void read();
    return () => controller.abort();
  }, [entryId, attempt]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        setError(null);
        setAttempt((value) => value + 1);
      }
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const {
      data: { subscription },
    } = createSupabaseClient().auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setEntry(null);
        refresh();
      }
      if (event === 'SIGNED_IN') {
        if (entry?.viewerId && session?.user.id !== entry.viewerId) setEntry(null);
        refresh();
      }
    });
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      subscription.unsubscribe();
    };
  }, [entry?.viewerId]);
  return (
    <Dialog static open onClose={close} className="relative z-[100]">
      <InertBackground />
      <div className="fixed inset-0 bg-ink/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-6">
        <DialogPanel
          ref={panel}
          className="flex max-h-[90dvh] w-full flex-col rounded-t-md border border-hairline bg-card sm:max-w-2xl sm:rounded-md"
        >
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-hairline px-6 py-4">
            <DialogTitle className="font-serif text-section-title text-ink">기록 읽기</DialogTitle>
            <button
              type="button"
              autoFocus
              onClick={close}
              aria-label="기록 닫기"
              className="flex h-11 w-11 items-center justify-center rounded-full text-ink-sub hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <X size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </header>
          {confirmClose && (
            <div
              role="group"
              aria-label="초안 보관 실패"
              className="border-b border-hairline px-6 py-4"
            >
              <p className="text-body text-ink">
                초안을 보관하지 못했어요. 닫으면 작성한 내용이 사라집니다.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  autoFocus
                  variant="secondary"
                  onClick={() => {
                    setConfirmClose(false);
                    requestAnimationFrame(() => panel.current?.querySelector('textarea')?.focus());
                  }}
                >
                  계속 쓰기
                </Button>
                <Button variant="danger" onClick={onClose}>
                  버리고 닫기
                </Button>
              </div>
            </div>
          )}
          <div className="min-h-0 overflow-y-auto overscroll-contain px-6 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8">
            {!entry && !error && (
              <p role="status" className="text-body text-ink-sub">
                기록을 불러오는 중입니다.
              </p>
            )}
            {error && (
              <div role="status" className="text-body text-ink-sub">
                <p>
                  {error === 'unavailable'
                    ? '기록을 볼 수 없습니다.'
                    : '기록을 불러오지 못했습니다.'}
                </p>
                {error === 'failed' && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setAttempt((value) => value + 1);
                    }}
                    className="mt-4 rounded-full border border-hairline-strong px-4 py-2 text-ink"
                  >
                    다시 불러오기
                  </button>
                )}
              </div>
            )}
            {entry && (
              <article>
                <h3 className="break-words font-serif text-section-title text-ink">
                  {entry.bookTitle}
                </h3>
                <p className="mt-2 font-sans text-caption text-ink-sub">
                  {entry.date.replaceAll('-', '.')}
                  {entry.fromPage !== null &&
                    ` · ${entry.fromPage}${entry.toPage !== null && entry.toPage !== entry.fromPage ? `–${entry.toPage}` : ''}쪽`}
                </p>
                {entry.quote?.trim() && (
                  <blockquote className="mt-6 whitespace-pre-wrap break-words font-serif text-quote text-ink">
                    {entry.quote}
                  </blockquote>
                )}
                {entry.note?.trim() && (
                  <section className="mt-6 border-t border-hairline pt-5">
                    <h4 className="font-sans text-caption text-ink-sub">
                      {hasThoughts ? '그때 남긴 생각' : '남긴 생각'}
                    </h4>
                    <p className="mt-3 whitespace-pre-wrap break-words font-serif text-note text-ink">
                      {entry.note}
                    </p>
                  </section>
                )}
                <ReflectionThread
                  key={entry.id}
                  entryId={entry.id}
                  openComposer={openComposer}
                  onSummary={summaryChanged}
                  onDraftSafetyChange={setUnsafe}
                />
                <Link
                  href={entry.detailHref}
                  onClick={(e) => {
                    if (unsafe) {
                      e.preventDefault();
                      setConfirmClose(true);
                    }
                  }}
                  className="mt-6 inline-flex min-h-11 items-center text-button-sm text-ink-sub underline underline-offset-4"
                >
                  기록 상세에서 읽기
                </Link>
              </article>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
