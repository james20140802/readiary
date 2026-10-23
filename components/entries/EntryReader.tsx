'use client';
import { useReflectionFeature } from '@/components/features/ReflectionFeatureProvider';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import InertBackground from '@/components/ui/InertBackground';
import ReflectionPreview from '@/components/reflections/ReflectionPreview';
import { ArrowRight } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { apiFetch, SessionExpiredError } from '@/lib/api/fetch';
import type { EntryReadData } from '@/types/entry';

/** Mounted only while open: close discards content, reopening always checks current access. */
export default function EntryReader({
  entryId,
  onClose,
}: {
  entryId: string;
  onClose: () => void;
}) {
  const enabled = useReflectionFeature();
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
  }, [entryId, attempt, enabled]);

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
    <Dialog static open onClose={onClose} className="relative z-[100]">
      <InertBackground />
      <div className="fixed inset-0 bg-scrim/[.32]" aria-hidden="true" />
      <div className="fixed inset-0 flex items-end justify-center lg:items-center">
        <DialogPanel className="flex max-h-[88dvh] w-full max-w-[560px] flex-col rounded-t-[18px] bg-sheet text-ink shadow-[0_-10px_40px_-10px_rgb(30_20_10/.35)] lg:rounded-[16px] lg:shadow-[0_30px_80px_-20px_rgb(30_20_10/.45)]">
          <div
            aria-hidden
            className="mx-auto mt-2 h-[5px] w-9 shrink-0 rounded-[3px] bg-[rgb(127_127_127/.35)] lg:hidden"
          />
          <header className="flex min-h-12 shrink-0 items-center gap-2 px-[22px] pt-2.5">
            <DialogTitle className="font-sans text-[18px] font-bold text-ink">
              기록 읽기
            </DialogTitle>
            <button
              type="button"
              autoFocus
              onClick={onClose}
              aria-label="기록 닫기"
              className="ml-auto min-h-11 px-1 font-sans text-[16px] font-semibold text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              닫기
            </button>
          </header>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-[22px] pb-[calc(26px+var(--app-safe-bottom))] pt-2">
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
                    className="mt-4 min-h-10 rounded-full border border-hairline-strong px-4 font-sans text-button-sm text-ink"
                  >
                    다시 불러오기
                  </button>
                )}
              </div>
            )}
            {entry && (
              <article>
                <h3 className="break-words font-sans text-caption font-medium text-ink-sub">
                  {entry.bookTitle}
                </h3>
                <p className="mt-1 font-sans text-caption text-ink-faint">
                  {entry.date.replaceAll('-', '.')}
                  {entry.fromPage !== null &&
                    ` · ${entry.fromPage}${entry.toPage !== null && entry.toPage !== entry.fromPage ? `–${entry.toPage}` : ''}쪽`}
                </p>
                {entry.quote?.trim() && (
                  <blockquote className="mt-4 whitespace-pre-wrap break-words font-serif text-quote text-ink">
                    {entry.quote}
                  </blockquote>
                )}
                {entry.note?.trim() && (
                  <section className="mt-5">
                    <h4 className="font-sans text-[14px] font-semibold text-ink-faint">
                      그때의 생각
                    </h4>
                    <p className="mt-1 whitespace-pre-wrap break-words font-serif text-note text-ink-sub">
                      {entry.note}
                    </p>
                  </section>
                )}
                <ReflectionPreview
                  entryId={entry.id}
                  summary={entry.reflectionSummary}
                  own={entry.canWrite}
                  href={entry.detailHref}
                  onNavigate={onClose}
                  trailingAction={
                    <Link
                      href={entry.detailHref}
                      onClick={onClose}
                      className="inline-flex min-h-11 items-center gap-1 text-button-sm text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                    >
                      자세히 <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
                    </Link>
                  }
                />
              </article>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
