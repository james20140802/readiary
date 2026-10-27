'use client';

import { forwardRef, useId } from 'react';
import { Search } from 'lucide-react';
import clsx from 'clsx';
import BookCover from './BookCover';
import styles from './books.module.css';

/** 책 등록 — 시안 book-new.html의 부품. 상태·저장은 쓰는 쪽(검색 폼·직접 적기 폼)이 맡는다. */

export type NewBookTab = 'search' | 'manual';

export function NewBookTabs({
  value,
  onChange,
  disabled,
}: {
  value: NewBookTab;
  onChange: (v: NewBookTab) => void;
  disabled?: boolean;
}) {
  return (
    <div role="group" aria-label="등록 방법" className={clsx(styles.seg, 'mt-4 max-w-[360px]')}>
      {(
        [
          ['search', '찾아서 꽂기'],
          ['manual', '직접 적기'],
        ] as const
      ).map(([v, label]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          disabled={disabled}
          onClick={() => onChange(v)}
          className={styles.segItem}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function SearchBox({
  value,
  onChange,
  onSubmit,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading?: boolean;
}) {
  const hintId = useId();
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="mt-[18px] flex h-[52px] items-center gap-2.5 border-b-[1.5px] border-ink focus-within:border-accent">
        <Search size={22} strokeWidth={1.75} className="shrink-0 text-ink-sub" aria-hidden />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="제목이나 ISBN"
          aria-describedby={hintId}
          enterKeyHint="search"
          className="h-full min-w-0 flex-1 bg-transparent font-sans text-[19px] font-medium text-ink outline-none placeholder:text-ink-faint"
          placeholder="책 제목이나 ISBN"
        />
        <button
          type="submit"
          disabled={loading}
          className="min-h-11 shrink-0 px-1 font-sans text-[15px] font-semibold text-ink-sub disabled:opacity-50"
        >
          {loading ? '찾는 중…' : '찾기'}
        </button>
      </div>
      <p id={hintId} className="mt-2 font-sans text-caption text-ink-sub">
        제목, 지은이, ISBN으로 찾아요.
      </p>
    </form>
  );
}

export interface ResultBook {
  key: string;
  title: string;
  authors: string;
  meta: string;
  coverUrl: string | null;
}

export function ResultRow({
  book,
  pressed,
  disabled,
  onClick,
}: {
  book: ResultBook;
  pressed: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'grid w-full grid-cols-[56px_1fr] items-start gap-x-4 gap-y-1 border-t border-hairline py-3.5 text-left transition-[padding,box-shadow] duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent disabled:opacity-50',
        pressed && 'pl-3.5 shadow-[inset_3px_0_0_rgb(var(--accent))]'
      )}
    >
      <BookCover
        title={book.title}
        coverUrl={book.coverUrl}
        shadow="sm"
        sizes="56px"
        titleSize={10}
        className="row-span-3 w-14"
      />
      <b className="font-serif text-[18px] font-semibold leading-[1.4] text-ink">{book.title}</b>
      {book.authors && (
        <span className="font-sans text-[14px] font-medium text-ink-sub">{book.authors}</span>
      )}
      {book.meta && (
        <span className="font-sans text-[14px] font-medium text-ink-sub">{book.meta}</span>
      )}
    </button>
  );
}

/** 고른 책 — 간지 한 장. 데스크톱에서는 오른쪽에 따라 내려온다 */
export const ChosenBook = forwardRef<
  HTMLElement,
  {
    title: string;
    author: string;
    coverUrl: string | null;
    children: React.ReactNode;
    footer: React.ReactNode;
  }
>(function ChosenBook({ title, author, coverUrl, children, footer }, ref) {
  return (
    <section
      ref={ref}
      aria-label="고른 책"
      tabIndex={-1}
      className="vellum mt-[22px] grid grid-cols-[110px_1fr] items-start gap-5 rounded-[3px] p-[22px] outline-none lg:sticky lg:top-11 lg:mt-0"
    >
      <BookCover
        title={title}
        coverUrl={coverUrl}
        sizes="110px"
        titleSize={16}
        className="w-[110px]"
      />
      <div className="min-w-0">
        <div className="font-serif text-[20px] font-semibold leading-[1.4] text-ink">{title}</div>
        {author && <div className="mt-1 font-sans text-caption text-ink-sub">{author}</div>}
        {children}
      </div>
      <div className="col-span-2">{footer}</div>
    </section>
  );
});

/** 짧은 입력 — 시안 .field: 1px 밑줄, 포커스 때 밑줄만 accent */
export function LineField({
  label,
  hint,
  className,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div className={clsx('mt-[18px] block', className)}>
      <label htmlFor={id} className="block font-sans text-[14px] font-semibold text-ink-sub">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...input}
        className="h-12 w-full rounded-none border-0 border-b border-hairline bg-transparent font-sans text-[18px] font-medium text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint focus:border-accent disabled:opacity-60"
      />
      {hint && (
        <div
          id={`${id}-hint`}
          className="mt-1.5 font-sans text-[13px] font-medium leading-[1.5] text-ink-sub"
        >
          {hint}
        </div>
      )}
    </div>
  );
}
