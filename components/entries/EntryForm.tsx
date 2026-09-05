'use client';

import Image from 'next/image';
import { Book } from '@/types/book';
import AnimatedSection from '@/components/ui/AnimatedSection';
import BackButton from '@/components/ui/BackButton';
import EntryFormBody, { EntryFormInitial, EntryFormValues } from './EntryFormBody';

export type { EntryFormValues } from './EntryFormBody';

interface EntryFormProps {
  book: Book;
  heading: string;
  submitLabel: string;
  initial?: EntryFormInitial;
  onSubmit: (values: EntryFormValues) => Promise<string | null>;
}

/** 신규/수정 페이지용 기록 폼 — 뒤로가기 헤더와 출처(책) 블록을 두르고, 알맹이는 EntryFormBody */
export default function EntryForm({
  book,
  heading,
  submitLabel,
  initial,
  onSubmit,
}: EntryFormProps) {
  return (
    <div>
      <header className="mb-6 flex items-center">
        <BackButton />
        <h1 className="text-page-title ml-4">{heading}</h1>
      </header>

      <AnimatedSection>
        <div className="mx-auto max-w-2xl py-4 sm:py-6">
          {/* 출처 — 어느 책에 남기는지 */}
          <div className="flex items-center gap-4 border-b border-hairline pb-5">
            <Image
              src={book.cover_url ?? '/images/default-book-cover.png'}
              alt={`『${book.title ?? '제목 없음'}』 표지`}
              width={44}
              height={66}
              className="rounded border border-hairline object-cover"
            />
            <div className="min-w-0">
              <strong className="block truncate font-serif text-lg leading-tight text-ink">
                {book.title ?? '제목 없음'}
              </strong>
              <span className="mt-1 block text-caption text-ink-sub">
                {book.author ?? '저자 미상'}
              </span>
            </div>
          </div>

          <EntryFormBody
            totalPages={book.total_pages}
            submitLabel={submitLabel}
            initial={initial}
            onSubmit={onSubmit}
          />
        </div>
      </AnimatedSection>
    </div>
  );
}
