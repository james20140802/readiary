'use client';

import Card from '@/components/ui/Card';
import { Entry } from '@/types/entry';

interface Props {
  entry: Entry | null;
}

export function TodaySummarySection({ entry }: Props) {
  return (
    <Card className="mb-6" hoverable={false}>
      {entry ? (
        <div>
          <p className="text-sm text-label-muted dark:text-label-muted">📖 오늘 읽은 책</p>
          <h2 className="text-lg font-semibold text-label dark:text-label-invert">
            {entry.book.title}
          </h2>
          <p className="mt-1 text-sm text-label-sub dark:text-label-muted italic">
            &quot;{entry.summary?.slice(0, 100)}...&quot;
          </p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-label-muted dark:text-label-muted">
            🕐 오늘은 아직 기록이 없어요
          </p>
          <p className="text-md font-medium text-label dark:text-label-invert mt-1">
            하루 한 줄 기록, 지금 써보는 건 어때요?
          </p>
        </div>
      )}
    </Card>
  );
}
