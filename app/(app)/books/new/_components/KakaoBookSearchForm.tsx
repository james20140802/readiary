'use client';
import ActionNavigation from '@/components/ui/ActionNavigation';
import { SessionExpiredError, apiFetch } from '@/lib/api/fetch';
import { useRef, useState } from 'react';
import { useCreationSubmission } from '@/hooks/useCreationSubmission';
import { useActionLock } from '@/hooks/useActionLock';
import { BookSearchResult } from '@/types/book';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { searchBook } from '@/lib/books/searchBook';
import { ChosenBook, LineField, ResultRow, SearchBox } from '@/components/books/BookNewParts';
import { BTN_INK } from '@/components/books/buttonStyles';

/** 카카오 응답의 datetime('2021-08-02T00:00:00.000+09:00')에서 연도만 */
function publishedYear(datetime: string | undefined): string | null {
  const y = datetime?.slice(0, 4);
  return y && /^\d{4}$/.test(y) ? y : null;
}

/** 찾아서 꽂기 — 시안 book-new.html. 결과 한 권을 고르면 고른 책 간지에 쪽수를 확인하고 꽂는다 */
export default function KakaoBookSearchForm({
  onBusyChange,
}: {
  onBusyChange?: (busy: boolean) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [pages, setPages] = useState('');
  const [pagesFound, setPagesFound] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const chosenRef = useRef<HTMLElement>(null);

  const selectLock = useActionLock();
  const registerLock = useActionLock();
  const creation = useCreationSubmission<{
    title: string;
    author: string;
    isbn: string;
    cover_url: string;
    total_pages: number | null;
  }>('book:search', '/api/books/new', 'client_request_id');
  const [lastAccount, setLastAccount] = useState(creation.accountId);
  if (lastAccount !== creation.accountId) {
    setLastAccount(creation.accountId);
    setSelectedBook(null);
    setPages('');
    setQuery('');
    setResults([]);
  }
  const [restoredId, setRestoredId] = useState<string | null>(null);
  if (creation.snapshot && creation.snapshot.id !== restoredId) {
    setRestoredId(creation.snapshot.id);
    const p = creation.snapshot.payload;
    setSelectedBook({
      title: p.title,
      authors: [p.author],
      isbn: p.isbn,
      thumbnail: p.cover_url,
    } as BookSearchResult);
    setPages(p.total_pages?.toString() ?? '');
  }
  const router = useRouter();

  const handleSearch = async () => {
    if (query.trim() === '' || loading) return;
    setLoading(true);
    setHasSearched(true);
    setSearchError(false);
    try {
      const data = await searchBook(query);
      setResults(data);
    } catch (e) {
      setSearchError(true);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const reveal = () =>
    requestAnimationFrame(() => {
      chosenRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      chosenRef.current?.focus({ preventScroll: true });
    });

  const handleSelect = async (book: BookSearchResult) => {
    if (creation.snapshot || !selectLock.acquire()) return;
    onBusyChange?.(true);
    setSelectedBook(book);
    setPages('');
    setPagesFound(false);
    try {
      const res = await apiFetch('/api/books/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: book.url }),
      });
      const { totalPages } = await res.json();
      if (totalPages) {
        setPages(String(totalPages));
        setPagesFound(true);
      }
    } catch (e) {
      // 페이지 수 조회가 아예 실패해도 등록은 가능해야 한다 — 쪽수는 비워 두고 고칠 수 있게
      console.error(e);
    } finally {
      selectLock.release();
      onBusyChange?.(false);
      reveal();
    }
  };

  const handleConfirm = async () => {
    if (!selectedBook || !creation.ready || registerLock.isLocked()) return;
    let total: number | null = null;
    if (pages.trim() !== '') {
      const parsed = parseInt(pages, 10);
      if (isNaN(parsed) || parsed <= 0) {
        toast.error('쪽수는 1 이상의 숫자로 적어 주세요.');
        return;
      }
      total = parsed;
    }

    if (!registerLock.acquire()) return;
    onBusyChange?.(true);
    let navigating = false;
    try {
      const result = await creation.submit({
        title: selectedBook.title,
        author: selectedBook.authors?.join(', ') ?? '',
        isbn: selectedBook.isbn,
        cover_url: selectedBook.thumbnail,
        total_pages: total,
      });
      if (!result) return;
      navigating = true;
      toast.success('책장에 꽂았어요.');
      registerLock.navigate('/books');
      router.push('/books');
      router.refresh();
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        navigating = true;
        return;
      }
      toast.error(error instanceof Error ? error.message : '꽂았는지 확인하지 못했어요.');
    } finally {
      if (!navigating) {
        registerLock.release();
        onBusyChange?.(false);
      }
    }
  };

  const frozen = !!creation.snapshot;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-14">
      <section aria-label="책 찾기">
        {creation.error && (
          <p role="alert" className="mt-4 font-sans text-caption text-danger">
            {creation.error}
          </p>
        )}
        <SearchBox
          value={query}
          onChange={(v) => {
            setQuery(v);
            setHasSearched(false);
          }}
          onSubmit={handleSearch}
          loading={loading}
        />
        <div className="mt-3.5" aria-live="polite" aria-busy={loading}>
          {searchError ? (
            <p className="py-8 font-serif text-note text-ink-sub">
              찾지 못했어요. 잠시 뒤에 다시 찾아 주세요.
            </p>
          ) : (
            results.length === 0 &&
            !loading &&
            hasSearched && (
              <p className="py-8 font-serif text-note text-ink-sub">
                맞는 책이 없어요. 다른 낱말로 찾거나 직접 적어 꽂을 수 있어요.
              </p>
            )
          )}
          {results.map((book) => (
            <ResultRow
              key={book.isbn || book.url}
              book={{
                key: book.isbn,
                title: book.title,
                authors: book.authors?.join(', ') ?? '',
                meta: [book.publisher, publishedYear(book.datetime)].filter(Boolean).join(' · '),
                coverUrl: book.thumbnail || null,
              }}
              pressed={selectedBook?.isbn === book.isbn}
              disabled={selectLock.busy || registerLock.busy || !creation.ready || frozen}
              onClick={() => handleSelect(book)}
            />
          ))}
        </div>
      </section>

      {selectedBook && (
        <ChosenBook
          ref={chosenRef}
          title={selectedBook.title}
          author={selectedBook.authors?.join(', ') ?? ''}
          coverUrl={selectedBook.thumbnail || null}
          footer={
            <>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!creation.ready || registerLock.busy || selectLock.busy}
                className={`${BTN_INK} w-full`}
              >
                {registerLock.busy ? '꽂는 중…' : frozen ? '저장 확인·재시도' : '책장에 꽂기'}
              </button>
              <ActionNavigation href={registerLock.destination} />
            </>
          }
        >
          <LineField
            className="!mt-3"
            label="전체 쪽수"
            inputMode="numeric"
            value={pages}
            placeholder={selectLock.busy ? '찾는 중…' : '모르면 비워 두세요'}
            onChange={(e) => setPages(e.target.value.replace(/[^0-9]/g, ''))}
            disabled={registerLock.busy || frozen || selectLock.busy}
            hint={
              pagesFound
                ? '책 정보에서 가져왔어요. 고쳐도 돼요.'
                : '몰라도 꽂을 수 있어요. 전자책·오디오북도 기록할 수 있어요.'
            }
          />
        </ChosenBook>
      )}
    </div>
  );
}
