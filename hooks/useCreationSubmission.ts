'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch, SessionExpiredError } from '@/lib/api/fetch';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useActionLock } from './useActionLock';
import {
  clearCreationSubmissions,
  readSubmission,
  submissionKey,
  type CreationSubmission,
} from '@/lib/actions/creationSubmission';

export function useCreationSubmission<T extends object>(
  scope: string,
  url: string,
  idField: string
) {
  const lock = useActionLock();
  const [redirecting, setRedirecting] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [snapshot, setSnapshot] = useState<CreationSubmission<T> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const owner = useRef<string | null>(null);
  const current = useRef<CreationSubmission<T> | null>(null);
  const generation = useRef(0);
  const ownerVersion = useRef(0);
  useEffect(() => {
    let active = true;
    const version = ++generation.current;
    owner.current = null;
    current.current = null;
    const supabase = createSupabaseClient();
    const restore = (userId: string | null) => {
      if (!active || generation.current !== version) return;
      if (owner.current === userId && userId) return;
      ownerVersion.current++;
      owner.current = userId;
      setAccountId(userId);
      current.current = null;
      setSnapshot(null);
      setReady(false);
      try {
        clearCreationSubmissions(sessionStorage, userId ?? undefined);
        if (!userId) {
          setError('로그인이 필요합니다. 새로고침해 주세요.');
          return;
        }
        setError(null);
        const stored = readSubmission<T>(sessionStorage, submissionKey(userId, scope), userId);
        current.current = stored;
        setSnapshot(stored);
        setReady(true);
      } catch {
        setError('저장 확인 정보를 보관할 수 없어요. 브라우저 저장 공간을 확인해 주세요.');
      }
    };
    let authChanged = false;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (authChanged) return;
      if (!error) restore(data.user?.id ?? null);
      else if (active) setError('로그인 상태를 확인하지 못했어요. 새로고침해 주세요.');
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        authChanged = true;
        restore(session?.user.id ?? null);
      }
    });
    return () => {
      active = false;
      generation.current = version + 1;
      subscription.unsubscribe();
    };
  }, [scope]);

  const submit = async (payload: T): Promise<Record<string, unknown> | null> => {
    if (!ready || !owner.current || !lock.acquire()) return null;
    const userId = owner.current;
    const ownerEpoch = ownerVersion.current;
    const version = generation.current;
    const key = submissionKey(userId, scope);
    let submitted: CreationSubmission<T>;
    try {
      submitted = current.current ?? { id: crypto.randomUUID(), userId, payload };
      sessionStorage.setItem(key, JSON.stringify(submitted));
      current.current = submitted;
      setSnapshot(submitted);
    } catch {
      lock.release();
      setError('저장 준비를 보관하지 못했어요. 브라우저 저장 공간을 확인해 주세요.');
      throw new Error('저장 준비를 보관하지 못했어요. 브라우저 저장 공간을 확인해 주세요.');
    }
    setError(null);
    const controller = new AbortController();
    let leaving = false;
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await apiFetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...submitted.payload, [idField]: submitted.id }),
      });
      const data = await response.json().catch(() => null);
      if (
        generation.current !== version ||
        owner.current !== userId ||
        ownerEpoch !== ownerVersion.current
      )
        return null;
      if (!response.ok) {
        // Only explicit pre-write rejection allows editing; unknown outcomes retain the ID.
        if ([400, 403, 422].includes(response.status)) {
          sessionStorage.removeItem(key);
          current.current = null;
          setSnapshot(null);
          throw new Error(data?.error ?? data?.message ?? '입력을 확인해 주세요.');
        }
        throw new Error('저장 결과를 확인하지 못했어요. 저장 확인·재시도로 확인해 주세요.');
      }
      if (
        !data ||
        (idField !== 'client_request_id' && data.id !== submitted.id) ||
        (idField === 'client_request_id' && (!data.success || !data.user_book_id))
      ) {
        throw new Error('저장 결과를 확인하지 못했어요. 저장 확인·재시도로 확인해 주세요.');
      }
      if (sessionStorage.getItem(key) === JSON.stringify(submitted)) sessionStorage.removeItem(key);
      current.current = null;
      setSnapshot(null);
      return data;
    } catch (cause) {
      if (
        generation.current !== version ||
        owner.current !== userId ||
        ownerEpoch !== ownerVersion.current
      )
        return null;
      if (cause instanceof SessionExpiredError) {
        leaving = true;
        setRedirecting(true);
        throw cause;
      }
      const message = controller.signal.aborted
        ? '응답을 받지 못했어요. 저장 확인·재시도로 확인해 주세요.'
        : cause instanceof Error
          ? cause.message
          : '저장 결과를 확인하지 못했어요. 다시 확인해 주세요.';
      if (generation.current === version) setError(message);
      throw new Error(message);
    } finally {
      clearTimeout(timeout);
      if (!leaving) lock.release();
    }
  };
  return {
    accountId,
    ready: ready && !redirecting,
    redirecting,
    snapshot,
    error,
    busy: lock.busy,
    submit,
  };
}
