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
        <div className="flex justify-end">
          <Button ref={trigger} variant="secondary" size="sm" onClick={() => setExporting(true)}>
            <Mail size={16} strokeWidth={1.75} aria-hidden="true" /> 독서 편지로 내보내기
          </Button>
        </div>
      )}
      <WeeklyTimeline entries={entries} failed={failed} />
    </div>
  );
}
