'use client';

import Link from 'next/link';
import { useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, Lock, LockOpen } from 'lucide-react';
import Button from '@/components/ui/Button';
import type { MyBook } from '@/types/book';
import BookPickSheet from './BookPickSheet';
import PagesSheet from './PagesSheet';
import s from './today.module.css';

export type ComposerMode = 'quote' | 'note';

export interface ComposerSaved {
  id: string;
  mode: ComposerMode;
  text: string;
  bookTitle: string;
  extraOpen: boolean;
  extraText: string;
}

export interface ComposerViewProps {
  /** 데스크톱 두 쪽 펼침의 왼쪽 쪽에 놓일 때 */
  desk?: boolean;
  books: MyBook[];
  selectedId: string | null;
  mode: ComposerMode;
  quote: string;
  note: string;
  isPrivate: boolean;
  /** 초안을 다 읽어 왔는지(로그인 세션 확인 포함) */
  ready: boolean;
  /** 초안을 읽기 전이거나 저장 요청이 걸려 있는 동안 입력을 막는다 */
  disabled: boolean;
  canSave: boolean;
  /** 저장 요청이 걸려 있으면 남기기 대신 확인·재시도를 보인다 */
  pendingSubmission: boolean;
  submitting: boolean;
  draftKept: boolean;
  storageError: boolean;
  saveError: string | null;
  saved: ComposerSaved | null;
  onChange(field: ComposerMode, value: string): void;
  onMode(mode: ComposerMode): void;
  onTogglePrivate(): void;
  onSelectBook(id: string): void;
  onSave(): void;
  onExtraOpen(): void;
  onExtraChange(value: string): void;
  onAddExtra(): void;
  onAddPages(from: string, to: string): Promise<boolean> | boolean;
  onAgain(): void;
}

const PLACEHOLDER: Record<
  ComposerMode,
  { primary: string; secondary: string; secondaryLabel: string; primaryLabel: string; add: string }
> = {
  quote: {
    primary: '오늘 마음에 남은 문장을\n여기 옮겨 적어 보세요',
    primaryLabel: '오늘 마음에 남은 문장',
    secondary: '이 문장에 대한 나의 생각',
    secondaryLabel: '나의 생각',
    add: '생각 덧붙이기',
  },
  note: {
    primary: '책을 읽다 든 생각을\n여기 적어 보세요',
    primaryLabel: '오늘 든 생각',
    secondary: '이 생각을 남기게 한 문장',
    secondaryLabel: '책의 문장',
    add: '문장 덧붙이기',
  },
};

/** 오늘 장의 쓰기 — 시안 home2 .write. 상태는 Composer(초안·저장)가 쥐고, 여기는 모양만 맡는다 */
export default function ComposerView(props: ComposerViewProps) {
  const {
    desk,
    books,
    selectedId,
    mode,
    quote,
    note,
    isPrivate,
    ready,
    disabled,
    canSave,
    pendingSubmission,
    submitting,
    draftKept,
    storageError,
    saveError,
    saved,
  } = props;
  const other: ComposerMode = mode === 'quote' ? 'note' : 'quote';
  const primary = mode === 'quote' ? quote : note;
  const secondary = mode === 'quote' ? note : quote;
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(false);
  const showSecondary = secondaryOpen || secondary !== '';
  const copy = PLACEHOLDER[mode];
  const selectedBook = books.find((b) => b.id === selectedId) ?? null;
  const idBase = desk ? 'today-desk' : 'today';

  if (saved) {
    const extraLabel = saved.mode === 'quote' ? '생각' : '문장';
    return (
      <div className={desk ? s.deskWrite : s.write} data-expanded="true">
        <p role="status" className="font-sans text-[15px] font-semibold text-accent">
          남겼어요 · {saved.bookTitle}
        </p>
        <p
          className={clsx(
            'mt-2 line-clamp-4 whitespace-pre-wrap font-serif text-ink',
            saved.mode === 'quote' ? 'text-quote' : 'text-note'
          )}
        >
          {saved.text}
        </p>
        {saved.extraOpen && (
          <div className="mt-5">
            <label htmlFor={`${idBase}-extra`} className="font-sans text-overline text-ink-sub">
              덧붙일 {extraLabel}
            </label>
            <textarea
              id={`${idBase}-extra`}
              value={saved.extraText}
              onChange={(e) => props.onExtraChange(e.target.value)}
              placeholder={
                saved.mode === 'quote'
                  ? '이 문장에 대한 생각을 덧붙여 보세요'
                  : '책에서 마음에 남은 문장을 옮겨 적어 보세요'
              }
              autoFocus
              disabled={submitting}
              className={clsx(s.secondary, 'mt-1.5')}
            />
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                onClick={props.onAddExtra}
                disabled={submitting || saved.extraText.trim() === ''}
              >
                {submitting ? '덧붙이는 중…' : '덧붙이기'}
              </Button>
            </div>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" asChild>
            <Link href={`/entry/${saved.id}`}>남긴 기록 보기</Link>
          </Button>
          {!saved.extraOpen && (
            <Button size="sm" variant="secondary" onClick={props.onExtraOpen} disabled={submitting}>
              {extraLabel} 덧붙이기
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPagesOpen(true)}
            disabled={submitting}
          >
            읽은 쪽 남기기
          </Button>
        </div>
        <button
          type="button"
          onClick={() => {
            setSecondaryOpen(false);
            props.onAgain();
          }}
          disabled={submitting}
          className="mt-1.5 inline-flex min-h-11 items-center font-sans text-[17px] font-semibold text-ink focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          하나 더 남기기
        </button>
        <PagesSheet
          open={pagesOpen}
          bookTitle={saved.bookTitle}
          submitting={submitting}
          onClose={() => setPagesOpen(false)}
          onSubmit={async (from, to) => {
            const ok = await props.onAddPages(from, to);
            if (ok) setPagesOpen(false);
          }}
        />
      </div>
    );
  }

  const expanded = showSecondary || pendingSubmission || saveError != null;

  return (
    <div className={desk ? s.deskWrite : s.write} data-expanded={expanded ? 'true' : 'false'}>
      <div className="mb-1 flex items-center gap-[18px]">
        <div role="group" aria-label="무엇을 남길까요" className="flex gap-[18px]">
          {(['quote', 'note'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              disabled={disabled}
              onClick={() => props.onMode(m)}
              className={clsx(
                'h-10 whitespace-nowrap font-sans text-[16px] font-semibold transition-[color,box-shadow] duration-150',
                'focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                mode === m
                  ? 'text-ink shadow-[inset_0_-2px_0_rgb(var(--ink))]'
                  : 'text-ink-faint hover:text-ink-sub'
              )}
            >
              {m === 'quote' ? '책의 문장' : '나의 생각'}
            </button>
          ))}
        </div>
        {draftKept && !storageError && (
          <span className="ml-auto whitespace-nowrap font-sans text-[13px] font-medium text-ink-faint">
            임시 저장됨
          </span>
        )}
      </div>

      <textarea
        id={`${idBase}-composer-text`}
        value={primary}
        onChange={(e) => props.onChange(mode, e.target.value)}
        disabled={disabled}
        placeholder={desk ? copy.primary.replace('\n', ' ') : copy.primary}
        aria-label={copy.primaryLabel}
        className={clsx(s.primary, mode === 'quote' && s.quoteMode)}
      />
      {showSecondary && (
        <textarea
          value={secondary}
          onChange={(e) => props.onChange(other, e.target.value)}
          disabled={disabled}
          placeholder={copy.secondary}
          aria-label={copy.secondaryLabel}
          autoFocus={secondaryOpen && secondary === ''}
          className={s.secondary}
        />
      )}

      <button
        type="button"
        onClick={() => setPickOpen(true)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-label={selectedBook ? `책 고르기, 지금 ${selectedBook.books.title}` : '책 고르기'}
        className="mt-1 inline-flex h-11 max-w-full items-center gap-1.5 border-b-[1.5px] border-ink font-sans text-[17px] font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
      >
        <span className="truncate">{selectedBook?.books.title ?? '어느 책에서 남길까요'}</span>
        <ChevronDown size={18} strokeWidth={1.75} aria-hidden className="shrink-0" />
      </button>

      <div className="mt-1.5 flex items-center gap-1.5">
        {!showSecondary && (
          <button
            type="button"
            onClick={() => setSecondaryOpen(true)}
            disabled={disabled}
            className="h-11 whitespace-nowrap px-2 font-sans text-[16px] font-medium text-ink-sub hover:text-ink focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
          >
            {copy.add}
          </button>
        )}
        {!pendingSubmission && (
          <Button className="ml-auto" onClick={props.onSave} disabled={!canSave || submitting}>
            {submitting ? '남기는 중…' : '남기기'}
          </Button>
        )}
      </div>

      <div className="mt-0.5 flex items-center">
        <button
          type="button"
          aria-pressed={isPrivate}
          onClick={props.onTogglePrivate}
          disabled={disabled}
          className={clsx(
            'inline-flex h-10 items-center gap-1.5 whitespace-nowrap pr-2 font-sans text-[14px]',
            'focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60',
            isPrivate ? 'font-semibold text-ink' : 'font-medium text-ink-sub'
          )}
        >
          {isPrivate ? (
            <Lock size={17} strokeWidth={1.75} aria-hidden />
          ) : (
            <LockOpen size={17} strokeWidth={1.75} aria-hidden />
          )}
          {isPrivate ? '나만 보기' : '친구에게 보임'}
        </button>
      </div>

      {storageError && (quote || note) && (
        <p role="alert" className="mt-2 font-sans text-caption text-ink-sub">
          초안을 보관하지 못했어요. 브라우저 저장 공간을 확인해 주세요.
        </p>
      )}
      {(pendingSubmission || saveError) && (
        <div className="mt-3 space-y-3 border-t border-hairline pt-3">
          <p role={saveError ? 'alert' : 'status'} className="font-sans text-caption text-ink-sub">
            {submitting
              ? '기록을 남기는 중이에요.'
              : (saveError ??
                '이전에 요청한 저장 결과를 확인해 주세요. 다시 시도해도 같은 기록으로 처리됩니다.')}
          </p>
          {pendingSubmission && !submitting && (
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" onClick={props.onSave} disabled={!ready}>
                저장 확인·재시도
              </Button>
              <Link
                href="/books"
                className="font-sans text-caption text-accent underline underline-offset-2"
              >
                내 책장에서 확인
              </Link>
            </div>
          )}
        </div>
      )}

      <BookPickSheet
        open={pickOpen}
        books={books}
        selectedId={selectedId}
        onClose={() => setPickOpen(false)}
        onSelect={(id) => {
          props.onSelectBook(id);
          setPickOpen(false);
        }}
      />
    </div>
  );
}
