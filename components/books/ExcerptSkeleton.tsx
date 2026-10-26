'use client';

import { SkeletonScope, filler } from '@/components/ui/Skeleton';
import ExcerptReader from './ExcerptReader';

const DATES = ['2026-09-02', '2026-09-14', '2026-09-30', '2026-10-06'];
const QUOTE_LENS = [52, 38, 60, 44];

const QUOTES = DATES.map((date, i) => ({
  id: `skeleton-quote-${i}`,
  date,
  quote: filler(QUOTE_LENS[i]),
}));

/** 발췌집을 불러오는 동안 — 실제 ExcerptReader를 자리용 문장으로 그린다 */
export default function ExcerptSkeleton() {
  return (
    <SkeletonScope label="발췌집을 펼치는 중">
      <ExcerptReader
        bookTitle={filler(8)}
        author={filler(5)}
        quotes={QUOTES}
        entryDates={DATES}
        bookId="skeleton-book"
        today="2026-10-26"
      />
    </SkeletonScope>
  );
}
