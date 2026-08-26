'use client';

import Card from '@/components/ui/Card';
import { format, startOfWeek, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { Entry } from '@/types/entry';
import Link from 'next/link';

interface Props {
  streak: number;
  weekActivity: boolean[];
  entry: Entry | null;
}

export function WeeklyStreakSection({ streak, weekActivity, entry }: Props) {
  const [mounted, setMounted] = useState(false);
  const [today, setToday] = useState(new Date());

  useEffect(() => {
    setMounted(true);
    setToday(new Date());
  }, []);

  if (!mounted) return <div className="min-h-[160px]" />;

  const startDate = startOfWeek(today, { weekStartsOn: 0 });
  const todayStr = format(today, 'yyyy-MM-dd');

  return (
    <Card className="mb-4" hoverable={false}>
      <h2 className="text-section-title text-ink mb-4">
        📅 이번 주의 리듬
      </h2>

      {/* 요일 도트 */}
      <div className="flex justify-between gap-1 mb-4">
        {weekActivity.map((didWrite, index) => {
          const date = addDays(startDate, index);
          const isToday = format(date, 'yyyy-MM-dd') === todayStr;
          const isPast = date < new Date(new Date(today).setHours(0, 0, 0, 0));
          const dayLabel = format(date, 'EE', { locale: ko })[0];

          let dotClass = '';
          let content: string = dayLabel;

          if (didWrite && isToday) {
            dotClass = 'bg-accent text-ink-invert ring-2 ring-accent/40 ring-offset-2';
            content = '✓';
          } else if (didWrite) {
            dotClass = 'bg-success text-ink-invert';
            content = '✓';
          } else if (isToday) {
            dotClass = 'bg-accent/10 text-accent ring-2 ring-accent ring-offset-1';
          } else if (isPast) {
            dotClass = 'bg-hairline/70 text-ink-faint';
          } else {
            dotClass = 'bg-card-raised text-ink-faint';
          }

          return (
            <div key={index} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${dotClass}`}
              >
                {content}
              </div>
              <span
                className={`text-[10px] font-semibold ${isToday ? 'text-accent' : 'text-ink-faint'}`}
              >
                {dayLabel}
              </span>
            </div>
          );
        })}
      </div>

      {/* 스트릭 배지 — 미기록시 border로 구분감 추가 */}
      <div className="mb-4">
        {streak > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-body-sm font-medium text-accent bg-accent-soft px-3 py-1.5 rounded-full border border-accent/20">
            🔥 현재 {streak}일 연속 기록 중!
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-body-sm text-ink-sub bg-card-raised px-3 py-1.5 rounded-full border border-hairline">
            🕓 아직 기록을 시작하지 않았어요!
          </span>
        )}
      </div>

      {/* 구분선 */}
      <div className="border-t border-hairline mb-4" />

      {/* 오늘 읽은 책 */}
      {entry ? (
        <div className="flex flex-col gap-0.5">
          <p className="text-caption text-ink-faint tracking-wide">📖 오늘 읽은 책</p>
          <h3 className="text-body font-semibold text-ink">
            {entry.book.title}
          </h3>
          {(entry.note || entry.quote) && (
            <p className="mt-0.5 text-body-sm text-ink-sub italic line-clamp-2">
              &quot;{entry.note ?? entry.quote}&quot;
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-caption text-ink-faint tracking-wide">🕐 오늘의 기록</p>
            <p className="mt-0.5 text-body-sm font-medium text-ink">
              하루 한 줄 기록, 지금 써보는 건 어때요?
            </p>
          </div>
          <Link
            href="/protected/books"
            className="text-caption font-semibold text-accent hover:text-accent-hover shrink-0"
          >
            기록하기 →
          </Link>
        </div>
      )}
    </Card>
  );
}
