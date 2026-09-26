'use client';

import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { Mail } from 'lucide-react';
import Button from '@/components/ui/Button';
import WeeklyTimeline, { type WeeklyEntry } from './WeeklyTimeline';

const WeeklyLetterExport = dynamic(() => import('./WeeklyLetterExport'), {
  loading: () => (
    <p role="status" className="text-body-sm text-ink-sub">
      편지지를 펼치고 있어요.
    </p>
  ),
});

export default function WeeklyRecords({
  entries,
  failed,
  period,
}: {
  entries: WeeklyEntry[];
  failed?: boolean;
  period: string;
}) {
  const [exporting, setExporting] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  if (exporting)
    return (
      <WeeklyLetterExport
        entries={entries}
        period={period}
        onClose={() => {
          setExporting(false);
          requestAnimationFrame(() => trigger.current?.focus());
        }}
      />
    );
  return (
    <div className="space-y-6">
      {!failed && entries.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-5 pt-2">
          <div>
            <p className="font-serif text-body">한 주를 한 통의 편지로</p>
            <p className="mt-1 text-caption text-ink-sub">
              간직하고 싶은 기록을 골라 이미지로 남겨요.
            </p>
          </div>
          <Button ref={trigger} variant="secondary" size="sm" onClick={() => setExporting(true)}>
            <Mail size={16} strokeWidth={1.75} aria-hidden="true" /> 독서 편지로 내보내기
          </Button>
        </div>
      )}
      <WeeklyTimeline entries={entries} failed={failed} />
    </div>
  );
}
