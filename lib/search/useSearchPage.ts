'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api/fetch';
import { readSearchPage, saveSearchPage } from './memory';
import type { SearchCursor, SearchPage, SearchRequest } from './types';
interface Result<T> extends SearchPage<T> {
  loading: boolean;
  error: string;
  key: string;
}
export function useSearchPage<T>(userId: string, request: SearchRequest, enabled: boolean) {
  const key = JSON.stringify(request);
  const controller = useRef<AbortController | null>(null);
  const failed = useRef<{ key: string; cursor: SearchCursor | null } | null>(null);
  const [result, setResult] = useState<Result<T>>(() => ({
    key,
    items: [],
    next: null,
    loading: enabled && !readSearchPage<SearchPage<T>>(userId, key),
    error: '',
    ...readSearchPage<SearchPage<T>>(userId, key),
  }));
  const execute = useCallback(
    async (cursor: SearchCursor | null) => {
      controller.current?.abort();
      const active = new AbortController();
      controller.current = active;
      const cached = readSearchPage<SearchPage<T>>(userId, key);
      const base = cursor ? (cached?.items ?? []) : [];
      try {
        const response = await apiFetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...JSON.parse(key), cursor }),
          signal: active.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('검색 결과를 불러오지 못했습니다. 다시 시도해 주세요.');
        const page = (await response.json()) as SearchPage<T>;
        if (active.signal.aborted) return;
        const value = { items: [...base, ...page.items], next: page.next };
        saveSearchPage(userId, key, value);
        failed.current = null;
        setResult({ ...value, key, loading: false, error: '' });
      } catch (error) {
        if (active.signal.aborted) return;
        failed.current = { key, cursor };
        setResult({
          key,
          items: base,
          next: cursor,
          loading: false,
          error: error instanceof Error ? error.message : '검색에 실패했습니다.',
        });
      }
    },
    [userId, key]
  );
  useEffect(() => {
    if (enabled) {
      const cached = readSearchPage<SearchPage<T>>(userId, key);
      // Reconcile the external tab-memory cache on re-entry, including an aborted next page.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (cached) setResult({ ...cached, key, loading: false, error: '' });
      else void execute(null);
    }
    return () => controller.current?.abort();
  }, [key, enabled, userId, execute]);
  const current =
    result.key === key
      ? result
      : {
          key,
          items: [],
          next: null,
          loading: enabled && !readSearchPage<SearchPage<T>>(userId, key),
          error: '',
          ...readSearchPage<SearchPage<T>>(userId, key),
        };
  return {
    ...current,
    retry: () => {
      if (enabled) {
        setResult({ ...current, loading: true, error: '' });
        void execute(failed.current?.key === key ? failed.current.cursor : null);
      }
    },
    loadMore: () => {
      if (enabled && current.next && !current.loading) {
        setResult({ ...current, loading: true, error: '' });
        void execute(current.next);
      }
    },
  };
}
