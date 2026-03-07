'use client';

import Card from '@/components/ui/Card';
import { Entry } from '@/types/entry';
import Link from 'next/link';

interface Props {
  entry: Entry | null;
}

export function TodaySummarySection({ entry }: Props) {
  return (
    <Card className="mb-4" hoverable={false}>
      {entry ? (
        <div className="flex flex-col gap-1">
          <p className="text-caption text-label-muted uppercase tracking-wide">📖 오늘 읽은 책</p>
          <h2 className="text-section-title text-label dark:text-label-invert">
            {entry.book.title}
          </h2>
          {entry.summary && (
            <p className="mt-1 text-body-sm text-label-sub dark:text-label-muted italic line-clamp-2">
              &quot;{entry.summary}&quot;
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-caption text-label-muted uppercase tracking-wide">🕐 오늘의 기록</p>
            <p className="mt-1 text-body-sm font-medium text-label dark:text-label-invert">
              하루 한 줄 기록, 지금 써보는 건 어때요?
            </p>
          </div>
          <Link
            href="/protected/books"
            className="text-caption font-semibold text-tint hover:text-tint-hover shrink-0"
          >
            기록하기 →
          </Link>
        </div>
      )}
    </Card>
  );
}
