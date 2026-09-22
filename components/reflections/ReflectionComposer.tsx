'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { useCreationSubmission } from '@/hooks/useCreationSubmission';
import { useActionLock } from '@/hooks/useActionLock';
import { apiFetch, SessionExpiredError } from '@/lib/api/fetch';
import { Textarea } from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import { Lock } from 'lucide-react';
import {
  readReflectionDraft,
  reflectionDraftKey,
  clearOtherReflectionDrafts,
} from '@/lib/reflections/draft';
import { REFLECTION_LIMIT, validReflectionBody } from '@/lib/reflections/types';
import type { EntryReflection } from '@/lib/reflections/types';

export default function ReflectionComposer({
  entryId,
  viewerId,
  entryIsPrivate,
  editing,
  onSaved,
  onCancel,
  onDraftSafetyChange,
}: {
  entryId: string;
  viewerId: string;
  entryIsPrivate: boolean;
  editing?: EntryReflection;
  onSaved: () => void;
  onCancel: () => void;
  onDraftSafetyChange?: (unsafe: boolean) => void;
}) {
  const create = useCreationSubmission<{ body: string; is_private: boolean }>(
    `reflection:${entryId}`,
    `/api/entries/${entryId}/reflections`,
    'id'
  );
  const lock = useActionLock();
  const id = useId();
  const key = reflectionDraftKey(viewerId, entryId, editing?.id);
  const [body, setBody] = useState(editing?.body ?? '');
  const [isPrivate, setPrivate] = useState(editing?.is_private ?? true);
  const [restored, setRestored] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState<EntryReflection | null>(null);
  const [version, setVersion] = useState(editing?.updated_at);
  const [uncertain, setUncertain] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    try {
      clearOtherReflectionDrafts(sessionStorage, viewerId);
      const draft = readReflectionDraft(sessionStorage, key);
      if (draft) {
        // Hydrate a browser-only draft after mounting; server render cannot read sessionStorage.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBody(draft.body);
        if (editing && draft.updated_at) setVersion(draft.updated_at);
        setPrivate(draft.is_private);
      }
    } catch {
      setStorageFailed(true);
    }
    setRestored(true);
  }, [key, viewerId, editing]);
  const shownBody = !editing && create.snapshot ? create.snapshot.payload.body : body;
  const shownPrivate = !editing && create.snapshot ? create.snapshot.payload.is_private : isPrivate;
  const dirty =
    shownBody !== (editing?.body ?? '') || shownPrivate !== (editing?.is_private ?? true);
  useEffect(() => {
    if (!restored || create.accountId !== viewerId) return;
    try {
      if (dirty)
        sessionStorage.setItem(
          key,
          JSON.stringify({ body: shownBody, is_private: shownPrivate, updated_at: version })
        );
      else sessionStorage.removeItem(key);
      // Report the result of writing to external browser storage.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStorageFailed(false);
    } catch {
      setStorageFailed(true);
    }
  }, [key, restored, dirty, shownBody, shownPrivate, create.accountId, viewerId, version]);
  useEffect(() => {
    onDraftSafetyChange?.(storageFailed && dirty);
    const warn = (e: BeforeUnloadEvent) => {
      if (storageFailed && dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
      onDraftSafetyChange?.(false);
    };
  }, [storageFailed, dirty, onDraftSafetyChange]);
  useEffect(() => {
    if (!restored) return;
    const area = form.current?.querySelector('textarea');
    area?.focus();
  }, [restored]);
  const busy = create.busy || lock.busy || create.redirecting;
  const frozen = busy || !!(!editing && create.snapshot) || uncertain;
  const resize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 420)}px`;
  };
  useEffect(() => {
    const area = form.current?.querySelector('textarea');
    if (area) resize(area);
  }, [shownBody]);
  const finish = () => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* Visible success still removes the in-memory draft. */
    }
    onDraftSafetyChange?.(false);
    onSaved();
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validReflectionBody(shownBody)) {
      setError('생각을 1자 이상 10,000자 이내로 입력해 주세요.');
      form.current?.querySelector('textarea')?.focus();
      return;
    }
    if (create.accountId !== viewerId || !create.ready) return;
    setError('');
    if (!editing) {
      try {
        if (
          await create.submit({
            body: shownBody.trim(),
            is_private: entryIsPrivate ? true : shownPrivate,
          })
        )
          finish();
      } catch (cause) {
        if (!(cause instanceof SessionExpiredError) && alive.current)
          setError(cause instanceof Error ? cause.message : '저장하지 못했습니다.');
      }
      return;
    }
    if (!lock.acquire()) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await apiFetch(`/api/entries/${entryId}/reflections/${editing.id}`, {
        method: 'PATCH',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: shownBody.trim(),
          is_private: shownPrivate,
          updated_at: version,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!alive.current) return;
      if (response.ok) {
        finish();
        return;
      }
      setUncertain(response.status >= 500);
      if (response.status === 409) {
        // Keep the draft, and fetch the current version only after an explicit conflict.
        const read = await apiFetch(`/api/entries/${entryId}/reflections/${editing.id}`, {
          cache: 'no-store',
        });
        if (read.ok) {
          const latest = await read.json();
          if (alive.current) setConflict(latest);
        }
      }
      setError(result?.error ?? '생각을 고치지 못했습니다. 다시 확인해 주세요.');
    } catch (cause) {
      if (alive.current && !(cause instanceof SessionExpiredError)) {
        setUncertain(true);
        setError('저장 결과를 확인하지 못했습니다. 같은 내용으로 다시 확인해 주세요.');
      }
    } finally {
      clearTimeout(timeout);
      lock.release();
    }
  };
  return (
    <form ref={form} noValidate onSubmit={submit} className="mt-5 space-y-4" aria-busy={busy}>
      <Textarea
        id={id}
        label={editing ? '생각 고치기' : '지금의 생각'}
        variant="line"
        fullWidth
        rows={4}
        className="resize-none font-serif placeholder:text-ink-sub"
        placeholder="다시 읽으니 어떤 생각이 드나요?"
        value={shownBody}
        disabled={frozen || !restored || create.accountId !== viewerId}
        aria-invalid={!!error}
        aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Chip
          selected={entryIsPrivate || shownPrivate}
          aria-pressed={entryIsPrivate || shownPrivate}
          aria-describedby={`${id}-help`}
          disabled={frozen || entryIsPrivate || !restored || create.accountId !== viewerId}
          onClick={() => setPrivate((value) => !value)}
        >
          <Lock size={12} strokeWidth={1.75} aria-hidden />
          비공개
        </Chip>
        <span className="text-caption tabular-nums text-ink-sub">
          {Array.from(shownBody).length.toLocaleString('ko-KR')} /{' '}
          {REFLECTION_LIMIT.toLocaleString('ko-KR')}
        </span>
      </div>
      <p id={`${id}-help`} className="text-caption text-ink-sub">
        {entryIsPrivate
          ? '원문이 비공개여서 나만 볼 수 있어요.'
          : shownPrivate
            ? '나만 볼 수 있어요.'
            : '친구가 볼 수 있어요.'}
      </p>
      {storageFailed && dirty && (
        <p role="status" className="text-caption text-danger">
          초안을 이 기기에 보관하지 못했어요. 닫기 전에 내용을 복사해 주세요.
        </p>
      )}
      {(error || create.error) && (
        <p id={`${id}-error`} role="alert" className="text-caption text-danger">
          {error || create.error}
        </p>
      )}
      {conflict && (
        <div className="border-y border-hairline py-4">
          <p className="text-caption text-ink-sub">현재 저장된 생각</p>
          <p className="mt-2 whitespace-pre-wrap font-serif text-note text-ink">{conflict.body}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => {
              setVersion(conflict.updated_at);
              setConflict(null);
              setUncertain(false);
              setError('작성 중인 내용을 확인한 뒤 고쳐 남겨 주세요.');
            }}
          >
            현재 버전을 기준으로 이어 고치기
          </Button>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
          취소
        </Button>
        <Button
          type="submit"
          disabled={busy || !create.ready || create.accountId !== viewerId || !!conflict}
        >
          {busy
            ? '남기는 중…'
            : uncertain || create.snapshot
              ? '저장 확인·재시도'
              : editing
                ? '고쳐 남기기'
                : '남기기'}
        </Button>
      </div>
    </form>
  );
}
