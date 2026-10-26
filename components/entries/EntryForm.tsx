'use client';

import Image from 'next/image';
import { Book } from '@/types/book';
import { LargeTitle } from '@/components/shell/LargeTitle';
import { useTopBar } from '@/components/shell/TopBarContext';
import EntryFormBody, { EntryFormInitial, EntryFormValues } from './EntryFormBody';

export type { EntryFormValues } from './EntryFormBody';

interface EntryFormProps {
  entryId?: string;
  book: Book;
  heading: string;
  submitLabel: string;
  initial?: EntryFormInitial;
  successHref?: string;
  frozen?: boolean;
  disabled?: boolean;
  onSubmit: (values: EntryFormValues) => Promise<string | null>;
  /** 상단 바 뒤로 — 없으면 이 책으로 */
  back?: { href: string; label: string };
}

/** 신규/수정 페이지용 기록 폼 — 뒤로가기 헤더와 출처(책) 블록을 두르고, 알맹이는 EntryFormBody */
export default function EntryForm({
  entryId,
  book,
  heading,
  submitLabel,
  initial,
  onSubmit,
  frozen,
  successHref,
  disabled,
  back,
}: EntryFormProps) {
  useTopBar({ title: heading, back: back ?? { href: `/books/${book.id}`, label: '책' } });
  return (
    <div className="mx-auto max-w-[640px]">
      <LargeTitle>{heading}</LargeTitle>

      <section className="mt-6">
        {/* 출처 — 어느 책에 남기는지 */}
        <div className="flex items-center gap-3.5 border-b border-hairline pb-4">
          <Image
            src={book.cover_url ?? '/images/default-book-cover.png'}
            alt={`『${book.title ?? '제목 없음'}』 표지`}
            width={40}
            height={60}
            className="rounded-[3px] object-cover"
          />
          <div className="min-w-0">
            <strong
              data-skeleton
              className="block truncate font-serif text-[19px] font-semibold leading-tight text-ink"
            >
              {book.title ?? '제목 없음'}
            </strong>
            <span data-skeleton className="mt-1 block font-sans text-caption text-ink-sub">
              {book.author ?? '저자 미상'}
            </span>
          </div>
        </div>

        <EntryFormBody
          entryId={entryId}
          totalPages={book.total_pages}
          submitLabel={submitLabel}
          initial={initial}
          onSubmit={onSubmit}
          successHref={successHref}
          retainOnSuccess
          frozen={frozen}
          disabled={disabled}
        />
      </section>
    </div>
  );
}
