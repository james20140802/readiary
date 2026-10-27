'use client';
import ActionNavigation from '@/components/ui/ActionNavigation';
import { SessionExpiredError } from '@/lib/api/fetch';
import { useCreationSubmission } from '@/hooks/useCreationSubmission';
import { useActionLock } from '@/hooks/useActionLock';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrefetchDestination } from '@/hooks/usePrefetchDestination';
import { LineField } from '@/components/books/BookNewParts';
import { BTN_INK } from '@/components/books/buttonStyles';

/** 직접 적기 — 시안 book-new.html `#hand`. 밑줄 입력만, 쪽수는 비워도 된다 */
export default function NewBookForm({ onBusyChange }: { onBusyChange?: (busy: boolean) => void }) {
  const router = useRouter();
  usePrefetchDestination('/books');
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
      setError('쪽수는 1 이상의 숫자로 적어 주세요.');
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
      action.navigate('/books');
      router.push('/books');
      router.refresh();
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        navigating = true;
        return;
      }
      setError(err instanceof Error ? err.message : '꽂았는지 확인하지 못했어요.');
      return;
    } finally {
      if (!navigating) {
        action.release();
        onBusyChange?.(false);
      }
    }
  };

  const disabled = loading || !creation.ready || !!creation.snapshot;
  const message = error || creation.error;

  return (
    <form onSubmit={handleSubmit} className="max-w-[560px]" aria-label="직접 적어 꽂기">
      <LineField
        label="제목"
        placeholder="책 제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        disabled={disabled}
      />
      <LineField
        label="지은이"
        placeholder="지은이"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        required
        disabled={disabled}
      />
      <LineField
        label="전체 쪽수"
        inputMode="numeric"
        placeholder="선택"
        value={totalPages}
        onChange={(e) => setTotalPages(e.target.value.replace(/[^0-9]/g, ''))}
        disabled={disabled}
        hint="모르면 비워 두세요. 전자책·오디오북도 기록할 수 있어요."
      />
      {message && (
        <p role="alert" className="mt-4 font-sans text-caption text-danger">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || !creation.ready}
        className={`${BTN_INK} mt-7 w-full lg:w-auto`}
      >
        {loading ? '꽂는 중…' : creation.snapshot ? '저장 확인·재시도' : '책장에 꽂기'}
      </button>
      <ActionNavigation href={action.destination} />
    </form>
  );
}
