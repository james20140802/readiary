'use client';

import { UserBadge } from '@/types/badges';
import { Stats } from '@/types/profile';
import { BookOpen, CheckCircle2, Hash, ScrollText } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';

interface ProfileStatsProps {
  stats: Stats;
  badges: UserBadge[];
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

export default function ProfileStats({ stats, badges }: ProfileStatsProps) {
  const isMobile = useIsMobile();
  const [tooltipId, setTooltipId] = useState<string | null>(null);
  const [pressedStat, setPressedStat] = useState<number | null>(null);
  const [pressedBadge, setPressedBadge] = useState<string | null>(null);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
  };

  return (
    <div className="space-y-10 pb-20">
      {/* 독서 요약 */}
      <section>
        <h2 className="text-section-title font-bold text-label dark:text-label-invert mb-4">
          📊 독서 요약
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STAT_ITEMS(stats).map((item, i) => (
            <div
              key={i}
              className={`
                p-5 rounded-2xl bg-surface dark:bg-dark-surface border border-border dark:border-dark-border
                shadow-card cursor-pointer select-none
                transition-all duration-150
                ${pressedStat === i ? 'scale-95 shadow-none border-border-strong dark:border-dark-border' : 'hover:shadow-card-md hover:-translate-y-0.5'}
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
            </div>
          ))}
        </div>
      </section>

      {/* 획득한 배지 */}
      {badges.length > 0 && (
        <section>
          <h2 className="text-section-title font-bold text-label dark:text-label-invert mb-4">
            🏅 획득한 배지
            <span className="ml-2 text-caption font-bold px-2 py-0.5 bg-surface-raised dark:bg-dark-raised text-label-muted border border-border dark:border-dark-border rounded-full align-middle">
              {badges.length}
            </span>
          </h2>

          {/* 모바일: 2열 / sm+: 3열 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {badges.map(({ badge, awarded_at }) => (
              <div
                key={badge.id}
                className="relative"
                onClick={() => {
                  if (isMobile) setTooltipId((prev) => (prev === badge.id ? null : badge.id));
                }}
                onMouseEnter={() => {
                  if (!isMobile) setTooltipId(badge.id);
                }}
              >
                <div
                  className={`flex flex-col items-center p-4 sm:p-5 text-center gap-3 rounded-2xl bg-surface dark:bg-dark-surface border border-border dark:border-dark-border shadow-card cursor-default select-none transition-all duration-150 ${pressedBadge === badge.id ? 'scale-95 shadow-none border-border-strong dark:border-dark-border' : 'hover:shadow-card-md hover:-translate-y-0.5'}`}
                  onMouseDown={() => setPressedBadge(badge.id)}
                  onMouseUp={() => setPressedBadge(null)}
                  onMouseLeave={() => {
                    setPressedBadge(null);
                    if (!isMobile) setTooltipId(null);
                  }}
                  onTouchStart={() => setPressedBadge(badge.id)}
                  onTouchEnd={() => setPressedBadge(null)}
                >
                  {/* 배지 이미지 — border 없음 */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                    <Image
                      src={badge.icon_url || '/images/default-badge.png'}
                      alt={badge.name}
                      width={80}
                      height={80}
                      className="object-contain"
                    />
                  </div>
                  <div className="w-full">
                    <p className="text-body-sm font-bold text-label dark:text-label-invert truncate">
                      {badge.name}
                    </p>
                    <p className="text-caption text-label-muted mt-0.5">{formatDate(awarded_at)}</p>
                  </div>
                </div>

                {/* 툴팁 — 한 줄 고정 */}
                {tooltipId === badge.id && badge.description && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-30 bg-label dark:bg-label-invert text-label-invert dark:text-label text-[11px] font-medium px-3 py-2 rounded-xl shadow-card-lg whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                    {badge.description}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-label dark:border-t-label-invert" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
