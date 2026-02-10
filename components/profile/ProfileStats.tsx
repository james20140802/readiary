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
      {/* 1. 독서 요약 영역 (기존 유지) */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
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
              color: 'text-green-500',
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
              className="p-5 rounded-[2rem] bg-white dark:bg-zinc-900 border-[2.5px] border-zinc-100 dark:border-zinc-800 shadow-sm transition-all hover:border-zinc-200 dark:hover:border-zinc-700"
            >
              <item.icon className={`mb-3 ${item.color}`} size={24} strokeWidth={2.5} />
              <p className="text-sm font-bold text-zinc-400 mb-1">{item.label}</p>
              <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 2. 획득한 배지 영역: 한 줄에 3개씩 배치 */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            <span className="text-lg">🥇</span> 획득한 배지
          </h2>
          <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-500">
            {badges.length}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
          {badges.map((badge, i) => (
            <div
              key={i}
              className="group relative flex flex-col items-center p-6 sm:p-10 rounded-[3.5rem] bg-zinc-50/50 dark:bg-zinc-900/50 border-2 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-900 transition-all duration-300"
            >
              {/* 툴팁 */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 w-44 p-3 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-[11px] font-bold text-center opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-2xl">
                {badge.badge?.description || '특별한 성취를 달성했습니다!'}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rotate-45" />
              </div>

              {/* 배지 이미지/아이콘: 3열 레이아웃에 맞춰 크기 확대 */}
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
                    <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center">
                      <Trophy className="text-yellow-500" size={48} strokeWidth={2.5} />
                    </div>
                  </div>
                )}
              </div>

              {/* 배지 이름: 무조건 한 줄 유지 및 중앙 정렬 */}
              <div className="w-full text-center overflow-hidden">
                <p className="font-black text-zinc-900 dark:text-zinc-100 text-[12px] sm:text-[16px] leading-tight whitespace-nowrap">
                  {badge.badge?.name || '알 수 없는 배지'}
                </p>
              </div>

              <p className="mt-2 text-[10px] sm:text-[12px] font-bold text-zinc-400 font-mono shrink-0">
                {formatDate(badge.awarded_at)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
