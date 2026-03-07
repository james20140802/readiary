'use client';

import { UserBadge } from '@/types/badges';
import { Stats } from '@/types/profile';
import { Trophy, BookOpen, CheckCircle2, Hash, Calendar } from 'lucide-react';
import Image from 'next/image';

interface ProfileStatsProps {
  stats: Stats;
  badges: UserBadge[];
}

export default function ProfileStats({ stats, badges }: ProfileStatsProps) {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
  };

  return (
    <div className="px-6 space-y-10 pb-20">
      {/* 1. 독서 요약 */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-lg font-bold text-label dark:text-label-invert">
            <span className="text-lg">📊</span> 독서 요약
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: '총 읽은 책',
              value: `${stats.totalBooks}권`,
              icon: BookOpen,
              color: 'text-blue-500',
            },
            {
              label: '완료한 책',
              value: `${stats.finishedBooks}권`,
              icon: CheckCircle2,
              color: 'text-success',
            },
            {
              label: '총 엔트리',
              value: `${stats.totalEntries}개`,
              icon: Hash,
              color: 'text-purple-500',
            },
            {
              label: '읽은 페이지',
              value: `${stats.totalPages}p`,
              icon: Calendar,
              color: 'text-orange-500',
            },
          ].map((item, i) => (
            <div
              key={i}
              className="p-5 rounded-[2rem] bg-surface dark:bg-dark-surface border-[2.5px] border-border dark:border-dark-border shadow-sm transition-all hover:border-border-strong dark:hover:border-dark-border"
            >
              <item.icon className={`mb-3 ${item.color}`} size={24} strokeWidth={2.5} />
              <p className="text-sm font-bold text-label-muted mb-1">{item.label}</p>
              <p className="text-2xl font-black text-label dark:text-label-invert tracking-tight">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 2. 획득한 배지 */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-lg font-bold text-label dark:text-label-invert">
            <span className="text-lg">🥇</span> 획득한 배지
          </h2>
          <span className="px-2.5 py-0.5 rounded-full bg-surface-raised dark:bg-dark-raised text-xs font-bold text-label-muted">
            {badges.length}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
          {badges.map((badge, i) => (
            <div
              key={i}
              className="group relative flex flex-col items-center p-6 sm:p-10 rounded-[3.5rem] bg-surface-raised/50 dark:bg-dark-raised/50 border-2 border-transparent hover:border-border dark:hover:border-dark-border hover:bg-surface dark:hover:bg-dark-surface transition-all duration-300"
            >
              {/* 툴팁 */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 w-44 p-3 rounded-2xl bg-dark-surface dark:bg-surface text-label-invert dark:text-label text-[11px] font-bold text-center opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-2xl">
                {badge.badge?.description || '특별한 성취를 달성했습니다!'}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-dark-surface dark:bg-surface rotate-45" />
              </div>

              {/* 배지 이미지/아이콘 */}
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shrink-0">
                {badge.badge?.icon_url ? (
                  <Image
                    src={badge.badge.icon_url}
                    alt={badge.badge.name}
                    fill
                    className="object-contain"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 p-0.5 shadow-lg shadow-yellow-500/10">
                    <div className="w-full h-full rounded-full bg-surface dark:bg-dark-surface flex items-center justify-center">
                      <Trophy className="text-yellow-500" size={48} strokeWidth={2.5} />
                    </div>
                  </div>
                )}
              </div>

              {/* 배지 이름 */}
              <div className="w-full text-center overflow-hidden">
                <p className="font-black text-label dark:text-label-invert text-[12px] sm:text-[16px] leading-tight whitespace-nowrap">
                  {badge.badge?.name || '알 수 없는 배지'}
                </p>
              </div>

              <p className="mt-2 text-[10px] sm:text-[12px] font-bold text-label-muted font-mono shrink-0">
                {formatDate(badge.awarded_at)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
