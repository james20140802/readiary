'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  adjacentYear,
  entryYears,
  yearCells,
  yearOf,
  type EntryMonth,
} from '@/lib/export/monthPicker';

interface Props {
  /** 기록이 있는 달 — 비어 있지 않다 */
  months: EntryMonth[];
  value: string;
  onChange: (month: string) => void;
}

export const monthLabel = (month: string) => `${yearOf(month)}년 ${Number(month.slice(5, 7))}월`;

const NAV =
  'inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-sub transition-colors hover:text-ink aria-disabled:cursor-default aria-disabled:text-ink-faint aria-disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

/** 평소에는 고른 달 한 줄, '바꾸기'를 누르면 연도 넘김 + 열두 달 칸 */
export default function MonthPicker({ months, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => yearOf(value));
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const years = useMemo(() => entryYears(months), [months]);
  const cells = useMemo(() => yearCells(months, year), [months, year]);
  const prev = adjacentYear(years, year, -1);
  const next = adjacentYear(years, year, 1);
  const selectedCount = months.find((m) => m.month === value)?.entryCount ?? 0;

  const toggle = () => {
    if (!open) setYear(yearOf(value));
    setOpen(!open);
  };

  const pick = (month: string) => {
    onChange(month);
    setOpen(false);
    toggleRef.current?.focus();
  };

  return (
    <div>
      <div className="flex min-h-11 items-center justify-between gap-3">
        <p className="font-sans text-body text-ink">
          <span className="font-semibold">{monthLabel(value)}</span>
          <span className="text-caption text-ink-sub"> · 기록 {selectedCount}개</span>
        </p>
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
          className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 font-sans text-button-sm font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {open ? '접기' : '다른 달 고르기'}
          <ChevronDown
            size={16}
            strokeWidth={1.75}
            aria-hidden
            className={clsx('transition-transform', open && 'rotate-180')}
          />
        </button>
      </div>

      {open && (
        <div id={panelId} className="mt-2 rounded-[6px] border border-hairline p-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="이전 해"
              // disabled 대신 — 끝 해에 닿아도 키보드 포커스가 버튼에 남는다
              aria-disabled={prev == null}
              onClick={() => prev != null && setYear(prev)}
              className={NAV}
            >
              <ChevronLeft size={20} strokeWidth={1.75} aria-hidden />
            </button>
            <p aria-live="polite" className="font-sans text-body font-semibold text-ink">
              {year}년
            </p>
            <button
              type="button"
              aria-label="다음 해"
              aria-disabled={next == null}
              onClick={() => next != null && setYear(next)}
              className={NAV}
            >
              <ChevronRight size={20} strokeWidth={1.75} aria-hidden />
            </button>
          </div>
          <div role="group" aria-label={`${year}년의 달`} className="mt-2 grid grid-cols-4 gap-2">
            {cells.map((cell) => {
              const selected = cell.month === value;
              const empty = cell.entryCount === 0;
              return (
                <button
                  key={cell.month}
                  type="button"
                  disabled={empty}
                  aria-pressed={selected}
                  aria-label={`${cell.m}월, ${empty ? '기록 없음' : `기록 ${cell.entryCount}개`}`}
                  onClick={() => pick(cell.month)}
                  className={clsx(
                    'flex min-h-12 flex-col items-center justify-center rounded-[6px] border font-sans transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
                    selected
                      ? 'border-ink bg-ink text-ink-invert'
                      : empty
                        ? 'border-transparent text-ink-faint opacity-50'
                        : 'border-hairline-strong text-ink hover:border-ink'
                  )}
                >
                  <span className="text-button-sm font-semibold">{cell.m}월</span>
                  {!empty && (
                    <span
                      aria-hidden
                      className={clsx(
                        'text-[11px] leading-none',
                        selected ? 'text-ink-invert/70' : 'text-ink-faint'
                      )}
                    >
                      {cell.entryCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
