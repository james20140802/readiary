'use client';
import { useEffect, useRef, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { emptyDraft, readSearchDraft, saveSearchDraft, setSearchOwner } from '@/lib/search/memory';
import { useSearchPage } from '@/lib/search/useSearchPage';
import type { SearchBook, SearchEntry, SearchTab } from '@/lib/search/types';
import { todayKST } from '@/lib/dates';
import SearchView from './SearchView';

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
  if (!allowed)
    return (
      <p role="status" className="font-sans text-body text-ink-sub">
        로그인 상태가 바뀌었어요. 찾기를 다시 열어 주세요.
      </p>
    );
  return (
    <SearchView
      value={draft.query}
      query={query}
      tab={draft.tab}
      books={books}
      entries={entries}
      today={todayKST()}
      inputRef={searchInput}
      onValueChange={(value) => setDraft((d) => ({ ...d, query: value }))}
      onClear={() => {
        setDraft((d) => ({ ...d, query: '' }));
        setQuery('');
        searchInput.current?.focus();
      }}
      onSubmit={() => {
        if (!composing) setQuery(draft.query.trim());
      }}
      onTab={tab}
      onCompositionStart={() => setComposing(true)}
      onCompositionEnd={() => setComposing(false)}
      onNavigate={remember}
    />
  );
}
