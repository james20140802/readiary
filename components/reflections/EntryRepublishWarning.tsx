'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api/fetch';
import Button from '@/components/ui/Button';

/** Safety check remains active after rollout is disabled, but never blocks zero-thought entries. */
export default function EntryRepublishWarning({
  entryId,
  onReady,
}: {
  entryId: string;
  onReady: (ready: boolean) => void;
}) {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    onReady(false);
    void apiFetch(`/api/entries/${entryId}/reflections/summary?publicOnly=1`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (!Number.isInteger(result.total) || result.total < 0) throw new Error();
        if (!controller.signal.aborted) {
          setCount(result.total);
          onReady(result.total === 0);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [entryId, attempt, onReady]);
  if (error)
    return (
      <div className="mt-4 text-caption text-ink-sub">
        <p role="alert">공개 범위를 확인하지 못했어요.</p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setError(false);
            setCount(null);
            setAttempt((v) => v + 1);
          }}
        >
          다시 확인
        </Button>
      </div>
    );
  if (count === null)
    return (
      <p role="status" className="mt-4 text-caption text-ink-sub">
        공개 범위를 확인하고 있어요.
      </p>
    );
  if (count === 0) return null;
  return (
    <label className="mt-4 flex items-start gap-3 text-caption text-ink-sub">
      <input type="checkbox" className="mt-1" onChange={(e) => onReady(e.target.checked)} />
      기존에 친구 공개로 남긴 생각 {count}개도 친구에게 다시 보이는 것을 확인했어요.
    </label>
  );
}
