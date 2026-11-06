'use client';

import { SkeletonScope, filler } from '@/components/ui/Skeleton';
import type { ExcerptMonthRow, YearRow } from '@/lib/monthly-excerpt/types';
import { MyMonthlyExcerptArchive } from './MonthlyExcerptArchive';

const YEARS: YearRow[] = [
  { year: 2026, excerptCount: 2, hasUnmade: true },
  { year: 2025, excerptCount: 9, hasUnmade: false },
];

const MONTHS: ExcerptMonthRow[] = [3, 2, 1].map((m) => ({
  month: `2026-0${m}`,
  quoteCount: 6,
  excerptId: `skeleton-${m}`,
  isShared: false,
  coverQuote: filler(24),
}));

/** 모아 보기를 불러오는 동안 — 실제 화면을 자리용 달로 그린다 */
export default function ArchiveSkeleton() {
  return (
    <SkeletonScope label="달의 발췌집을 펼치는 중">
      <MyMonthlyExcerptArchive years={YEARS} firstYearMonths={MONTHS} />
    </SkeletonScope>
  );
}
