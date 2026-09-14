'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
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
  const [picker, setPicker] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const pickerTrigger = useRef<HTMLDivElement>(null);
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
  const invalidDates = !!(draft.from && draft.to && draft.from > draft.to);
  const enabled = allowed && !!query;
  const books = useSearchPage<SearchBook>(
    userId,
    { query, kind: 'books' },
    enabled && draft.tab !== 'entries'
  );
  const entries = useSearchPage<SearchEntry>(
    userId,
    { query, kind: 'entries', bookId: draft.book?.id, from: draft.from, to: draft.to },
    enabled && draft.tab !== 'books' && !invalidDates
  );
  const remember = () => saveSearchDraft(userId, { ...draft, scroll: window.scrollY });
  const tab = (value: SearchTab) => setDraft((d) => ({ ...d, tab: value }));
  if (!allowed) return <p role="status">로그인 상태가 바뀌었습니다. 검색을 다시 열어 주세요.</p>;
  return (
    <div className="w-full">
      <h1 className="text-page-title text-ink mb-6">책과 기록 찾기</h1>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (!composing) setQuery(draft.query.trim());
        }}
        className="flex items-end gap-3"
      >
        <Input
          ref={searchInput}
          variant="line"
          label="책 제목, 저자, 문장과 생각 검색"
          placeholder="기억나는 표현을 입력하세요"
          maxLength={200}
          value={draft.query}
          onChange={(event) => setDraft((d) => ({ ...d, query: event.target.value }))}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
        />
        <Button type="submit" variant="ghost" className="shrink-0" aria-label="검색">
          <Search size={20} strokeWidth={1.75} />
        </Button>
      </form>
      {draft.query && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => {
            setDraft((d) => ({ ...d, query: '' }));
            setQuery('');
            searchInput.current?.focus();
          }}
        >
          검색어 지우기
        </Button>
      )}
      <div aria-label="검색 대상" className="flex gap-2 mt-6 mb-4">
        {(
          [
            ['all', '전체'],
            ['books', '책'],
            ['entries', '기록'],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={draft.tab === value ? 'primary' : 'secondary'}
            aria-pressed={draft.tab === value}
            onClick={() => tab(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      {draft.tab !== 'books' && (
        <div className="border-b border-hairline pb-4 mb-6">
          <Button
            size="sm"
            variant="ghost"
            aria-expanded={draft.filtersOpen}
            aria-controls="record-filters"
            onClick={() => setDraft((d) => ({ ...d, filtersOpen: !d.filtersOpen }))}
          >
            기록 필터{draft.book || draft.from || draft.to ? ' · 적용 중' : ''}
          </Button>
          {draft.filtersOpen && (
            <div id="record-filters" className="mt-3 space-y-4">
              <p className="text-caption text-ink-sub">
                책과 날짜 필터는 기록 결과에만 적용됩니다.
              </p>
              <div ref={pickerTrigger} className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  aria-expanded={picker}
                  onClick={() => setPicker((v) => !v)}
                >
                  {draft.book ? `선택한 책: ${draft.book.title}` : '책 한 권 선택'}
                </Button>
                {draft.book && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDraft((d) => ({ ...d, book: null }))}
                  >
                    책 선택 해제
                  </Button>
                )}
              </div>
              {picker && (
                <BookPicker
                  userId={userId}
                  onSelect={(book) => {
                    setDraft((d) => ({ ...d, book }));
                    setPicker(false);
                    pickerTrigger.current?.querySelector('button')?.focus();
                  }}
                />
              )}
              <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-4">
                <Input
                  type="date"
                  variant="line"
                  label="기록 시작일"
                  value={draft.from}
                  onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                />
                <Input
                  type="date"
                  variant="line"
                  label="기록 종료일"
                  value={draft.to}
                  error={invalidDates ? '종료일은 시작일 이후로 선택해 주세요.' : undefined}
                  onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                />
              </div>
              {(draft.from || draft.to) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDraft((d) => ({ ...d, from: '', to: '' }))}
                >
                  날짜 초기화
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      {!query ? (
        <p className="py-10 font-serif text-body text-ink-sub">
          기억나는 표현으로 책과 기록을 찾아보세요.
        </p>
      ) : (
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
                      className="flex gap-4 py-4 focus-visible:outline-accent rounded-sm"
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
          {draft.tab !== 'books' && !invalidDates && (
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
                      className="block py-6 focus-visible:outline-accent rounded-sm"
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
        `일치하는 ${label === '책' ? '책이' : '기록이'} 없습니다. 검색어나 필터를 바꿔 보세요.`
      )}
    </div>
  );
}
function BookPicker({
  userId,
  onSelect,
}: {
  userId: string;
  onSelect: (book: SearchBook) => void;
}) {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [composing, setComposing] = useState(false);
  useEffect(() => {
    if (composing) return;
    const timer = setTimeout(() => setQuery(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input, composing]);
  const result = useSearchPage<SearchBook>(userId, { query, kind: 'candidates' }, true);
  return (
    <div className="border-l border-hairline pl-4 space-y-3">
      <Input
        variant="line"
        label="필터할 책 검색"
        placeholder="책 제목이나 저자"
        maxLength={200}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
      />
      <SearchStatus result={result} label="책" />
      <ul>
        {result.items.map((book) => (
          <li key={book.id}>
            <Button
              variant="ghost"
              className="text-left justify-start h-auto rounded-md w-full"
              onClick={() => onSelect(book)}
            >
              <span className="whitespace-normal break-words">
                {book.title}
                {book.author ? ` · ${book.author}` : ''}
              </span>
            </Button>
          </li>
        ))}
      </ul>
      {result.next && !result.error && (
        <Button size="sm" variant="secondary" loading={result.loading} onClick={result.loadMore}>
          선택할 책 더 보기
        </Button>
      )}
    </div>
  );
}
