import { filler, SkeletonScope } from '@/components/ui/Skeleton';
import { todayKST } from '@/lib/dates';
import { buildRhythm, rhythmMonthKeys, RHYTHM_MONTHS } from '@/lib/profile/readingRhythm';
import type { ShelfBook } from '@/components/books/BookSpineShelf';
import MeView, { type MeViewProps } from './MeView';
import { diaryShelf, monthRows } from './meModel';

const SHELF_COUNT = 6;
const MONTH_COUNT = 3;

const shelfBooks: ShelfBook[] = Array.from({ length: SHELF_COUNT }, (_, i) => ({
  id: `skeleton-ub${i}`,
  title: filler(8),
  author: null,
  coverUrl: null,
  totalPages: 240,
  lastReadPage: null,
  isFinished: i % 3 === 0,
  href: '#',
  readingPeriod: null,
  entryCount: 4,
}));

const today = todayKST();
// 지금 달을 포함해 겹칠 석 달 — 가운데 자리에 같은 요일·시간대를 겹쳐 '가장 자주 펼친 때' 문장이 나오게 한다
const [monthA, monthB, monthC] = rhythmMonthKeys(today, RHYTHM_MONTHS);
const rhythm = buildRhythm(
  [
    { month: monthA, day: 6, slot: 3, count: 1 },
    { month: monthB, day: 6, slot: 3, count: 2 },
    { month: monthC, day: 6, slot: 3, count: 1 },
    { month: monthA, day: 2, slot: 1, count: 1 },
    { month: monthC, day: 2, slot: 1, count: 1 },
  ],
  today,
  RHYTHM_MONTHS
);

/** '나'를 불러오는 동안 — 실제 MeView를 자리용 데이터로 그린다 */
export const PROFILE_SKELETON_PROPS: MeViewProps = {
  name: filler(5),
  handle: `${filler(6)}#0000`,
  inviteSlug: filler(10),
  bio: filler(28),
  coverQuote: {
    entryId: 'skeleton-entry',
    quote: filler(36),
    bookTitle: filler(8),
    author: null,
  },
  year: Number(today.slice(0, 4)),
  publishedDate: `${Number(today.slice(0, 4)) - 1}년 1월 1일`,
  stats: { totalEntries: 46, finishedBooks: 2, totalBooks: 46, totalPages: 3120 },
  finishedBooks: Array.from({ length: 3 }, (_, i) => ({
    bookId: `skeleton-fb${i}`,
    title: filler(8),
    coverUrl: null,
    quoteCount: 6,
  })),
  shelfBooks,
  shelfTotal: SHELF_COUNT,
  diary: diaryShelf(`${Number(today.slice(0, 4)) - 1}-03-08T01:00:00Z`, today),
  // 달 이름은 최근 몇 달을 거슬러 올라간 실제 달 숫자 — 각 줄이 서로 다른 달이어야(key) 한다
  months: monthRows(
    Array.from({ length: MONTH_COUNT }, (_, i) => {
      const [y, m] = today.split('-').map(Number);
      const d = new Date(Date.UTC(y, m - 1 - i, 1));
      return {
        label: `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월`,
        count: 4,
        books: [],
        quotes: [],
        quotePreviews: [{ entryId: `skeleton-m${i}`, quote: filler(26) }],
      };
    })
  ),
  monthsError: false,
  bookmark: {
    userBookId: 'skeleton-bm',
    bookId: 'skeleton-bm-book',
    title: filler(8),
    quoteCount: 3,
    quotes: [filler(30), filler(24), filler(28)],
  },
  canBookmark: true,
  rhythm,
};

export default function ProfileSkeleton() {
  return (
    <SkeletonScope label="나의 책을 펼치는 중">
      <MeView {...PROFILE_SKELETON_PROPS} />
    </SkeletonScope>
  );
}
