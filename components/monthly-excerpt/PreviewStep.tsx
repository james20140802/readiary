'use client';

import { useMemo } from 'react';
import { MONTHLY_EXCERPT_SHARING } from '@/lib/monthly-excerpt/flags';
import { itemsFromPicks } from '@/lib/monthly-excerpt/compose';
import type { ComposePick } from '@/lib/monthly-excerpt/compose';
import { shareImpact } from '@/lib/monthly-excerpt/model';
import type { MonthKey } from '@/lib/monthly-excerpt/types';
import MonthlyExcerptReader from './MonthlyExcerptReader';

export type ShareChoice = 'friends' | 'private';

interface PreviewStepProps {
  month: MonthKey;
  picks: ComposePick[];
  share: ShareChoice | null;
  onShare: (choice: ShareChoice) => void;
  disabled: boolean;
}

/** 3단계 — 내 화면 그대로 묶음과 펼친 페이지를 미리 보고, (공개 기능이 열렸다면) 공개 범위를 고른다 */
export default function PreviewStep({ month, picks, share, onShare, disabled }: PreviewStepProps) {
  const items = useMemo(() => itemsFromPicks(picks), [picks]);
  const impact = shareImpact(picks);

  return (
    <div>
      {MONTHLY_EXCERPT_SHARING && (
        <fieldset disabled={disabled} className="mb-4 border-b border-hairline pb-4">
          <legend className="font-sans text-caption text-ink-sub">누구에게 보여 줄까요</legend>
          <div role="radiogroup" className="mt-1">
            <Radio
              checked={share === 'friends'}
              disabled={impact.publicCount === 0}
              onSelect={() => onShare('friends')}
              label="친구에게 보여 주기"
              hint={
                impact.publicCount === 0
                  ? '친구에게 보일 문장이 없어요. 모두 비공개 기록이에요.'
                  : undefined
              }
            />
            <Radio
              checked={share === 'private'}
              onSelect={() => onShare('private')}
              label="나만 보기"
            />
          </div>
          <div aria-live="polite">
            {share === 'friends' && impact.lines.length > 0 && (
              <ul className="mt-2 font-sans text-body-sm text-ink-sub">
                {impact.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </div>
        </fieldset>
      )}
      {/* 펼친 페이지의 여백선이 position:fixed라 이 위쪽 조상에는 transform·filter를 두지 않는다 */}
      <MonthlyExcerptReader month={month} items={items} viewer="owner" preview />
    </div>
  );
}

function Radio({
  checked,
  disabled,
  onSelect,
  label,
  hint,
}: {
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <label
      className={`flex min-h-12 items-start gap-3 py-2.5 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}
    >
      <input
        type="radio"
        name="monthly-excerpt-share"
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="mt-0.5 grid h-[22px] w-[22px] flex-none place-items-center rounded-full border border-hairline-strong bg-paper peer-checked:border-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper peer-checked:[&>span]:scale-100"
      >
        <span className="h-3 w-3 scale-0 rounded-full bg-accent transition-transform motion-reduce:transition-none" />
      </span>
      <span>
        <span className="block font-sans text-body font-semibold text-ink">{label}</span>
        {hint && <span className="mt-0.5 block font-sans text-fine text-ink-sub">{hint}</span>}
      </span>
    </label>
  );
}
