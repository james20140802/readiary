'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import Sheet from '@/components/ui/Sheet';
import Button from '@/components/ui/Button';
import type { MyBook } from '@/types/book';
import { readingFraction } from './todayCopy';

interface Props {
  open: boolean;
  books: MyBook[];
  selectedId: string | null;
  onClose(): void;
  onSelect(id: string): void;
}

function bookMeta(b: MyBook): string {
  const frac = readingFraction({
    last_read_page: b.last_read_page,
    progress: b.progress,
    total: b.books.total_pages,
  });
  const progress = frac
    ? frac.of === '쪽' || frac.of === '%'
      ? `${frac.now}${frac.of}`
      : `${frac.now} ${frac.of}`
    : '읽는 중';
  return [b.books.author, progress].filter(Boolean).join(' · ');
}

/**
 * 어느 책에서 남길까요 — 시안 home2 #pick. 이미 받아 둔 읽는 중인 책 안에서만 찾는다(추가 조회 없음).
 * 지금 고른 책을 맨 위에 둔다.
 */
export default function BookPickSheet({ open, books, selectedId, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? books.filter((b) =>
          [b.books.title, b.books.author ?? ''].some((t) => t.toLowerCase().includes(q))
        )
      : books;
    const sel = filtered.find((b) => b.id === selectedId);
    return sel ? [sel, ...filtered.filter((b) => b !== sel)] : filtered;
  }, [books, query, selectedId]);

  return (
    <Sheet
      open={open}
      onClose={() => {
        setQuery('');
        onClose();
      }}
      title="어느 책에서 남길까요"
    >
      {books.length >= 3 && (
        <label className="mt-1 block">
          <span className="sr-only">읽는 중인 책에서 찾기</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="읽는 중인 책에서 찾기"
            className="h-12 w-full rounded-none border-0 border-b border-hairline bg-transparent font-sans text-input text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
        </label>
      )}
      <div className="mt-5 font-sans text-overline text-ink-sub">읽는 중</div>
      {books.length === 0 ? (
        <p className="mt-3 font-serif text-note text-ink-sub">
          아직 읽고 있는 책이 없어요. 새 책을 등록하면 여기에서 고를 수 있어요.
        </p>
      ) : list.length === 0 ? (
        <p className="mt-3 font-sans text-body-sm text-ink-sub">
          “{query.trim()}”와 맞는 책이 없어요. 책장 전체에서 찾아보세요.
        </p>
      ) : (
        <ul className="mt-1">
          {list.map((b) => {
            const selected = b.id === selectedId;
            return (
              <li key={b.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(b.id)}
                  className="grid w-full grid-cols-[44px_1fr_auto] items-center gap-x-3.5 gap-y-0.5 border-t border-hairline py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                >
                  <span className="relative row-span-2 block aspect-[2/3] w-11 overflow-hidden rounded-[2px] bg-hairline">
                    <Image
                      src={b.books.cover_url ?? '/images/default-book-cover.png'}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  </span>
                  <span className="self-end truncate font-serif text-[17px] font-semibold text-ink">
                    {b.books.title}
                  </span>
                  <span className="col-start-2 self-start truncate font-sans text-[14px] font-medium text-ink-sub">
                    {bookMeta(b)}
                  </span>
                  <span className="col-start-3 row-span-2 row-start-1 text-accent">
                    {selected && <Check size={20} strokeWidth={1.75} aria-hidden />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-[18px] flex gap-2">
        <Button size="sm" variant="secondary" asChild>
          <Link href="/books">책장 전체</Link>
        </Button>
        <Button size="sm" variant="secondary" asChild>
          <Link href="/books/new">새 책 등록</Link>
        </Button>
      </div>
    </Sheet>
  );
}
