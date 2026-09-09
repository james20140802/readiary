'use client';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import ProfileSelection, {
  type ProfileSelectionOption,
} from '@/components/profile/ProfileSelection';

export interface ComposerBook {
  id: string;
  books: { title: string };
}
const PAGE_SIZE = 20;
const SELECT = 'id, books!inner(title)';
export default function ComposerBookSelection({
  userId,
  value,
  initialBooks,
  onChange,
  onResolved,
  disabled,
}: {
  userId: string;
  value: string | null;
  initialBooks: ComposerBook[];
  onChange: (id: string | null) => void;
  onResolved: (book: ComposerBook) => void;
  disabled: boolean;
}) {
  const db = createSupabaseClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [rows, setRows] = useState<ComposerBook[]>([]);
  const [selected, setSelected] = useState<ComposerBook>();
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [selectedRetry, setSelectedRetry] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const known =
    initialBooks.find((b) => b.id === value) ?? (selected?.id === value ? selected : undefined);
  useEffect(() => {
    if (!value || known || disabled) return;
    let active = true;
    void (async () => {
      try {
        const { data, error } = await db
          .from('user_books')
          .select(SELECT)
          .eq('user_id', userId)
          .eq('id', value)
          .maybeSingle();
        if (!active) return;
        if (error || !data) throw error ?? new Error('Book unavailable');
        setSelected(data);
        onResolved(data);
      } catch {
        if (active) setSelectedError(value);
      }
    })();
    return () => {
      active = false;
    };
  }, [db, userId, value, known, disabled, selectedRetry, onResolved]);
  useEffect(() => {
    if (!open || disabled) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        let query = db
          .from('user_books')
          .select(SELECT)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .order('id');
        const literal = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (literal) query = query.filter('books.title', 'imatch', literal);
        const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
        if (!active) return;
        if (error) throw error;
        setRows((data ?? []).slice(0, PAGE_SIZE));
        setHasNext((data?.length ?? 0) > PAGE_SIZE);
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
  }, [db, userId, open, disabled, search, page, retry]);
  function reset() {
    setRows([]);
    setPage(0);
    setHasNext(false);
    setLoading(true);
    setError(false);
  }
  const option = (book: ComposerBook): ProfileSelectionOption => ({
    id: book.id,
    title: book.books.title,
  });
  return (
    <ProfileSelection
      label="기록할 책"
      value={value}
      options={rows.map(option)}
      selectedOption={known ? option(known) : undefined}
      selectedLoading={Boolean(value && !known && selectedError !== value)}
      selectedError={Boolean(value && !known && selectedError === value)}
      onRetrySelected={() => {
        setSelectedError(null);
        setSelectedRetry((n) => n + 1);
      }}
      onChange={(id) => {
        const book = rows.find((b) => b.id === id);
        if (book) {
          setSelected(book);
          onResolved(book);
        }
        onChange(id);
      }}
      emptyLabel="책 선택 해제"
      emptyMessage="등록한 책이 없습니다."
      searchPlaceholder="책 제목 검색"
      disabled={disabled}
      loading={open && loading}
      error={open && error}
      remote={{
        groups: [],
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
        onBook: () => {},
        onPage: (next) => {
          reset();
          setPage(next);
        },
        retry: () => {
          reset();
          setRetry((n) => n + 1);
        },
      }}
    />
  );
}
