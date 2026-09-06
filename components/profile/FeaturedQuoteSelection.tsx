'use client';

import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import ProfileSelection, { ProfileSelectionOption } from './ProfileSelection';
import { quoteSearchFilter, QUOTE_PAGE_SIZE } from '@/lib/profile/quoteCandidates';

interface Props {
  userId: string;
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
}
const SELECT = 'id, quote, user_book_id, user_books!inner(user_id, books(title))';
interface QuoteRow {
  id: string;
  quote: string | null;
  user_book_id: string;
  user_books: { books: { title: string | null } | null } | null;
}
function option(row: QuoteRow): ProfileSelectionOption {
  return {
    id: row.id,
    title: row.quote ?? '',
    subtitle: row.user_books?.books?.title ?? '제목 없는 책',
    groupId: row.user_book_id,
  };
}

export default function FeaturedQuoteSelection({ userId, value, onChange, disabled }: Props) {
  const supabase = createSupabaseClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [bookId, setBookId] = useState('');
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [groups, setGroups] = useState<[string, string][]>([]);
  const [booksError, setBooksError] = useState(false);
  const [options, setOptions] = useState<ProfileSelectionOption[]>([]);
  const [selected, setSelected] = useState<ProfileSelectionOption>();
  const [selectedFailureId, setSelectedFailureId] = useState<string | null>(null);
  const [selectedRetry, setSelectedRetry] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasNext, setHasNext] = useState(false);

  // 닫힌 상태에서는 저장된 한 문장만 조회한다.
  useEffect(() => {
    if (!value || selected?.id === value) return;
    let active = true;
    async function loadSelected() {
      const { data, error } = await supabase
        .from('entries')
        .select(SELECT)
        .eq('user_books.user_id', userId)
        .eq('id', value!)
        .maybeSingle();
      if (error || !data) throw error ?? new Error('Selected quote not found');
      if (active) setSelected(option(data));
    }
    loadSelected().catch(() => {
      if (active) setSelectedFailureId(value);
    });
    return () => {
      active = false;
    };
  }, [supabase, userId, value, selected?.id, selectedRetry]);

  // 필터에는 책 제목만 사용하고, 인용 전문은 페이지 단위로 조회한다.
  useEffect(() => {
    if (!open) return;
    let active = true;
    async function loadBooks() {
      try {
        const { rows, error } = await fetchAllRows<{
          id: string;
          books: { title: string | null } | null;
        }>((from, to) =>
          supabase
            .from('user_books')
            .select('id, books(title)')
            .eq('user_id', userId)
            .order('id')
            .range(from, to)
        );
        if (active) {
          setBooksError(Boolean(error));
          if (!error) setGroups(rows.map((row) => [row.id, row.books?.title ?? '제목 없는 책']));
        }
      } catch {
        if (active) setBooksError(true);
      }
    }
    loadBooks();
    return () => {
      active = false;
    };
  }, [supabase, userId, open, retry]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        let query = supabase
          .from('entries')
          .select(SELECT)
          .eq('user_books.user_id', userId)
          .not('quote', 'is', null)
          .neq('quote', '')
          .order('date', { ascending: false })
          .order('id', { ascending: true });
        if (bookId) query = query.eq('user_book_id', bookId);
        const filter = quoteSearchFilter(search, groups);
        if (filter) query = query.or(filter);
        const { data, error } = await query.range(
          page * QUOTE_PAGE_SIZE,
          (page + 1) * QUOTE_PAGE_SIZE
        );
        if (!active) return;
        if (error) throw error;
        setOptions((data ?? []).slice(0, QUOTE_PAGE_SIZE).map(option));
        setHasNext((data?.length ?? 0) > QUOTE_PAGE_SIZE);
        setError(false);
      } catch {
        if (active) {
          setError(true);
          setHasNext(false);
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [supabase, userId, open, search, bookId, page, groups, retry]);

  function reset() {
    setPage(0);
    setOptions([]);
    setHasNext(false);
    setError(false);
    setLoading(true);
  }

  return (
    <>
      <ProfileSelection
        label="뒷표지 문장"
        options={options}
        selectedOption={selected}
        selectedLoading={Boolean(value && selected?.id !== value && selectedFailureId !== value)}
        selectedError={Boolean(value && selected?.id !== value && selectedFailureId === value)}
        onRetrySelected={() => {
          setSelectedFailureId(null);
          setSelectedRetry((n) => n + 1);
        }}
        value={value}
        onChange={(id) => {
          setSelected(options.find((o) => o.id === id));
          onChange(id);
        }}
        emptyLabel="뒷표지를 비워 둡니다"
        emptyMessage="아직 인용을 남긴 기록이 없습니다."
        searchPlaceholder="책 제목이나 문장 검색"
        filterByBook
        disabled={disabled}
        loading={open && loading}
        error={open && error}
        remote={{
          groups,
          page,
          hasNext,
          onOpen: (next) => {
            setOpen(next);
            if (next) reset();
          },
          onSearch: (next) => {
            setSearch(next);
            reset();
          },
          onBook: (next) => {
            setBookId(next);
            reset();
          },
          onPage: (next) => {
            setPage(next);
            setOptions([]);
            setHasNext(false);
            setLoading(true);
            setError(false);
          },
          retry: () => {
            setLoading(true);
            setError(false);
            setRetry((n) => n + 1);
          },
        }}
      />
      {open && booksError && (
        <p role="alert" className="mt-2 text-caption text-danger">
          책 목록을 불러오지 못했습니다. 문장 내용으로 검색하거나 선택기를 다시 열어 주세요.
        </p>
      )}
    </>
  );
}
