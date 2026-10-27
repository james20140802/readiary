'use client';

import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { LargeTitle } from '@/components/shell/LargeTitle';
import { useTopBar } from '@/components/shell/TopBarContext';
import { summarizeWeek } from '@/components/tools/format';
import WeeklyTimeline, { type WeeklyEntry } from './WeeklyTimeline';

const WeeklyLetterExport = dynamic(() => import('./WeeklyLetterExport'), {
  loading: () => (
    <p role="status" className="font-sans text-caption text-ink-sub">
      편지지를 펼치고 있어요.
    </p>
  ),
});

/**
 * 이번 주의 기록(주간 알림의 착지) — 도구 화면 문법. 큰 제목과 기간, 한 주를 한 줄로 요약한 간지,
 * 날짜별 기록. 요약 간지는 시안 notifications.html의 `.digest`(이번 주의 기록 · 일요일 저녁)를 옮겼다.
 */
export default function WeeklyRecords({
  entries,
  failed,
  period,
}: {
  entries: WeeklyEntry[];
  failed?: boolean;
  period: string;
}) {
  useTopBar({ title: '이번 주의 기록', back: { href: '/social/notifications', label: '알림' } });
  const [exporting, setExporting] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  return (
    <div className="mx-auto w-full max-w-[640px]">
      {exporting ? (
        <WeeklyLetterExport
          entries={entries}
          period={period}
          onClose={() => {
            setExporting(false);
            requestAnimationFrame(() => trigger.current?.focus());
          }}
        />
      ) : (
        <>
          <LargeTitle>이번 주의 기록</LargeTitle>
          {period && (
            <p className="mt-1.5 font-sans text-caption text-ink-sub">
              지난 7일 <span aria-hidden="true">·</span> <span data-skeleton>{period}</span>
            </p>
          )}
          {!failed && entries.length > 0 && (
            <section
              aria-label="이번 주 요약"
              className="vellum mt-[22px] rotate-[-0.6deg] rounded-[3px] px-[22px] py-5"
            >
              <p className="font-sans text-caption font-semibold text-accent">
                책 사이에 남겨 둔 문장과 생각
              </p>
              <p
                data-skeleton
                className="mt-2 font-serif text-[21px] font-semibold leading-[1.6] tracking-[-0.01em] text-ink"
              >
                {summarizeWeek(
                  entries.map((e) => ({
                    title: e.user_books.books?.title ?? null,
                    quote: e.quote,
                    note: e.note,
                  }))
                )}
              </p>
              <button
                ref={trigger}
                type="button"
                onClick={() => setExporting(true)}
                className="mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-sm font-sans text-button text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                독서 편지로 내보내기
                <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </section>
          )}
          <WeeklyTimeline entries={entries} failed={failed} />
        </>
      )}
    </div>
  );
}
