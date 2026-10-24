'use client';

import { useState } from 'react';
import SearchView, { type SearchListState } from '@/components/search/SearchView';
import type { SearchBook, SearchEntry, SearchTab } from '@/lib/search/types';

// 문구는 시안 search.html에서 가져왔다
const BOOKS: SearchBook[] = [
  {
    id: 'b1',
    bookId: 'b1',
    title: '왜 나는 너를 사랑하는가',
    author: '알랭 드 보통',
    coverUrl: null,
  },
  { id: 'b2', bookId: 'b2', title: '사랑의 기술', author: '에리히 프롬', coverUrl: null },
];
const ENTRIES: SearchEntry[] = [
  {
    id: 'e1',
    bookId: 'x',
    title: '소유냐 존재냐',
    date: '2026-09-29',
    fromPage: 96,
    toPage: null,
    quote: '사랑은 가지는 것이 아니라 하는 것이다.',
    note: null,
  },
  {
    id: 'e2',
    bookId: 'b1',
    title: '왜 나는 너를 사랑하는가',
    date: '2026-09-21',
    fromPage: 12,
    toPage: 14,
    quote: '사랑에 빠지는 일은 상대를 다 알기 전에 시작된다.',
    note: '모르는 채로 시작하는 용기가 사랑의 절반일지도.',
  },
  {
    id: 'e3',
    bookId: 'b1',
    title: '왜 나는 너를 사랑하는가',
    date: '2025-09-20',
    fromPage: null,
    toPage: null,
    quote: null,
    note: '첫사랑 얘기는 왜 늘 계절로 기억될까. 사랑보다 날씨를 기억하는 것 같다.',
  },
];

const noop = () => {};

function list<T>(state: string, items: T[], next: unknown = null): SearchListState<T> {
  return {
    items: state === 'loading' || state === 'empty' || state === 'error' ? [] : items,
    next: state === 'results' ? next : null,
    loading: state === 'loading',
    error: state === 'error' ? '검색 결과를 불러오지 못했습니다. 다시 시도해 주세요.' : '',
    retry: noop,
    loadMore: noop,
  };
}

export default function SearchLab({ state }: { state: string }) {
  const [value, setValue] = useState(state === 'idle' ? '' : '사랑');
  const [tab, setTab] = useState<SearchTab>('all');
  const query = value.trim();
  return (
    <SearchView
      value={value}
      query={query}
      tab={tab}
      books={list(state, BOOKS)}
      entries={list(state, ENTRIES, { id: 'more', created: 'x' })}
      today="2026-10-23"
      onValueChange={setValue}
      onClear={() => setValue('')}
      onSubmit={noop}
      onTab={setTab}
    />
  );
}
