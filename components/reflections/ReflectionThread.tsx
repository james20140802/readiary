'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { apiFetch, SessionExpiredError } from '@/lib/api/fetch';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useActionLock } from '@/hooks/useActionLock';
import { announceReflectionChange, clearOtherReflectionDrafts } from '@/lib/reflections/draft';
import type { EntryReflection, ReflectionPage, ReflectionSummary } from '@/lib/reflections/types';
import ReflectionComposer from './ReflectionComposer';

export const thoughtDate = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(value));
export default function ReflectionThread({
  entryId,
  openComposer = false,
  onSummary,
  onDraftSafetyChange,
}: {
  entryId: string;
  openComposer?: boolean;
  onSummary?: (summary: ReflectionSummary | null) => void;
  onDraftSafetyChange?: (unsafe: boolean) => void;
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
  const [unsafe, setUnsafe] = useState(false);
  const [discardPrompt, setDiscardPrompt] = useState(false);
  const [status, setStatus] = useState('');
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
    if (unsafe) {
      setDiscardPrompt(true);
      return;
    }
    setComposer(false);
    setEditing(null);
    requestAnimationFrame(() => addButton.current?.focus());
  };
  const remove = async () => {
    if (!deleting || !deletion.acquire()) return;
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
        setError(
          cause instanceof Error
            ? cause.message
            : '삭제 결과를 확인하지 못했습니다. 다시 시도해 주세요.'
        );
    } finally {
      deletion.release();
    }
  };
  return (
    <section ref={container} className="mt-8 pt-6" aria-label="이어 남긴 생각">
      <h3 className="font-serif text-section-title text-ink">
        이어 남긴 생각
        {page && page.summary.total > 0 && (
          <span className="ml-2 font-sans text-caption text-ink-sub">{page.summary.total}</span>
        )}
      </h3>
      {loading && (
        <p role="status" className="mt-4 text-caption text-ink-sub">
          생각을 불러오는 중입니다.
        </p>
      )}
      {error && (
        <div className="mt-4" role="alert">
          <p className="text-caption text-danger">{error}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => void load()}
          >
            다시 불러오기
          </Button>
        </div>
      )}
      {page && (
        <>
          <ol className="space-y-7 pt-5">
            {(page.canWrite && editing && !page.items.some((item) => item.id === editing.id)
              ? [...page.items, editing].sort(
                  (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)
                )
              : page.items
            ).map((item) => (
              <li key={item.id}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-ink-sub">
                  <p>
                    <time
                      className="inline-flex rounded-b-md rounded-t-sm bg-card-raised px-3 py-1.5"
                      dateTime={item.created_at}
                    >
                      {thoughtDate(item.created_at)}
                    </time>
                    {page.canWrite && (
                      <span>
                        {' '}
                        · {page.entryIsPrivate || item.is_private ? '나만 보기' : '친구 공개'}
                      </span>
                    )}
                    {item.updated_at !== item.created_at && <span> · 수정됨</span>}
                  </p>
                  {page.canWrite && (
                    <div className="flex gap-3">
                      <button
                        className="min-h-10 text-button-sm hover:text-accent disabled:opacity-50"
                        disabled={composer || !!editing || !!deleting}
                        onClick={() => setEditing(item)}
                      >
                        수정
                      </button>
                      <button
                        className="min-h-10 text-button-sm hover:text-danger disabled:opacity-50"
                        disabled={composer || !!editing || !!deleting}
                        onClick={(event) => {
                          deleteTrigger.current = event.currentTarget;
                          setDeleting(item.id);
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
                {editing?.id === item.id ? (
                  <ReflectionComposer
                    entryId={entryId}
                    viewerId={page.viewerId}
                    entryIsPrivate={page.entryIsPrivate}
                    editing={editing}
                    onSaved={saved}
                    onCancel={cancel}
                    onDraftSafetyChange={safety}
                  />
                ) : (
                  <p className="mt-2 whitespace-pre-wrap break-words font-serif text-note text-ink">
                    {item.body}
                  </p>
                )}
                {deleting === item.id && (
                  <div
                    role="group"
                    aria-label="이 생각 삭제"
                    className="mt-4 border-y border-hairline py-4"
                  >
                    <p className="text-body text-ink">이 생각을 삭제할까요?</p>
                    <p className="mt-1 text-caption text-ink-sub">
                      원래 기록과 다른 생각은 남습니다. 삭제는 되돌릴 수 없습니다.
                    </p>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        autoFocus
                        variant="ghost"
                        disabled={deletion.busy}
                        onClick={() => {
                          setDeleting(null);
                          requestAnimationFrame(() => deleteTrigger.current?.focus());
                        }}
                      >
                        취소
                      </Button>
                      <Button
                        variant="danger"
                        disabled={deletion.busy}
                        onClick={() => void remove()}
                      >
                        {deletion.busy ? '지우는 중…' : '생각 삭제'}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>
          {page.nextCursor && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-5"
              disabled={loading}
              onClick={() => void load(page.nextCursor)}
            >
              다음 생각 더 읽기
            </Button>
          )}
          {!page.summary.total && !composer && (
            <p className="mt-1 font-serif text-body text-ink-sub">
              {page.canWrite
                ? '다시 읽으니 어떤 생각이 드나요?'
                : '이어 남긴 생각이 아직 없습니다.'}
            </p>
          )}
          {page.canWrite &&
            !editing &&
            (composer ? (
              <ReflectionComposer
                entryId={entryId}
                viewerId={page.viewerId}
                entryIsPrivate={page.entryIsPrivate}
                onSaved={saved}
                onCancel={cancel}
                onDraftSafetyChange={safety}
              />
            ) : (
              <div className="mt-5 flex justify-end">
                <Button
                  ref={addButton}
                  variant="secondary"
                  disabled={!!deleting}
                  onClick={() => setComposer(true)}
                >
                  지금의 생각 남기기
                </Button>
              </div>
            ))}
        </>
      )}
      {discardPrompt && (
        <div
          role="group"
          aria-label="보관하지 못한 초안 취소"
          className="mt-4 border-y border-hairline py-4"
        >
          <p className="text-body text-ink">
            초안을 보관하지 못했어요. 취소하면 작성한 내용이 사라집니다.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              autoFocus
              variant="secondary"
              onClick={() => {
                setDiscardPrompt(false);
                requestAnimationFrame(() => container.current?.querySelector('textarea')?.focus());
              }}
            >
              계속 쓰기
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDiscardPrompt(false);
                setComposer(false);
                setEditing(null);
                safety(false);
              }}
            >
              버리고 취소
            </Button>
          </div>
        </div>
      )}
      <p className="sr-only" role="status">
        {status}
      </p>
    </section>
  );
}
