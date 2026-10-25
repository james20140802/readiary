'use client';

import { SkeletonScope, filler } from '@/components/ui/Skeleton';
import type { Book } from '@/types/book';
import EntryForm from './EntryForm';

const BOOK: Book = {
  id: 'skeleton-book',
  title: filler(8),
  author: filler(4),
  total_pages: 300,
  cover_url: null,
  isbn: null,
};

const noop = async () => null;

interface Props {
  /** 화면 제목 — "기록 남기기"/"기록 고치기" 같은 고정 문구 그대로 */
  heading: string;
  submitLabel: string;
  back?: { href: string; label: string };
  /** 고치기 — 실제 화면은 기존 문장·생각·쪽수·날짜가 채워진 채 열리므로 그 값 자리를 막대로 보인다 */
  existing?: boolean;
}

const EXISTING = {
  quote: filler(30),
  note: filler(20),
  fromPage: 100,
  toPage: 100,
  date: '2026-01-01',
};

/**
 * 기록 쓰기·고치기 폼을 불러오는 동안 — 실제 EntryForm을 그린다. 새 기록은 빈 첫 모습 그대로,
 * 고치기는 기존 값이 들어올 입력칸의 글자를 막대로(data-skeleton-fields) 보인다.
 */
export default function EntryFormSkeleton({ heading, submitLabel, back, existing }: Props) {
  return (
    <SkeletonScope label={`${heading} 화면을 펼치는 중`}>
      <div data-skeleton-fields={existing ? '' : undefined}>
        <EntryForm
          book={BOOK}
          heading={heading}
          submitLabel={submitLabel}
          back={back}
          initial={existing ? EXISTING : undefined}
          onSubmit={noop}
        />
      </div>
    </SkeletonScope>
  );
}
