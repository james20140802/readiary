'use client';

import { SkeletonScope, filler } from '@/components/ui/Skeleton';
import type { ExcerptItem, MonthlyExcerpt } from '@/lib/monthly-excerpt/types';
import MonthlyExcerptOwnerView from './MonthlyExcerptOwnerView';

const QUOTE_LENS = [52, 38, 60];

const ITEMS: ExcerptItem[] = QUOTE_LENS.map((len, i) => ({
  position: i,
  entryId: `skeleton-quote-${i}`,
  date: '2026-03-14',
  quote: filler(len),
  note: null,
  fromPage: 88,
  toPage: null,
  book: { id: `skeleton-book-${i}`, title: filler(8), author: null },
}));

const EXCERPT: MonthlyExcerpt = {
  id: 'skeleton',
  month: '2026-03',
  isShared: false,
  firstSharedAt: null,
  items: ITEMS,
};

/** 달의 발췌집을 불러오는 동안 — 실제 화면을 자리용 문장으로 그린다 */
export default function MonthlyExcerptSkeleton() {
  return (
    <SkeletonScope label="달의 발췌집을 펼치는 중">
      <MonthlyExcerptOwnerView excerpt={EXCERPT} />
    </SkeletonScope>
  );
}
