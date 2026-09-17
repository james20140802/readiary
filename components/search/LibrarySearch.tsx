'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import BackButton from '@/components/ui/BackButton';
import Tabs from '@/components/ui/Tabs';
import { createSupabaseClient } from '@/lib/supabase/client';
import { emptyDraft, readSearchDraft, saveSearchDraft, setSearchOwner } from '@/lib/search/memory';
import { useSearchPage } from '@/lib/search/useSearchPage';
import type { SearchBook, SearchEntry, SearchTab } from '@/lib/search/types';
import Highlight from './Highlight';

export default function LibrarySearch({ userId }: { userId: string }) {
  const [draft, setDraft] = useState(() => readSearchDraft(userId));
  const [query, setQuery] = useState(draft.query.trim());
  const [composing, setComposing] = useState(false);
  const [allowed, setAllowed] = useState(true);
  const searchInput = useRef<HTMLInputElement>(null);
  const initialScroll = useRef(draft.scroll);
  useEffect(() => {
    saveSearchDraft(userId, draft);
  }, [userId, draft]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => window.scrollTo(0, initialScroll.current));
    const { data: listener } = createSupabaseClient().auth.onAuthStateChange((_event, session) => {
      if (session?.user.id !== userId) {
        setSearchOwner(session?.user.id ?? null);
        setAllowed(false);
        setDraft({ ...emptyDraft });
        setQuery('');
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      listener.subscription.unsubscribe();
    };
  }, [userId]);
  useEffect(() => {
    if (composing) return;
    const timer = setTimeout(() => setQuery(draft.query.trim()), 300);
    return () => clearTimeout(timer);
  }, [draft.query, composing]);
  const enabled = allowed && !!query;
  const books = useSearchPage<SearchBook>(
    userId,
    { query, kind: 'books' },
    enabled && draft.tab !== 'entries'
  );
  const entries = useSearchPage<SearchEntry>(
    userId,
    { query, kind: 'entries' },
    enabled && draft.tab !== 'books'
  );
  const remember = () => saveSearchDraft(userId, { ...draft, scroll: window.scrollY });
  const tab = (value: SearchTab) => setDraft((d) => ({ ...d, tab: value }));
  if (!allowed) return <p role="status">로그인 상태가 바뀌었습니다. 검색을 다시 열어 주세요.</p>;
  return (
    <div className="w-full">
      <header className="mb-6 flex items-center gap-2">
        <BackButton />
        <h1 className="text-page-title text-ink">책과 기록 찾기</h1>
      </header>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (!composing) setQuery(draft.query.trim());
        }}
        className="space-y-2"
      >
        <label htmlFor="library-search" className="block text-caption text-ink-sub">
          책 제목, 저자, 문장과 생각 검색
        </label>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <Input
              id="library-search"
              ref={searchInput}
              variant="line"
              placeholder="기억나는 표현"
              enterKeyHint="search"
              autoComplete="off"
              className="min-h-12 !pr-12 placeholder:text-ink-sub"
              trailing={
                draft.query ? (
                  <button
                    type="button"
                    aria-label="검색어 지우기"
                    className="flex size-11 items-center justify-center rounded-full text-ink-sub hover:bg-card-raised hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                    onClick={() => {
                      setDraft((d) => ({ ...d, query: '' }));
                      setQuery('');
                      searchInput.current?.focus();
                    }}
                  >
                    <X size={18} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                ) : undefined
              }
              maxLength={200}
              value={draft.query}
              onChange={(event) => setDraft((d) => ({ ...d, query: event.target.value }))}
              onCompositionStart={() => setComposing(true)}
              onCompositionEnd={() => setComposing(false)}
            />
          </div>
          <Button type="submit" className="shrink-0 min-h-12">
            검색
          </Button>
        </div>
      </form>
      <Tabs
        tabs={[
          { value: 'all', label: '전체' },
          { value: 'books', label: '책' },
          { value: 'entries', label: '기록' },
        ]}
        value={draft.tab}
        onChange={(value) => tab(value as SearchTab)}
        ariaLabel="검색 대상"
        fullWidth
        className="mt-6 mb-6"
      />
      {!!query && (
        <>
          {draft.tab !== 'entries' && (
            <section aria-labelledby="search-books-heading" className="mb-8">
              <h2 id="search-books-heading" className="text-section-title mb-2">
                책
              </h2>
              <SearchStatus
                result={{
                  ...books,
                  items: draft.tab === 'all' ? books.items.slice(0, 3) : books.items,
                }}
                label="책"
              />
              <ul className="divide-y divide-hairline">
                {(draft.tab === 'all' ? books.items.slice(0, 3) : books.items).map((book) => (
                  <li key={book.id}>
                    <Link
                      prefetch={false}
                      onClick={remember}
                      href={`/protected/books/${book.bookId}`}
                      className="flex gap-4 py-4 hover:bg-card focus-visible:outline-accent rounded-sm"
                    >
                      {book.coverUrl && (
                        <Image
                          src={book.coverUrl}
                          alt=""
                          width={40}
                          height={56}
                          className="h-14 w-10 shrink-0 object-cover"
                          loading="lazy"
                        />
                      )}
                      <span className="min-w-0">
                        <span className="block font-serif text-body break-words">
                          <Highlight text={book.title} query={query} />
                        </span>
                        <span className="block text-caption text-ink-sub mt-1">
                          <Highlight text={book.author || '저자 미상'} query={query} />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {draft.tab === 'all' && (books.items.length > 3 || books.next) ? (
                <Button variant="ghost" size="sm" onClick={() => tab('books')}>
                  책 더 보기
                </Button>
              ) : (
                draft.tab === 'books' &&
                books.next &&
                !books.error && (
                  <Button variant="secondary" loading={books.loading} onClick={books.loadMore}>
                    책 더 보기
                  </Button>
                )
              )}
            </section>
          )}
          {draft.tab !== 'books' && (
            <section aria-labelledby="search-entries-heading">
              <h2 id="search-entries-heading" className="text-section-title mb-2">
                기록
              </h2>
              <SearchStatus result={entries} label="기록" />
              <ul className="divide-y divide-hairline">
                {entries.items.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      prefetch={false}
                      onClick={remember}
                      href={`/protected/entry/${entry.id}`}
                      className="block py-6 hover:bg-card focus-visible:outline-accent rounded-sm"
                    >
                      {entry.quote && (
                        <p className="font-serif text-quote whitespace-pre-wrap break-words">
                          <span className="sr-only">문장: </span>
                          <Highlight text={entry.quote} query={query} />
                        </p>
                      )}
                      {entry.note && (
                        <p className="font-serif text-note whitespace-pre-wrap break-words mt-3">
                          <span className="block font-sans text-caption text-ink-sub mb-1">
                            나의 생각
                          </span>
                          <Highlight text={entry.note} query={query} />
                        </p>
                      )}
                      <p className="text-caption text-ink-sub mt-4 break-words">
                        {entry.title} · {entry.date}
                        {entry.fromPage != null
                          ? ` · ${entry.fromPage}${entry.toPage != null && entry.toPage !== entry.fromPage ? `–${entry.toPage}` : ''}쪽`
                          : ''}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
              {entries.next && !entries.error && (
                <Button variant="secondary" loading={entries.loading} onClick={entries.loadMore}>
                  기록 더 보기
                </Button>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
function SearchStatus({
  result,
  label,
}: {
  result: { loading: boolean; error: string; items: unknown[]; retry: () => void };
  label: string;
}) {
  return (
    <div aria-live="polite" aria-atomic="true" className="text-caption text-ink-sub">
      {result.loading ? (
        `${label} 찾는 중…`
      ) : result.error ? (
        <>
          <p>{result.error}</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={result.retry}>
            {label} 다시 시도
          </Button>
        </>
      ) : result.items.length ? (
        `${label} ${result.items.length}개 표시`
      ) : (
        `일치하는 ${label === '책' ? '책이' : '기록이'} 없습니다. 다른 표현으로 검색해 보세요.`
      )}
    </div>
  );
}
