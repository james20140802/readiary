'use client';
import { apiFetch } from '@/lib/api/fetch';
import { createSupabaseClient } from '@/lib/supabase/client';
import type { ReflectionSummary } from './types';
// Mounted previews share a bounded refresh. No text is kept in a cross-route cache.
const subscribers = new Map<string, Set<(value: ReflectionSummary | null) => void>>();
let dispose: (() => void) | undefined;
let controller: AbortController | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
const queued = new Set<string>();
function schedule(ids: Iterable<string>, clear = false) {
  for (const id of ids) {
    queued.add(id);
    if (clear) subscribers.get(id)?.forEach((callback) => callback(null));
  }
  if (timer) return;
  timer = setTimeout(async () => {
    timer = undefined;
    const ids = [...queued];
    queued.clear();
    controller?.abort();
    const request = new AbortController();
    controller = request;
    for (let start = 0; start < ids.length; start += 100) {
      const batch = ids.slice(start, start + 100);
      try {
        const response = await apiFetch(`/api/reflections/summaries?ids=${batch.join(',')}`, {
          cache: 'no-store',
          signal: request.signal,
        });
        const data = response.ok ? await response.json() : {};
        if (request.signal.aborted) return;
        batch.forEach((id) =>
          subscribers.get(id)?.forEach((callback) => callback(data[id] ?? null))
        );
      } catch {
        if (!request.signal.aborted)
          batch.forEach((id) => subscribers.get(id)?.forEach((callback) => callback(null)));
      }
    }
  }, 0);
}
export function subscribeReflectionSummary(
  entryId: string,
  callback: (value: ReflectionSummary | null) => void
) {
  if (!subscribers.has(entryId)) subscribers.set(entryId, new Set());
  subscribers.get(entryId)!.add(callback);
  if (!dispose) {
    const refresh = () => {
      if (document.visibilityState === 'visible') schedule(subscribers.keys(), true);
    };
    const change = (event: Event) => schedule([(event as CustomEvent<string>).detail], true);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('readiary:reflections-changed', change);
    const {
      data: { subscription },
    } = createSupabaseClient().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        controller?.abort();
        queued.clear();
        if (timer) clearTimeout(timer);
        timer = undefined;
        subscribers.forEach((list) => list.forEach((fn) => fn(null)));
      }
      if (event === 'SIGNED_IN') refresh();
    });
    dispose = () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('readiary:reflections-changed', change);
      subscription.unsubscribe();
    };
  }
  return () => {
    subscribers.get(entryId)?.delete(callback);
    if (!subscribers.get(entryId)?.size) subscribers.delete(entryId);
    if (!subscribers.size) {
      dispose?.();
      dispose = undefined;
      controller?.abort();
      queued.clear();
      if (timer) clearTimeout(timer);
      timer = undefined;
    }
  };
}
