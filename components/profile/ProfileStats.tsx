'use client';

import { useEffect, useState } from 'react';
import { getUserStats } from '@/lib/stats/getUserStats';

interface ProfileStatsProps {
  userId: string;
}

export default function ProfileStats({ userId }: ProfileStatsProps) {
  const [stats, setStats] = useState<{
    totalBooks: number;
    totalEntries: number;
    totalPages: number;
    finishedBooks: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const result = await getUserStats(userId);
        setStats(result);
      } catch (e) {
        console.error('Failed to fetch stats:', e);
        setStats({
          totalBooks: 0,
          totalEntries: 0,
          totalPages: 0,
          finishedBooks: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-300 dark:border-gray-700">
      <h2 className="text-lg font-semibold mb-3">📊 독서 요약</h2>
      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
        <p>
          총 읽은 책:{' '}
          <span className="font-bold">{loading ? '...' : `${stats?.totalBooks ?? 0}권`}</span>
        </p>
        <p>
          완료한 책:{' '}
          <span className="font-bold">{loading ? '...' : `${stats?.finishedBooks ?? 0}권`}</span>
        </p>
        <p>
          총 엔트리 수:{' '}
          <span className="font-bold">{loading ? '...' : `${stats?.totalEntries ?? 0}개`}</span>
        </p>
        <p>
          총 읽은 페이지:{' '}
          <span className="font-bold">{loading ? '...' : `${stats?.totalPages ?? 0}p`}</span>
        </p>
      </div>
    </div>
  );
}
