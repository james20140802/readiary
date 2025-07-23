'use client';

import { Stats } from '@/types/profile';
import Card from '@/components/ui/Card';

interface ProfileStatsProps {
  stats: Stats;
}

export default function ProfileStats({ stats }: ProfileStatsProps) {
  return (
    <section className="my-6">
      <Card hoverable={false}>
        <h2 className="text-lg font-semibold mb-3">📊 독서 요약</h2>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <p>
            총 읽은 책: <span className="font-bold">{stats.totalBooks}권</span>
          </p>
          <p>
            완료한 책: <span className="font-bold">{stats.finishedBooks}권</span>
          </p>
          <p>
            총 엔트리 수: <span className="font-bold">{stats.totalEntries}개</span>
          </p>
          <p>
            총 읽은 페이지: <span className="font-bold">{stats.totalPages}p</span>
          </p>
        </div>
      </Card>
    </section>
  );
}
