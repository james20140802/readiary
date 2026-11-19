'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Lock, Search } from 'lucide-react';
import Button from '@/components/ui/Button';
import BookThumb from '@/components/social/BookThumb';
import {
  fetchPickableBooks,
  fetchPickableEntries,
  type PickableBook,
  type PickableEntry,
} from '@/lib/debate/client';

interface EntryPickerProps {
  selectedId?: string | null;
  onPick(entry: PickableEntry): void;
  /** 고를 때 비공개 기록에 붙일 안내 */
  privateNote?: string;
}

type LoadState = 'loading' | 'idle' | 'error';

const HEADING = 'mt-3 font-sans text-fine font-semibold text-ink-sub';

/**
 * 내 문장 고르기 — 먼저 책을 고르고, 그 책의 문장을 고른다(독자는 "그 책의 그 문장"으로 기억한다).
 * 책을 고르지 않았을 때 검색어는 책 제목과 문장을 함께 찾고, 책 안에서는 그 책의 문장을 찾는다.
 * 책 목록은 한 쪽씩 불러와 아래 "책 더 보기"로 이어 붙인다.
 * 발제의 첫 단계와 답의 근거 붙이기가 함께 쓴다. 책·문장 목록의 불러오기·실패·다시 시도는 따로 다룬다.
 */
export default function EntryPicker({ selectedId, onPick, privateNote }: EntryPickerProps) {
  const [book, setBook] = useState<PickableBook | null>(null);
  const [q, setQ] = useState('');

  const [books, setBooks] = useState<PickableBook[]>([]);
  const [booksNext, setBooksNext] = useState<number | null>(null);
  const [booksState, setBooksState] = useState<LoadState>('loading');
  const [booksFailedAt, setBooksFailedAt] = useState(0);
  const bookSeq = useRef(0);
  const [items, setItems] = useState<PickableEntry[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [state, setState] = useState<LoadState>('idle');
  const seq = useRef(0);

  const loadBooks = useCallback(async (query: string, page: number) => {
    const mine = ++bookSeq.current;
    if (page === 0) setBooks([]);
    setBooksState('loading');
    try {
      const res = await fetchPickableBooks(query, page);
      if (mine !== bookSeq.current) return;
      setBooks((prev) => (page === 0 ? res.items : [...prev, ...res.items]));
      setBooksNext(res.next);
      setBooksState('idle');
    } catch {
      if (mine !== bookSeq.current) return;
      setBooksFailedAt(page);
      setBooksState('error');
    }
  }, []);

  // 책을 고르지 않았을 때만 책 목록을 쓴다 — 검색어가 있으면 그 제목의 책을 찾는다
  const bookQuery = book ? null : q.trim();
  useEffect(() => {
    if (bookQuery === null) return;
    const t = setTimeout(() => void loadBooks(bookQuery, 0), bookQuery ? 250 : 0);
    return () => clearTimeout(t);
  }, [bookQuery, loadBooks]);

  const searching = !book && q.trim().length > 0;
  const showEntries = book !== null || searching;

  const load = useCallback(async (query: string, page: number, bookId: string | null) => {
    const mine = ++seq.current;
    setState('loading');
    try {
      const res = await fetchPickableEntries(query, page, bookId);
      if (mine !== seq.current) return;
      setItems((prev) => (page === 0 ? res.items : [...prev, ...res.items]));
      setNext(res.next);
      setState('idle');
    } catch {
      if (mine === seq.current) setState('error');
    }
  }, []);

  useEffect(() => {
    if (!showEntries) return;
    const t = setTimeout(() => void load(q.trim(), 0, book?.userBookId ?? null), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q, book, showEntries, load]);

  const openBook = (b: PickableBook) => {
    setItems([]);
    setQ('');
    setBook(b);
  };
  const backToBooks = () => {
    setItems([]);
    setQ('');
    setBook(null);
  };

  return (
    <div>
      {book && (
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={backToBooks}
            aria-label="책 목록으로"
            className="-ml-2 inline-flex min-h-10 shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full px-2 font-sans text-caption font-semibold text-accent"
          >
            <ChevronLeft size={18} strokeWidth={1.75} aria-hidden />
            목록
          </button>
          <span className="min-w-0 truncate font-serif text-body font-semibold text-ink">
            {book.title}
          </span>
        </div>
      )}

      <label className="flex items-center gap-2 border-b border-hairline-strong pb-2 focus-within:border-accent">
        <Search size={18} strokeWidth={1.75} className="text-ink-faint" aria-hidden />
        <span className="sr-only">
          {book ? '이 책에서 문장 찾기' : '책 제목이나 문장으로 찾기'}
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={book ? '이 책에서 문장 찾기' : '책 제목이나 문장으로 찾기'}
          className="min-h-10 w-full bg-transparent font-sans text-input text-ink placeholder:text-ink-faint focus:outline-none"
        />
      </label>

      {!book && (
        <>
          {searching && books.length > 0 && <h3 className={HEADING}>책</h3>}
          <ul className="mt-2" aria-busy={booksState === 'loading'}>
            {books.map((b) => (
              <li key={b.userBookId}>
                <button
                  type="button"
                  onClick={() => openBook(b)}
                  className="flex w-full items-center gap-3 border-b border-hairline py-3 text-left transition-colors hover:bg-ink/[0.03]"
                >
                  <BookThumb url={b.coverUrl} title={b.title} width={34} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif text-body font-semibold text-ink">
                      {b.title}
                    </span>
                    <span className="mt-0.5 block truncate font-sans text-fine text-ink-sub">
                      {b.author ? `${b.author} · ` : ''}
                      <span>{`문장 ${b.quoteCount}`}</span>
                    </span>
                  </span>
                  <ChevronRight
                    size={18}
                    strokeWidth={1.75}
                    className="shrink-0 text-ink-faint"
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>
          {booksState === 'loading' && !searching && (
            <p className="py-4 font-sans text-caption text-ink-faint">책을 불러오는 중…</p>
          )}
          {booksState === 'error' && (
            <p className="py-4 font-sans text-caption text-ink-sub">
              책을 불러오지 못했어요.{' '}
              <button
                type="button"
                className="font-semibold text-accent"
                onClick={() => void loadBooks(bookQuery ?? '', booksFailedAt)}
              >
                다시 시도
              </button>
            </p>
          )}
          {booksState === 'idle' && !searching && books.length === 0 && (
            <p className="py-4 font-sans text-caption text-ink-sub">
              문장을 남긴 책이 아직 없어요.
            </p>
          )}
          {booksState === 'idle' && booksNext !== null && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => void loadBooks(bookQuery ?? '', booksNext)}
            >
              책 더 보기
            </Button>
          )}
        </>
      )}

      {showEntries && (
        <>
          {searching && <h3 className={clsx(HEADING, 'mt-5')}>문장</h3>}
          <ul className="mt-2" aria-busy={state === 'loading'}>
            {items.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onPick(e)}
                  aria-pressed={selectedId === e.id}
                  className={clsx(
                    'block w-full border-b border-hairline py-3.5 text-left transition-colors',
                    selectedId === e.id ? 'bg-accent/[0.07]' : 'hover:bg-ink/[0.03]'
                  )}
                >
                  <span className="line-clamp-3 font-serif text-body text-ink">{e.quote}</span>
                  <span className="mt-1 flex items-center gap-1.5 font-sans text-fine text-ink-sub">
                    {!book && e.bookTitle}
                    {e.pageFrom ? `${book ? '' : ' · '}p.${e.pageFrom}` : ''}
                    {e.isPrivate && (
                      <span className="inline-flex items-center gap-0.5 text-ink-faint">
                        <Lock size={12} strokeWidth={1.75} aria-hidden />
                        나만 보기
                      </span>
                    )}
                  </span>
                  {e.isPrivate && privateNote && selectedId === e.id && (
                    <span className="mt-1 block font-sans text-fine text-accent">
                      {privateNote}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {state === 'loading' && (
            <p className="py-4 font-sans text-caption text-ink-faint">불러오는 중…</p>
          )}
          {state === 'error' && (
            <div className="py-4 font-sans text-caption text-ink-sub">
              문장을 불러오지 못했어요.{' '}
              <button
                type="button"
                className="font-semibold text-accent"
                onClick={() => void load(q.trim(), 0, book?.userBookId ?? null)}
              >
                다시 시도
              </button>
            </div>
          )}
          {state === 'idle' && items.length === 0 && (
            <p className="py-4 font-sans text-caption text-ink-sub">찾는 문장이 없어요.</p>
          )}
          {state === 'idle' && next !== null && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => void load(q.trim(), next, book?.userBookId ?? null)}
            >
              더 보기
            </Button>
          )}
        </>
      )}
    </div>
  );
}
