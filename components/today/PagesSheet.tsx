'use client';

import { useState } from 'react';
import Sheet from '@/components/ui/Sheet';
import Button from '@/components/ui/Button';

interface Props {
  open: boolean;
  bookTitle: string;
  submitting: boolean;
  onClose(): void;
  onSubmit(from: string, to: string): void;
}

const FIELD =
  'h-12 w-full rounded-none border-0 border-b border-hairline bg-transparent font-sans text-input tabular-nums text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none';

/** 읽은 쪽 남기기 — 시안 home2 #pages. 방금 남긴 기록에 읽은 범위를 덧붙인다. 한쪽만 적어도 된다 */
export default function PagesSheet({ open, bookTitle, submitting, onClose, onSubmit }: Props) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const empty = from === '' && to === '';

  return (
    <Sheet open={open} onClose={onClose} title="오늘 읽은 쪽">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!empty) onSubmit(from, to);
        }}
      >
        <p className="font-sans text-caption text-ink-sub">
          방금 남긴 기록에 읽은 만큼을 함께 적어 둬요. {bookTitle}
        </p>
        <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <label className="mt-[18px] block">
            <span className="block font-sans text-overline text-ink-sub">어디서부터</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="184"
              className={FIELD}
            />
          </label>
          <span aria-hidden className="pb-3 text-ink-sub">
            –
          </span>
          <label className="block">
            <span className="block font-sans text-overline text-ink-sub">어디까지</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="212"
              className={FIELD}
            />
          </label>
        </div>
        <Button type="submit" fullWidth className="mt-[26px]" disabled={empty || submitting}>
          {submitting ? '남기는 중…' : '남기기'}
        </Button>
      </form>
    </Sheet>
  );
}
