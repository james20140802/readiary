'use client';
import ActionNavigation from '@/components/ui/ActionNavigation';
import { SessionExpiredError } from '@/lib/api/fetch';

import { useCreationSubmission } from '@/hooks/useCreationSubmission';
import { useActionLock } from '@/hooks/useActionLock';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

/** 직접 입력 — 기록 폼과 같은 종이 문법. 입력은 박스 없이 괘선 위에. */
export default function NewBookForm({ onBusyChange }: { onBusyChange?: (busy: boolean) => void }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const action = useActionLock();
  const loading = action.busy;
  const creation = useCreationSubmission<{
    title: string;
    author: string;
    total_pages: number | null;
  }>('book:manual', '/api/books/new', 'client_request_id');
  const [lastAccount, setLastAccount] = useState(creation.accountId);
  if (lastAccount !== creation.accountId) {
    setLastAccount(creation.accountId);
    setTitle('');
    setAuthor('');
    setTotalPages('');
  }
  const [restoredId, setRestoredId] = useState<string | null>(null);
  if (creation.snapshot && creation.snapshot.id !== restoredId) {
    setRestoredId(creation.snapshot.id);
    setTitle(creation.snapshot.payload.title);
    setAuthor(creation.snapshot.payload.author);
    setTotalPages(creation.snapshot.payload.total_pages?.toString() ?? '');
  }
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalPages.trim() !== '' && (isNaN(Number(totalPages)) || Number(totalPages) <= 0)) {
      setError('페이지 수는 1 이상의 숫자여야 합니다.');
      return;
    }

    if (!creation.ready || !action.acquire()) return;
    onBusyChange?.(true);
    let navigating = false;
    setError(null);

    try {
      const result = await creation.submit({
        title,
        author,
        total_pages: totalPages.trim() === '' ? null : Number(totalPages),
      });
      if (!result) return;
      navigating = true;
      action.navigate('/protected/books');
      router.push('/protected/books');
      router.refresh();
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        navigating = true;
        return;
      }
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('에러가 발생했습니다.');
      }
      return;
    } finally {
      if (!navigating) {
        action.release();
        onBusyChange?.(false);
      }
    }
  };

  const fieldClass =
    'mt-1.5 block w-full border-b border-hairline bg-transparent py-1.5 text-ink transition-colors placeholder:text-ink-faint focus:border-hairline-strong focus:outline-none';

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div>
          <label htmlFor="new-book-title" className="text-caption font-medium text-ink-faint">
            제목
          </label>
          <input
            disabled={loading || !creation.ready || !!creation.snapshot}
            id="new-book-title"
            type="text"
            placeholder="책 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={`${fieldClass} font-serif text-input`}
          />
        </div>

        <div>
          <label htmlFor="new-book-author" className="text-caption font-medium text-ink-faint">
            저자
          </label>
          <input
            disabled={loading || !creation.ready || !!creation.snapshot}
            id="new-book-author"
            type="text"
            placeholder="지은이"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
            className={`${fieldClass} font-serif text-input`}
          />
        </div>

        <div>
          <label htmlFor="new-book-pages" className="text-caption font-medium text-ink-faint">
            총 쪽수 <span className="font-normal">(선택)</span>
          </label>
          <div className="mt-1.5 flex items-center gap-1 text-caption tabular-nums text-ink-sub">
            <span className="text-ink-faint">총</span>
            <input
              disabled={loading || !creation.ready || !!creation.snapshot}
              id="new-book-pages"
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="?"
              value={totalPages}
              onChange={(e) => setTotalPages(e.target.value)}
              className="w-14 border-b border-hairline bg-transparent py-1 text-center text-ink transition-colors placeholder:text-ink-faint focus:border-hairline-strong focus:outline-none"
            />
            <span className="text-ink-faint">쪽</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-hairline pt-4">
        {error || creation.error ? (
          <p className="text-caption font-medium text-danger">{error || creation.error}</p>
        ) : (
          <span className="text-caption text-ink-faint">쪽수는 나중에 채워도 됩니다.</span>
        )}
        <Button type="submit" size="sm" disabled={loading || !creation.ready}>
          {loading ? '꽂는 중...' : creation.snapshot ? '저장 확인·재시도' : '책장에 꽂기'}
        </Button>
      </div>
      <ActionNavigation href={action.destination} />
    </form>
  );
}
