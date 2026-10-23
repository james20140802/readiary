'use client';

import type { Ref } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx';
import { Search } from 'lucide-react';
import Button from '@/components/ui/Button';
import { LargeTitle } from '@/components/shell/LargeTitle';
import { TopBarActions, useTopBar } from '@/components/shell/TopBarContext';
import EntryRow from '@/components/tools/EntryRow';
import { pageLabel, shortEntryDate } from '@/components/tools/format';
import type { SearchBook, SearchEntry, SearchTab } from '@/lib/search/types';
import Highlight from './Highlight';

/** useSearchPage가 돌려주는 한 목록의 상태 — 견본은 같은 모양의 고정값을 넘긴다 */
export interface SearchListState<T> {
  items: T[];
  next: unknown;
  loading: boolean;
  error: string;
  retry: () => void;
  loadMore: () => void;
}

export interface SearchViewProps {
  /** 입력칸의 글자(조합 중 포함) */
  value: string;
  /** 실제로 찾고 있는 말(입력이 멈춘 뒤 확정된 값) */
  query: string;
  tab: SearchTab;
  books: SearchListState<SearchBook>;
  entries: SearchListState<SearchEntry>;
  /** 'YYYY-MM-DD' — 올해 기록은 연도를 생략한다 */
  today: string;
  inputRef?: Ref<HTMLInputElement>;
  onValueChange: (value: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  onTab: (tab: SearchTab) => void;
  onCompositionStart?: () => void;
  onCompositionEnd?: () => void;
  /** 결과를 눌러 떠나기 직전(스크롤 위치 기억) */
  onNavigate?: () => void;
}

const TABS: { value: SearchTab; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'books', label: '책' },
  { value: 'entries', label: '기록' },
];

/**
 * 찾기 화면(시안 search.html) — 큰 제목, 먹 밑줄 한 줄의 입력칸, 세 칸 고르기, 책·기록 결과.
 * 데스크톱에서 '전체'는 책(좁게)과 기록(넓게)을 나란히 둔다. 도구 화면이라 장 넘김 없이 흐른다.
 */
export default function SearchView({
  value,
  query,
  tab,
  books,
  entries,
  today,
  inputRef,
  onValueChange,
  onClear,
  onSubmit,
  onTab,
  onCompositionStart,
  onCompositionEnd,
  onNavigate,
}: SearchViewProps) {
  useTopBar({ title: '찾기', back: { href: '/today', label: '오늘' } });
  const visibleBooks = tab === 'all' ? books.items.slice(0, 3) : books.items;
  const both = tab === 'all';

  return (
    <div className="w-full">
      {/* 찾기 화면에서는 상단 바의 찾기·알림 아이콘을 거둔다(시안) */}
      <TopBarActions>{null}</TopBarActions>
      <LargeTitle>찾기</LargeTitle>
      <p className="mt-1.5 font-sans text-caption text-ink-sub">
        책 제목·지은이, 내가 남긴 문장과 생각에서 찾아요.
      </p>

      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label htmlFor="library-search" className="sr-only">
          찾을 말
        </label>
        <div className="mt-3.5 flex h-[52px] items-center gap-2.5 border-b-[1.5px] border-ink px-1 transition-colors focus-within:border-accent">
          <Search
            size={22}
            strokeWidth={1.75}
            aria-hidden="true"
            className="shrink-0 text-ink-sub"
          />
          <input
            id="library-search"
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            maxLength={200}
            placeholder="기억나는 표현"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            onCompositionStart={onCompositionStart}
            onCompositionEnd={onCompositionEnd}
            className="h-full min-w-0 flex-1 bg-transparent font-sans text-[20px] font-medium text-ink outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:appearance-none"
          />
          {value && (
            <button
              type="button"
              onClick={onClear}
              className="min-h-11 shrink-0 rounded-sm px-1 font-sans text-caption text-ink-sub hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              지우기
            </button>
          )}
        </div>
      </form>

      <div
        role="group"
        aria-label="찾을 대상"
        className="mb-1.5 mt-[18px] grid h-11 max-w-[420px] auto-cols-fr grid-flow-col rounded-[10px] bg-ink/[0.08] p-0.5 lg:h-9"
      >
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            aria-pressed={tab === t.value}
            onClick={() => onTab(t.value)}
            className={clsx(
              'flex items-center justify-center rounded-lg font-sans text-overline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              tab === t.value
                ? 'bg-sheet text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)]'
                : 'text-ink-sub hover:text-ink'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!!query && (
        <div
          className={clsx(
            both &&
              'lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start lg:gap-14'
          )}
        >
          {tab !== 'entries' && (
            <section aria-labelledby="search-books-heading" className="mt-[22px]">
              <h2 id="search-books-heading" className="mb-1.5 font-sans text-overline text-ink-sub">
                책
              </h2>
              <SearchStatus result={{ ...books, items: visibleBooks }} label="책" />
              <ul>
                {visibleBooks.map((book) => (
                  <li key={book.id}>
                    <Link
                      prefetch={false}
                      onClick={onNavigate}
                      href={`/books/${book.bookId}`}
                      className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-x-3.5 gap-y-0.5 border-t border-hairline py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                    >
                      {book.coverUrl ? (
                        <Image
                          src={book.coverUrl}
                          alt=""
                          width={44}
                          height={64}
                          loading="lazy"
                          className="row-span-2 h-16 w-11 rounded-[2px] object-cover"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="row-span-2 h-16 w-11 rounded-[2px] bg-ink/[0.08]"
                        />
                      )}
                      <span className="self-end break-words font-serif text-input font-semibold text-ink">
                        <Highlight text={book.title} query={query} />
                      </span>
                      <span className="self-start break-words font-sans text-overline font-medium text-ink-sub">
                        <Highlight text={book.author || '지은이 모름'} query={query} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {both && (books.items.length > 3 || !!books.next) ? (
                <MoreButton onClick={() => onTab('books')}>책 더 보기</MoreButton>
              ) : (
                tab === 'books' &&
                !!books.next &&
                !books.error && (
                  <MoreButton loading={books.loading} onClick={books.loadMore}>
                    책 더 보기
                  </MoreButton>
                )
              )}
            </section>
          )}
          {tab !== 'books' && (
            <section aria-labelledby="search-entries-heading" className="mt-[22px]">
              <h2
                id="search-entries-heading"
                className="mb-1.5 font-sans text-overline text-ink-sub"
              >
                기록
              </h2>
              <SearchStatus result={entries} label="기록" />
              <ul>
                {entries.items.map((entry) => {
                  const page = pageLabel(entry.fromPage, entry.toPage);
                  return (
                    <li key={entry.id}>
                      <EntryRow
                        href={`/entry/${entry.id}`}
                        onClick={onNavigate}
                        aside={
                          <>
                            <time dateTime={entry.date}>{shortEntryDate(entry.date, today)}</time>
                            {page && (
                              <>
                                <br />
                                {page}
                              </>
                            )}
                          </>
                        }
                        quote={
                          entry.quote ? (
                            <>
                              <span className="sr-only">문장: </span>
                              <Highlight text={entry.quote} query={query} />
                            </>
                          ) : undefined
                        }
                        note={
                          entry.note ? (
                            <>
                              <span className="sr-only">나의 생각: </span>
                              <Highlight text={entry.note} query={query} />
                            </>
                          ) : undefined
                        }
                        source={`${entry.title}${!entry.quote && entry.note ? ' · 생각' : ''}`}
                      />
                    </li>
                  );
                })}
              </ul>
              {!!entries.next && !entries.error && (
                <MoreButton loading={entries.loading} onClick={entries.loadMore}>
                  기록 더 보기
                </MoreButton>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function MoreButton({
  children,
  loading,
  onClick,
}: {
  children: React.ReactNode;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="mt-2.5 flex justify-center">
      <Button variant="secondary" size="sm" loading={loading} onClick={onClick}>
        {children}
      </Button>
    </div>
  );
}

/** 찾는 중·실패·없음은 보이게, 몇 개 찾았는지는 화면 낭독기에만 알린다 */
function SearchStatus({
  result,
  label,
}: {
  result: { loading: boolean; error: string; items: unknown[]; retry: () => void };
  label: string;
}) {
  const empty = !result.loading && !result.error && result.items.length === 0;
  return (
    <div aria-live="polite" aria-atomic="true" className="font-sans text-caption text-ink-sub">
      {result.loading && result.items.length === 0 ? (
        <p className="border-t border-hairline py-4">{label} 찾는 중…</p>
      ) : result.loading ? (
        <p className="sr-only">{label} 찾는 중…</p>
      ) : result.error ? (
        <div className="border-t border-hairline py-4">
          <p>{result.error}</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={result.retry}>
            {label} 다시 찾기
          </Button>
        </div>
      ) : empty ? (
        <p className="border-t border-hairline py-4">
          {label === '책' ? '맞는 책이 없어요.' : '맞는 기록이 없어요.'} 다른 표현으로 찾아보세요.
        </p>
      ) : (
        <p className="sr-only">
          {label} {result.items.length}개
        </p>
      )}
    </div>
  );
}
