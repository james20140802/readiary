'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api/fetch';
import Button from '@/components/ui/Button';
export default function EntryDeleteWarning({
  entryId,
  onReady,
}: {
  entryId: string;
  onReady: (count: number | null) => void;
}) {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    onReady(null);
    void apiFetch(`/api/entries/${entryId}/reflections/summary`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!Number.isSafeInteger(data.total) || data.total < 0) throw new Error();
        if (!controller.signal.aborted) {
          setCount(data.total);
          onReady(data.total);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [entryId, attempt, onReady]);
  return (
    <div className="font-serif text-[17px] leading-[1.6] text-ink-sub">
      {error ? (
        <>
          <p role="alert">함께 지워질 생각을 확인하지 못했어요.</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => {
              setError(false);
              setCount(null);
              setAttempt((v) => v + 1);
            }}
          >
            다시 확인
          </Button>
        </>
      ) : count === null ? (
        <p role="status">덧붙인 생각을 확인하고 있어요.</p>
      ) : count === 0 ? (
        <p>지우면 되돌릴 수 없어요.</p>
      ) : (
        <p>덧붙인 생각 {count}개도 함께 지워지고 되돌릴 수 없어요.</p>
      )}
    </div>
  );
}
