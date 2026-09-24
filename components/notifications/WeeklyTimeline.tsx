import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatKoreanDate } from '@/lib/dates';
import Button from '@/components/ui/Button';

export type WeeklyEntry = {
  id: string;
  date: string;
  quote: string | null;
  note: string | null;
  user_books: { books: { title: string } | null };
};

export default function WeeklyTimeline({
  entries,
  failed = false,
}: {
  entries: WeeklyEntry[];
  failed?: boolean;
}) {
  if (failed) {
    return (
      <section className="border-y border-hairline py-10 space-y-4" aria-label="기록 불러오기 오류">
        <p className="font-serif text-section-title">기록을 불러오지 못했어요.</p>
        <p className="text-body-sm text-ink-sub">연결을 확인한 뒤 다시 불러와 주세요.</p>
        <Button asChild variant="secondary">
          <a href="/protected/notifications/weekly">다시 불러오기</a>
        </Button>
      </section>
    );
  }
  if (!entries.length) {
    return (
      <section className="border-y border-hairline py-10 space-y-4" aria-label="아직 기록이 없어요">
        <p className="font-serif text-section-title">이번 주의 첫 문장을 기다리고 있어요.</p>
        <p className="text-body-sm text-ink-sub">
          최근 7일 동안 남긴 기록이 없어요. 마음에 남은 문장이나 생각 하나를 남겨 보세요.
        </p>
        <Button asChild variant="secondary">
          <Link href="/protected/dashboard">기록 남기기</Link>
        </Button>
      </section>
    );
  }

  // Group by the date chosen by the reader, not the server's timezone.
  const days = new Map<string, WeeklyEntry[]>();
  for (const entry of entries) {
    const items = days.get(entry.date) ?? [];
    items.push(entry);
    days.set(entry.date, items);
  }
  const orderedDays = [...days.entries()].sort(([a], [b]) => b.localeCompare(a));

  return (
    <div>
      <p className="mb-7 border-b border-hairline pb-4 text-caption text-ink-sub">
        {entries.length === 50 ? '최근 ' : ''}
        {entries.length}개의 기록 <span aria-hidden="true">·</span> 기록한 날짜순
      </p>
      <ol aria-label="날짜별 기록" className="space-y-10">
        {orderedDays.map(([date, items]) => (
          <li key={date} className="relative pl-6 sm:pl-28">
            <div
              aria-hidden="true"
              className="absolute bottom-0 left-1 top-2 w-px bg-hairline-strong sm:left-24"
            />
            <span
              aria-hidden="true"
              className="absolute left-0 top-2 h-[9px] w-[9px] rounded-full border border-accent bg-paper sm:left-[calc(6rem-4px)]"
            />
            <h2 className="mb-5 text-caption font-medium text-accent sm:absolute sm:left-0 sm:top-0 sm:w-20">
              <time dateTime={date}>{formatKoreanDate(date) ?? date}</time>
            </h2>
            <ol className="divide-y divide-hairline">
              {items.map((entry) => (
                <li key={entry.id} className="py-6 first:pt-0 last:pb-2">
                  <Link
                    href={`/protected/entry/${entry.id}`}
                    prefetch={false}
                    className="group block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
                  >
                    <p className="mb-3 font-serif text-body-sm text-ink-sub">
                      {entry.user_books.books?.title ?? '책 정보 없음'}
                    </p>
                    {entry.quote && (
                      <blockquote className="whitespace-pre-line break-words font-serif text-quote text-ink line-clamp-6">
                        {entry.quote}
                      </blockquote>
                    )}
                    {entry.note && (
                      <div className={entry.quote ? 'mt-5' : ''}>
                        <p className="mb-1.5 text-caption text-ink-sub">나의 생각</p>
                        <p className="whitespace-pre-line break-words font-serif text-note text-ink line-clamp-4">
                          {entry.note}
                        </p>
                      </div>
                    )}
                    {!entry.quote && !entry.note && (
                      <p className="font-serif text-note text-ink">읽은 분량을 기록했어요.</p>
                    )}
                    <span className="mt-4 inline-flex min-h-8 items-center gap-1.5 text-button-sm text-ink-sub group-hover:text-accent group-focus-visible:text-accent">
                      기록 읽기 <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
      <p className="mt-10 border-t border-hairline pt-5 text-caption text-ink-sub">
        {entries.length === 50
          ? '최근 50개 기록을 보여드려요.'
          : '최근 7일 동안 남긴 기록을 모두 둘러봤어요.'}
      </p>
    </div>
  );
}
