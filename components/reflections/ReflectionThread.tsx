'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Sheet from '@/components/ui/Sheet';
import { Dialog } from '@headlessui/react';
import { apiFetch, SessionExpiredError } from '@/lib/api/fetch';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useActionLock } from '@/hooks/useActionLock';
import { todayKST } from '@/lib/dates';
import { announceReflectionChange, clearOtherReflectionDrafts } from '@/lib/reflections/draft';
import type { EntryReflection, ReflectionPage, ReflectionSummary } from '@/lib/reflections/types';
import { daysBetween, laterLabel } from '@/components/entry/dates';
import ReflectionComposer from './ReflectionComposer';
import ReflectionPile, { ReflectionLoadState } from './ReflectionPile';

export { thoughtDate } from './thoughtDate';

/**
 * 덧붙인 생각 — 그때의 생각 아래 간지 묶음. 불러오기·쓰기·고치기·지우기·초안 보관 규칙은 그대로이고,
 * 쓰기와 고치기는 바텀 시트에서 한다(시안 entry-layer.html).
 */
export default function ReflectionThread({
  entryId,
  openComposer = false,
  onSummary,
  onDraftSafetyChange,
  entryDate,
  quote,
}: {
  entryId: string;
  openComposer?: boolean;
  onSummary?: (summary: ReflectionSummary | null) => void;
  onDraftSafetyChange?: (unsafe: boolean) => void;
  /** 기록한 날 — 간지 머리('이틀 뒤 · 9월 18일')와 시트 제목에 쓴다 */
  entryDate?: string;
  /** 쓰는 시트 위에 다시 보여 줄 원래 문장 */
  quote?: string | null;
}) {
  const router = useRouter();
  const [page, setPage] = useState<ReflectionPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composer, setComposer] = useState(openComposer);
  const [previousOpenComposer, setPreviousOpenComposer] = useState(openComposer);
  if (openComposer !== previousOpenComposer) {
    setPreviousOpenComposer(openComposer);
    if (openComposer) setComposer(true);
  }
  const [editing, setEditing] = useState<EntryReflection | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [unsafe, setUnsafe] = useState(false);
  const [discardPrompt, setDiscardPrompt] = useState(false);
  const [status, setStatus] = useState('');
  const [writing, setWriting] = useState(false);
  const deletion = useActionLock();
  const request = useRef<AbortController | null>(null);
  const epoch = useRef(0);
  const pageRef = useRef<ReflectionPage | null>(null);
  const summaryCallback = useRef(onSummary);
  useEffect(() => {
    summaryCallback.current = onSummary;
  }, [onSummary]);
  const addButton = useRef<HTMLButtonElement>(null);
  const container = useRef<HTMLElement>(null);
  const deleteTrigger = useRef<HTMLButtonElement | null>(null);
  const load = useCallback(
    async (cursor: string | null = null) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      const version = ++epoch.current;
      setLoading(true);
      setError('');
      let accessRevoked = false;
      try {
        const response = await apiFetch(
          `/api/entries/${entryId}/reflections${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
          { cache: 'no-store', signal: controller.signal }
        );
        accessRevoked = [401, 403, 404].includes(response.status);
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? '이 기록을 더 이상 볼 수 없습니다.'
              : '이어 남긴 생각을 불러오지 못했습니다.'
          );
        const data: ReflectionPage = await response.json();
        if (controller.signal.aborted || epoch.current !== version) return;
        const old = pageRef.current;
        if (old && old.viewerId !== data.viewerId) {
          setComposer(false);
          setEditing(null);
        }
        const next = {
          ...data,
          items:
            cursor && old
              ? [...old.items, ...data.items].filter(
                  (item, i, list) => list.findIndex((row) => row.id === item.id) === i
                )
              : data.items,
        };
        pageRef.current = next;
        setPage(next);
        summaryCallback.current?.(data.summary);
      } catch (cause) {
        if (controller.signal.aborted || epoch.current !== version) return;
        if (!(cause instanceof SessionExpiredError))
          setError(cause instanceof Error ? cause.message : '생각을 불러오지 못했습니다.');
        if (accessRevoked || cause instanceof SessionExpiredError) {
          setPage(null);
          pageRef.current = null;
          summaryCallback.current?.(null);
        }
      } finally {
        if (!controller.signal.aborted && epoch.current === version) setLoading(false);
      }
    },
    [entryId]
  );
  useEffect(() => {
    // External authenticated API synchronization, including initial loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const refresh = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const changed = (event: Event) => {
      if ((event as CustomEvent).detail === entryId) void load();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('readiary:reflections-changed', changed);
    const supabase = createSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === 'SIGNED_OUT' ||
        (event === 'SIGNED_IN' && pageRef.current && session?.user.id !== pageRef.current.viewerId)
      ) {
        request.current?.abort();
        epoch.current++;
        pageRef.current = null;
        setPage(null);
        setComposer(false);
        setEditing(null);
        setLoading(false);
        summaryCallback.current?.(null);
        setError('로그인 상태가 바뀌었습니다. 페이지를 다시 열어 주세요.');
        try {
          clearOtherReflectionDrafts(sessionStorage, session?.user.id ?? null);
        } catch {
          /* no retained account data rendered */
        }
      }
    });
    return () => {
      request.current?.abort();
      subscription.unsubscribe();
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('readiary:reflections-changed', changed);
    };
  }, [entryId, load]);
  const safety = useCallback(
    (value: boolean) => {
      setUnsafe(value);
      onDraftSafetyChange?.(value);
    },
    [onDraftSafetyChange]
  );
  const saved = () => {
    setComposer(false);
    setEditing(null);
    setStatus('생각을 남겼어요.');
    announceReflectionChange(entryId);
    router.refresh();
    requestAnimationFrame(() => addButton.current?.focus());
  };
  const cancel = () => {
    // 남기는 중에는 시트를 닫지 않는다 — 결과를 받기 전에 쓰던 칸이 사라지지 않게
    if (writing) return;
    if (unsafe) {
      setDiscardPrompt(true);
      return;
    }
    setComposer(false);
    setEditing(null);
    requestAnimationFrame(() => addButton.current?.focus());
  };
  const closeDelete = () => {
    if (deletion.isLocked()) return;
    setDeleting(null);
    setDeleteError('');
    requestAnimationFrame(() => deleteTrigger.current?.focus());
  };
  const remove = async () => {
    if (!deleting || !deletion.acquire()) return;
    setDeleteError('');
    try {
      const response = await apiFetch(`/api/entries/${entryId}/reflections/${deleting}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('생각을 지우지 못했습니다. 다시 시도해 주세요.');
      setDeleting(null);
      setStatus('생각을 지웠어요.');
      requestAnimationFrame(() => addButton.current?.focus());
      announceReflectionChange(entryId);
      router.refresh();
    } catch (cause) {
      if (!(cause instanceof SessionExpiredError))
        setDeleteError(
          cause instanceof Error
            ? cause.message
            : '삭제 결과를 확인하지 못했습니다. 다시 시도해 주세요.'
        );
    } finally {
      deletion.release();
    }
  };
  const today = todayKST();
  const later = entryDate ? laterLabel(Math.max(0, daysBetween(entryDate, today))) : '';
  const items: EntryReflection[] = page ? [...page.items].reverse() : [];
  const sheetOpen = !!page?.canWrite && (composer || !!editing);
  return (
    <section ref={container} aria-label="덧붙인 생각">
      <ReflectionLoadState
        loading={loading}
        hasPage={!!page}
        error={error}
        onRetry={() => void load()}
      />
      {page && (
        <>
          <ReflectionPile
            items={items}
            entryDate={entryDate}
            today={today}
            canWrite={page.canWrite}
            entryIsPrivate={page.entryIsPrivate}
            actionsDisabled={composer || !!editing || !!deleting}
            onEdit={(item) => setEditing(item)}
            onDelete={(item, trigger) => {
              deleteTrigger.current = trigger;
              setDeleteError('');
              setDeleting(item.id);
            }}
            emptyText={
              page.canWrite ? '다시 읽으니 어떤 생각이 드나요?' : '덧붙인 생각이 아직 없어요.'
            }
            addAction={
              page.canWrite ? (
                <Button
                  ref={addButton}
                  size="sm"
                  disabled={!!deleting || composer || !!editing}
                  onClick={() => setComposer(true)}
                >
                  지금의 생각 덧붙이기
                </Button>
              ) : undefined
            }
          />
          {page.nextCursor && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              disabled={loading}
              onClick={() => void load(page.nextCursor)}
            >
              다음 생각 더 읽기
            </Button>
          )}
        </>
      )}
      <Sheet
        open={sheetOpen}
        onClose={cancel}
        title={editing ? '덧붙인 생각 고치기' : later ? `${later}, 오늘의 생각` : '지금의 생각'}
      >
        {quote && !editing && (
          <p className="whitespace-pre-wrap break-words font-serif text-[16px] leading-[1.6] text-ink-sub">
            {quote}
          </p>
        )}
        {page && sheetOpen && (
          <ReflectionComposer
            key={editing?.id ?? 'new'}
            entryId={entryId}
            viewerId={page.viewerId}
            entryIsPrivate={page.entryIsPrivate}
            editing={editing ?? undefined}
            onSaved={saved}
            onCancel={cancel}
            cancelLabel={null}
            onBusyChange={setWriting}
            onDraftSafetyChange={safety}
          />
        )}
        {discardPrompt && (
          <div
            role="group"
            aria-label="보관하지 못한 초안 취소"
            className="mt-4 border-t border-hairline pt-4"
          >
            <p className="font-sans text-body text-ink">
              초안을 보관하지 못했어요. 닫으면 쓴 내용이 사라집니다.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                autoFocus
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setDiscardPrompt(false);
                  requestAnimationFrame(() =>
                    document.querySelector<HTMLTextAreaElement>('[data-reflection-body]')?.focus()
                  );
                }}
              >
                계속 쓰기
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => {
                  setDiscardPrompt(false);
                  setComposer(false);
                  setEditing(null);
                  safety(false);
                }}
              >
                버리고 닫기
              </Button>
            </div>
          </div>
        )}
      </Sheet>
      <Modal isOpen={!!deleting && !!page?.canWrite} onClose={closeDelete}>
        <div>
          <Dialog.Title className="font-sans text-[18px] font-bold text-ink">
            이 생각을 지울까요?
          </Dialog.Title>
          <Dialog.Description className="mt-2 font-serif text-[17px] leading-[1.6] text-ink-sub">
            그때의 생각과 다른 덧붙인 생각은 남아요. 지우면 되돌릴 수 없어요.
          </Dialog.Description>
          {deleteError && (
            <p role="alert" className="mt-3 font-sans text-caption text-danger">
              {deleteError}
            </p>
          )}
          <div className="mt-5 flex gap-2">
            <Button
              autoFocus
              variant="secondary"
              className="flex-1"
              disabled={deletion.busy}
              onClick={closeDelete}
            >
              그대로 두기
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              disabled={deletion.busy}
              onClick={() => void remove()}
            >
              {deletion.busy ? '지우는 중…' : '생각 지우기'}
            </Button>
          </div>
        </div>
      </Modal>
      <p className="sr-only" role="status">
        {status}
      </p>
    </section>
  );
}
