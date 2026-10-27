import Link from 'next/link';
import Button from '@/components/ui/Button';
import EntryRow from '@/components/tools/EntryRow';
import { dayLabel } from '@/components/tools/format';

export type WeeklyEntry = {
  id: string;
  date: string;
  is_private: boolean;
  quote: string | null;
  note: string | null;
  user_books: { books: { title: string } | null };
};

/** 지난 7일 기록이 이만큼이면 더 오래된 것은 잘렸다 — 페이지의 limit(50)과 같은 값 */
export const WEEKLY_LIMIT = 50;

/** 기록한 날짜(독자가 고른 날짜)로 묶어 최근 날부터 */
export function groupByDay(entries: WeeklyEntry[]): [string, WeeklyEntry[]][] {
  const days = new Map<string, WeeklyEntry[]>();
  for (const entry of entries) {
    const items = days.get(entry.date) ?? [];
    items.push(entry);
    days.set(entry.date, items);
  }
  return [...days.entries()].sort(([a], [b]) => b.localeCompare(a));
}

/**
 * 이번 주의 기록 목록 — 날짜 머리 아래 헤어라인으로 나뉜 기록 줄(시안 search.html `.en-r`과 같은 줄).
 * 빈 상태와 실패도 같은 종이 위에 조용히.
 */
export default function WeeklyTimeline({
  entries,
  failed = false,
}: {
  entries: WeeklyEntry[];
  failed?: boolean;
}) {
  if (failed) {
    return (
      <section aria-label="기록 불러오기 오류" className="px-2 py-10 text-center">
        <p className="font-serif text-note text-ink-sub">기록을 불러오지 못했어요.</p>
        <p className="mt-2 font-sans text-caption text-ink-sub">
          연결을 확인한 뒤 다시 불러와 주세요.
        </p>
        <Button asChild variant="secondary" size="sm" className="mt-5">
          <a href="/notifications/weekly">다시 불러오기</a>
        </Button>
      </section>
    );
  }
  if (!entries.length) {
    return (
      <section aria-label="아직 기록이 없어요" className="px-2 py-10 text-center">
        <p className="font-serif text-note text-ink-sub">이번 주의 첫 문장을 기다리고 있어요.</p>
        <p className="mt-2 font-sans text-caption text-ink-sub">
          지난 7일 동안 남긴 기록이 없어요. 마음에 남은 문장이나 생각 하나를 남겨 보세요.
        </p>
        <Button asChild variant="secondary" size="sm" className="mt-5">
          <Link href="/today">기록 남기기</Link>
        </Button>
      </section>
    );
  }

  return (
    <div>
      <ol aria-label="날짜별 기록">
        {groupByDay(entries).map(([date, items]) => (
          <li key={date} className="mt-[34px]">
            <h2 className="mb-1.5 font-sans text-overline text-ink-sub">
              <time data-skeleton dateTime={date}>
                {dayLabel(date)}
              </time>
            </h2>
            <ul>
              {items.map((entry) => (
                <li key={entry.id}>
                  <EntryRow
                    href={`/entry/${entry.id}`}
                    quote={entry.quote ?? undefined}
                    note={
                      entry.note ? (
                        <>
                          {entry.quote && <span className="sr-only">나의 생각: </span>}
                          {entry.note}
                        </>
                      ) : undefined
                    }
                    source={entry.user_books.books?.title ?? '책 정보 없음'}
                  />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <p className="mt-8 border-t border-hairline pt-4 font-sans text-caption text-ink-sub">
        {entries.length >= WEEKLY_LIMIT
          ? `최근 ${WEEKLY_LIMIT}개 기록을 보여드려요.`
          : '지난 7일 동안 남긴 기록을 모두 둘러봤어요.'}
      </p>
    </div>
  );
}
