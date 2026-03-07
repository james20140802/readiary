'use client';

import Card from '@/components/ui/Card';

type DashboardStats = {
  bookCount: number;
  entryCount: number;
  totalPagesRead: number;
};

export function StatsSection({ stats }: { stats: DashboardStats }) {
  return (
    <div className="mt-12 space-y-4">
      <h2 className="text-section-title text-label dark:text-label-invert mb-3">📈 나의 독서 통계</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="등록한 책" value={stats.bookCount} icon="📚" />
        <StatCard label="작성한 기록" value={stats.entryCount} icon="✍️" />
        <StatCard label="읽은 페이지 수" value={stats.totalPagesRead} icon="📖" />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <Card hoverable={false}>
      <div className="flex items-center justify-between">
        <div className="text-3xl">{icon}</div>
        <div className="text-right">
          <p className="text-caption text-label-muted">{label}</p>
          <p className="text-page-title text-label dark:text-label-invert">{value}</p>
        </div>
      </div>
    </Card>
  );
}
