'use client';

import { addDays, format, parseISO } from 'date-fns';
import { SkeletonScope, filler } from '@/components/ui/Skeleton';
import { todayKST } from '@/lib/dates';
import type { RecentEntry } from '@/lib/dashboard/fetchRecentEntries';
import type { MyBook } from '@/types/book';
import ComposerView from './ComposerView';
import TodayView from './TodayView';

const noop = () => {};
// 회상은 실제 화면에서도 늦게 도착해 자리를 미리 잡지 않는다
const NO_RECALL = Promise.resolve(null);

const BOOKS: MyBook[] = [0, 1, 2].map((i) => ({
  id: `skeleton-${i}`,
  book_id: `skeleton-${i}`,
  progress: null,
  created_at: null,
  is_finished: false,
  last_read_page: i === 0 ? 100 : null,
  books: { id: `skeleton-${i}`, title: filler(8), author: null, total_pages: 300, cover_url: null },
}));

function recent(today: string): RecentEntry[] {
  return [0, 1, 2].map((ago, i) => {
    const date = format(addDays(parseISO(today), -ago), 'yyyy-MM-dd');
    return {
      id: `skeleton-${i}`,
      quote: filler([30, 22, 34][i]),
      note: null,
      date,
      createdAt: `${date}T09:00:00+09:00`,
      userBookId: BOOKS[0].id,
      bookTitle: filler(8),
      bookAuthor: null,
    };
  });
}

/** 오늘을 불러오는 동안 — 실제 TodayView·ComposerView를 자리용 데이터로 그린다 */
export default function TodaySkeleton() {
  const today = todayKST();
  return (
    <SkeletonScope label="오늘을 펼치는 중">
      <TodayView
        todayKst={today}
        weeklyCount={3}
        weekActivity={[false, false, true, false, true, false, true]}
        books={BOOKS}
        latestTexts={{}}
        recentUserBookId={BOOKS[0].id}
        recentEntries={recent(today)}
        recall={NO_RECALL}
        markSeen={false}
        composer={
          <ComposerView
            books={BOOKS}
            selectedId={BOOKS[0].id}
            mode="quote"
            quote=""
            note=""
            isPrivate={false}
            ready={false}
            disabled
            canSave={false}
            pendingSubmission={false}
            submitting={false}
            draftKept={false}
            storageError={false}
            saveError={null}
            saved={null}
            onChange={noop}
            onMode={noop}
            onTogglePrivate={noop}
            onSelectBook={noop}
            onSave={noop}
            onExtraOpen={noop}
            onExtraChange={noop}
            onAddExtra={noop}
            onAddPages={() => false}
            onAgain={noop}
          />
        }
      />
    </SkeletonScope>
  );
}
