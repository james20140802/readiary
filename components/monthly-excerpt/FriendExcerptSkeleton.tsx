'use client';

import { useParams } from 'next/navigation';
import { SkeletonScope, filler } from '@/components/ui/Skeleton';
import SocialTopBar from '@/components/social/SocialTopBar';
import type { ExcerptItem, ExcerptMonthRow, YearRow } from '@/lib/monthly-excerpt/types';
import { FriendMonthlyExcerptArchive } from './MonthlyExcerptArchive';
import MonthlyExcerptReader from './MonthlyExcerptReader';

const ITEMS: ExcerptItem[] = [52, 38, 60].map((len, i) => ({
  position: i + 1,
  entryId: `skeleton-quote-${i}`,
  date: '2026-03-14',
  quote: filler(len),
  note: null,
  fromPage: 88,
  toPage: null,
  book: { id: `skeleton-book-${i}`, title: filler(8), author: null },
}));

const YEARS: YearRow[] = [
  { year: 2026, excerptCount: 3, hasUnmade: false },
  { year: 2025, excerptCount: 5, hasUnmade: false },
];

const MONTHS: ExcerptMonthRow[] = [3, 2, 1].map((m) => ({
  month: `2026-0${m}`,
  quoteCount: 6,
  excerptId: `skeleton-${m}`,
  isShared: true,
  coverQuote: filler(24),
}));

/** 친구의 한 권을 불러오는 동안 — 친구 화면 그대로 그려 내 화면의 동작이 비치지 않게 한다 */
export function FriendExcerptSkeleton() {
  const { nicknameAndTag } = useParams<{ nicknameAndTag: string }>();
  return (
    <SkeletonScope label="달의 발췌집을 펼치는 중">
      <SocialTopBar
        title="달의 발췌집"
        back={{ href: `/social/u/${nicknameAndTag}/excerpts`, label: '모아 보기' }}
      />
      <MonthlyExcerptReader month="2026-03" items={ITEMS} viewer="friend" ownerName={filler(2)} />
    </SkeletonScope>
  );
}

/** 친구의 모아 보기를 불러오는 동안 */
export function FriendArchiveSkeleton() {
  const { nicknameAndTag } = useParams<{ nicknameAndTag: string }>();
  return (
    <SkeletonScope label="달의 발췌집을 펼치는 중">
      <FriendMonthlyExcerptArchive
        ownerId="skeleton"
        ownerName={filler(2)}
        slug={nicknameAndTag}
        years={YEARS}
        firstYearMonths={MONTHS}
      />
    </SkeletonScope>
  );
}
