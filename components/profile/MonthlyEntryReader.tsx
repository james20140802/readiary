'use client';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { apiFetch, SessionExpiredError } from '@/lib/api/fetch';
import type { EntryReadData } from '@/types/entry';

/** Mounted only while open: close discards content, reopening always checks current access. */
export default function MonthlyEntryReader({
  entryId,
  onClose,
}: {
  entryId: string;
  onClose: () => void;
}) {
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

  return (
    <Dialog open onClose={onClose} className="relative z-[100]">
      <div className="fixed inset-0 bg-ink/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-6">
        <DialogPanel className="flex max-h-[90dvh] w-full flex-col rounded-t-md border border-hairline bg-card sm:max-w-xl sm:rounded-md">
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-hairline px-6 py-4">
            <DialogTitle className="font-serif text-section-title text-ink">기록 원문</DialogTitle>
            <button
              type="button"
              autoFocus
              onClick={onClose}
              aria-label="원문 닫기"
              className="flex h-11 w-11 items-center justify-center rounded-full text-ink-sub hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <X size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </header>
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
                    <h4 className="font-sans text-caption text-ink-sub">남긴 생각</h4>
                    <p className="mt-3 whitespace-pre-wrap break-words font-serif text-note text-ink">
                      {entry.note}
                    </p>
                  </section>
                )}
              </article>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
