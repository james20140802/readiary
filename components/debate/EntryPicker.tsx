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

/**
 * 내 문장 고르기 — 먼저 책을 고르고, 그 책의 문장을 고른다(독자는 "그 책의 그 문장"으로 기억한다).
 * 검색어를 넣으면 책을 고르지 않았을 때는 모든 책에서, 책 안에서는 그 책에서 찾는다.
 * 발제의 첫 단계와 답의 근거 붙이기가 함께 쓴다. 책·문장 목록의 불러오기·실패·다시 시도는 따로 다룬다.
 */
export default function EntryPicker({ selectedId, onPick, privateNote }: EntryPickerProps) {
  const [book, setBook] = useState<PickableBook | null>(null);
  const [q, setQ] = useState('');

  const [books, setBooks] = useState<PickableBook[] | null>(null);
  const [booksState, setBooksState] = useState<LoadState>('loading');

  const [items, setItems] = useState<PickableEntry[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [state, setState] = useState<LoadState>('idle');
  const seq = useRef(0);

  // 책 목록은 열 때 한 번, 그리고 "다시 시도"를 누를 때 가져온다(booksTry가 바뀔 때)
  const [booksTry, setBooksTry] = useState(0);
  useEffect(() => {
    let alive = true;
    fetchPickableBooks()
      .then((b) => {
        if (!alive) return;
        setBooks(b);
        setBooksState('idle');
      })
      .catch(() => alive && setBooksState('error'));
    return () => {
      alive = false;
    };
  }, [booksTry]);
  const loadBooks = () => setBooksTry((n) => n + 1);

  const showEntries = book !== null || q.trim().length > 0;

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
            className="-ml-2 inline-flex min-h-10 items-center gap-0.5 rounded-full px-2 font-sans text-caption font-semibold text-accent"
          >
            <ChevronLeft size={18} strokeWidth={1.75} aria-hidden />책 목록
          </button>
          <span className="min-w-0 truncate font-serif text-body font-semibold text-ink">
            {book.title}
          </span>
        </div>
      )}

      <label className="flex items-center gap-2 border-b border-hairline-strong pb-2 focus-within:border-accent">
        <Search size={18} strokeWidth={1.75} className="text-ink-faint" aria-hidden />
        <span className="sr-only">문장 찾기</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={book ? '이 책에서 문장 찾기' : '모든 책에서 문장 찾기'}
          className="min-h-10 w-full bg-transparent font-sans text-input text-ink placeholder:text-ink-faint focus:outline-none"
        />
      </label>

      {!showEntries && (
        <>
          <ul className="mt-2" aria-busy={booksState === 'loading'}>
            {books?.map((b) => (
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
          {booksState === 'loading' && (
            <p className="py-4 font-sans text-caption text-ink-faint">책을 불러오는 중…</p>
          )}
          {booksState === 'error' && (
            <p className="py-4 font-sans text-caption text-ink-sub">
              책을 불러오지 못했어요.{' '}
              <button
                type="button"
                className="font-semibold text-accent"
                onClick={() => {
                  setBooksState('loading');
                  void loadBooks();
                }}
              >
                다시 시도
              </button>
            </p>
          )}
          {booksState === 'idle' && books?.length === 0 && (
            <p className="py-4 font-sans text-caption text-ink-sub">
              문장을 남긴 책이 아직 없어요.
            </p>
          )}
        </>
      )}

      {showEntries && (
        <>
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
