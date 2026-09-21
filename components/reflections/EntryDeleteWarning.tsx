'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api/fetch';
import Button from '@/components/ui/Button';
export default function EntryDeleteWarning({
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
    void apiFetch(`/api/entries/${entryId}/reflections/summary`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!controller.signal.aborted) {
          setCount(data.total);
          onReady(true);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [entryId, attempt, onReady]);
  return (
    <div className="text-caption text-ink-sub">
      {error ? (
        <>
          <p role="alert">함께 지워질 생각을 확인하지 못했어요.</p>
          <Button
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
        </>
      ) : count === null ? (
        <p role="status">이어 남긴 생각을 확인하는 중입니다.</p>
      ) : (
        <p>원래 기록과 이어 남긴 생각 {count}개가 함께 삭제됩니다. 되돌릴 수 없습니다.</p>
      )}
    </div>
  );
}
