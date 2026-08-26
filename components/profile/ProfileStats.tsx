'use client';

import { Stats } from '@/types/profile';
import { BookOpen, CheckCircle2, Hash, ScrollText } from 'lucide-react';
import { useState } from 'react';
import Card from '@/components/ui/Card';

interface ProfileStatsProps {
  stats: Stats;
}

const STAT_ITEMS = (stats: Stats) => [
  {
    label: '총 읽은 책',
    value: `${stats.totalBooks}권`,
    icon: BookOpen,
    color: 'text-tint',
    bg: 'bg-tint-subtle dark:bg-tint/10',
  },
  {
    label: '완독한 책',
    value: `${stats.finishedBooks}권`,
    icon: CheckCircle2,
    color: 'text-success',
    bg: 'bg-success-subtle dark:bg-success/10',
  },
  {
    label: '총 엔트리',
    value: `${stats.totalEntries}개`,
    icon: Hash,
    color: 'text-label-sub',
    bg: 'bg-surface-raised dark:bg-dark-raised',
  },
  {
    label: '읽은 페이지',
    value: `${stats.totalPages}p`,
    icon: ScrollText,
    color: 'text-[#F97316]',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
  },
];

export default function ProfileStats({ stats }: ProfileStatsProps) {
  const [pressedStat, setPressedStat] = useState<number | null>(null);

  return (
    <div className="space-y-10 pb-20">
      {/* 독서 요약 */}
      <section>
        <h2 className="text-section-title font-bold text-label dark:text-label-invert mb-4">
          📊 독서 요약
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STAT_ITEMS(stats).map((item, i) => (
            <Card
              key={i}
              hoverable
              className={`
                select-none transition-all duration-150
                ${pressedStat === i ? 'scale-95 !shadow-none !border-border-strong dark:!border-dark-border' : 'hover:-translate-y-0.5'}
              `}
              onMouseDown={() => setPressedStat(i)}
              onMouseUp={() => setPressedStat(null)}
              onMouseLeave={() => setPressedStat(null)}
              onTouchStart={() => setPressedStat(i)}
              onTouchEnd={() => setPressedStat(null)}
            >
              <div
                className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-3`}
              >
                <item.icon className={item.color} size={20} strokeWidth={2.5} />
              </div>
              <p className="text-caption font-bold text-label-muted mb-1">{item.label}</p>
              <p className="text-2xl font-black text-label dark:text-label-invert tracking-tight">
                {item.value}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
