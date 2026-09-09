'use client';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Check, LibraryBig, Search } from 'lucide-react';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import FormLabel from '@/components/ui/FormLabel';
import { createSupabaseClient } from '@/lib/supabase/client';

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
  initialSelectedId,
  children,
}: {
  userId: string;
  value: string | null;
  initialBooks: ComposerBook[];
  onChange: (id: string | null) => void;
  onResolved: (book: ComposerBook) => void;
  disabled: boolean;
  initialSelectedId: string | null;
  children: ReactNode;
}) {
  const db = createSupabaseClient();
  const panelId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
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
  const first = initialBooks.find((book) => book.id === initialSelectedId);
  const ordered = first
    ? [first, ...initialBooks.filter((book) => book.id !== first.id)]
    : initialBooks;
  const preview = ordered.slice(0, 3);
  // A book chosen through search must remain visible, including after draft restoration.
  const chipBooks =
    known && !preview.some((book) => book.id === known.id)
      ? [...preview.slice(0, 2), known]
      : preview;
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  function select(book: ComposerBook | null) {
    if (book) {
      setSelected(book);
      onResolved(book);
    }
    onChange(book?.id ?? null);
    if (open) close();
  }
  const missingSelection = Boolean(value && !known);
  return (
    <div className="mt-3.5 overflow-x-clip border-t border-hairline pt-3.5">
      <div className="-ml-[17px] flex flex-wrap items-center gap-y-2.5">
        <div className="ml-[17px] flex flex-wrap items-center gap-2">
          {chipBooks.map((book, index) => (
            <Chip
              key={book.id}
              selected={book.id === value}
              dot={book.id === value}
              aria-pressed={book.id === value}
              disabled={disabled}
              onClick={() => select(book)}
              className={index >= 2 && book.id !== value ? 'hidden sm:inline-flex' : undefined}
            >
              <span className="max-w-[8rem] truncate">{book.books.title}</span>
            </Chip>
          ))}
          <button
            type="button"
            ref={trigger}
            className="inline-flex items-center gap-1.5 rounded-full border border-hairline-strong bg-paper px-3 py-1.5 font-sans text-caption font-medium text-ink-sub hover:border-ink hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            disabled={disabled}
            aria-label="내 책에서 고르기"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => {
              setOpen(!open);
              if (!open) {
                setSearch('');
                reset();
              }
            }}
          >
            <LibraryBig size={12} strokeWidth={1.75} aria-hidden />내 책
          </button>
        </div>
        <div className="relative ml-[17px] flex flex-1 items-center gap-2 before:absolute before:-left-[9px] before:top-1/2 before:h-4 before:w-px before:-translate-y-1/2 before:bg-hairline">
          {children}
        </div>
      </div>
      {missingSelection && (
        <div className="mt-3 text-caption text-ink-sub">
          <p role={selectedError === value ? 'alert' : 'status'}>
            {selectedError === value
              ? '선택한 책을 확인하지 못했어요. 다시 불러오거나 다른 책을 골라 주세요.'
              : '선택한 책을 확인하는 중이에요.'}
          </p>
          {selectedError === value && (
            <Button
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => {
                setSelectedError(null);
                setSelectedRetry((n) => n + 1);
              }}
            >
              선택한 책 다시 불러오기
            </Button>
          )}
        </div>
      )}
      {open && (
        <div
          id={panelId}
          className="mt-4 border-t border-hairline pt-4"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              close();
            }
          }}
        >
          <FormLabel variant="line" htmlFor={panelId + '-search'}>
            내 책 검색
          </FormLabel>
          <Input
            id={panelId + '-search'}
            variant="line"
            type="search"
            autoFocus
            disabled={disabled}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              reset();
            }}
            placeholder="책 제목 검색"
            trailing={<Search size={16} strokeWidth={1.75} aria-hidden />}
          />
          {loading && (
            <p role="status" className="py-3 text-caption text-ink-faint">
              책을 불러오는 중…
            </p>
          )}
          {error && (
            <div className="py-3">
              <p role="alert" className="text-caption text-danger">
                책을 불러오지 못했어요.
              </p>
              <Button
                size="sm"
                variant="ghost"
                disabled={disabled || loading}
                onClick={() => {
                  reset();
                  setRetry((n) => n + 1);
                }}
              >
                재시도
              </Button>
            </div>
          )}
          {!loading && !error && rows.length === 0 && (
            <p role="status" className="py-3 text-caption text-ink-sub">
              검색 결과가 없습니다.
            </p>
          )}
          <ul
            aria-label="기록할 책 후보"
            className="mt-3 max-h-64 divide-y divide-hairline overflow-y-auto overscroll-contain"
          >
            {rows.map((book) => (
              <li key={book.id}>
                <button
                  type="button"
                  disabled={disabled || loading || error}
                  aria-pressed={book.id === value}
                  onClick={() => select(book)}
                  className="flex min-h-11 w-full items-start gap-3 px-2 py-3 text-left hover:bg-card-raised focus-visible:outline focus-visible:outline-accent disabled:opacity-50"
                >
                  <span className="mt-1 w-4 shrink-0 text-accent">
                    {book.id === value && <Check size={16} strokeWidth={1.75} aria-hidden />}
                  </span>
                  <span className="min-w-0 break-words font-serif text-body">
                    {book.books.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {(page > 0 || hasNext) && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={disabled || loading || page === 0}
                onClick={() => {
                  const next = page - 1;
                  reset();
                  setPage(next);
                }}
              >
                이전
              </Button>
              <span className="text-caption text-ink-faint">{page + 1}페이지</span>
              <Button
                size="sm"
                variant="ghost"
                disabled={disabled || loading || !hasNext}
                onClick={() => {
                  const next = page + 1;
                  reset();
                  setPage(next);
                }}
              >
                다음
              </Button>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
            <Button
              size="sm"
              variant="ghost"
              disabled={disabled || value === null}
              onClick={() => select(null)}
            >
              책 선택 해제
            </Button>
            <Button size="sm" variant="ghost" onClick={close}>
              닫기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
