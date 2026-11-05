'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import { pickFromCandidate } from '@/lib/monthly-excerpt/compose';
import type { ComposePick } from '@/lib/monthly-excerpt/compose';
import { dayLabel } from '@/lib/monthly-excerpt/month';
import type { Candidate } from '@/lib/monthly-excerpt/types';
import type { useCandidates, useMonthBooks } from './useComposeData';

interface PickStepProps {
  list: ReturnType<typeof useCandidates>;
  chips: ReturnType<typeof useMonthBooks>;
  picks: ComposePick[];
  onToggle: (pick: ComposePick) => void;
  /** 고른 문장만 보는 중 */
  pickedView: boolean;
}

/** 1단계 — 그달 문장을 책 칩으로 좁히며 훑고 체크한다 (시안 picking-quotes A) */
export default function PickStep({ list, chips, picks, onToggle, pickedView }: PickStepProps) {
  const checked = new Set(picks.map((p) => p.entryId));
  const total = chips.books?.reduce((sum, b) => sum + b.quoteCount, 0) ?? null;

  if (pickedView) {
    return (
      <div>
        <ul>
          {picks.map((p) => (
            <QuoteRow key={p.entryId} row={p} checked onToggle={() => onToggle(p)} />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      <div role="group" aria-label="책으로 좁히기">
        <div className="-mx-6 flex gap-1.5 overflow-x-auto px-6 pb-1.5 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Chip
            selected={list.userBookId === null}
            aria-pressed={list.userBookId === null}
            onClick={() => list.select(null)}
            className="flex-none"
          >
            전체{total !== null && ` ${total}`}
          </Chip>
          {chips.books?.map((b) => (
            <Chip
              key={b.userBookId}
              selected={list.userBookId === b.userBookId}
              aria-pressed={list.userBookId === b.userBookId}
              onClick={() => list.select(b.userBookId)}
              className="max-w-[16rem] flex-none"
            >
              <span className="truncate">{b.title}</span>
              <span className="flex-none">{b.quoteCount}</span>
            </Chip>
          ))}
        </div>
        {chips.status === 'loading' && (
          <p role="status" className="mt-1.5 font-sans text-fine text-ink-faint">
            책 목록을 불러오는 중이에요.
          </p>
        )}
        {chips.status === 'error' && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 font-sans text-fine text-ink-sub">
            책 목록을 불러오지 못했어요.
            <button
              type="button"
              onClick={() => void chips.reload()}
              className="min-h-10 font-semibold text-accent"
            >
              다시 시도
            </button>
          </p>
        )}
      </div>

      <div className="mt-2" aria-busy={list.status === 'loading'}>
        {list.status === 'loading' && <ListSkeleton />}
        {list.status === 'error' && (
          <div role="alert" className="border-t border-hairline py-6 text-center">
            <p className="font-sans text-body text-ink-sub">문장을 불러오지 못했어요.</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={list.reload}>
              다시 시도
            </Button>
          </div>
        )}
        {list.status === 'ready' && list.items.length === 0 && (
          <p className="border-t border-hairline py-8 text-center font-sans text-body text-ink-sub">
            {list.userBookId
              ? '이 책에는 고를 수 있는 문장이 없어요.'
              : '이 달에는 고를 수 있는 문장이 없어요.'}
          </p>
        )}
        {list.status === 'ready' && list.items.length > 0 && (
          <>
            <ul>
              {list.items.map((c) => (
                <QuoteRow
                  key={c.entryId}
                  row={c}
                  checked={checked.has(c.entryId)}
                  onToggle={() => onToggle(pickFromCandidate(c))}
                />
              ))}
            </ul>
            <div aria-live="polite" className="border-t border-hairline pt-4 text-center">
              {list.moreStatus === 'error' && (
                <p className="mb-2 font-sans text-fine text-ink-sub">
                  다음 문장을 불러오지 못했어요.
                </p>
              )}
              {list.hasMore ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={list.moreStatus === 'loading'}
                  onClick={() => void list.loadMore()}
                >
                  {list.moreStatus === 'loading'
                    ? '불러오는 중…'
                    : list.moreStatus === 'error'
                      ? '다시 시도'
                      : '더 보기'}
                </Button>
              ) : (
                <p className="font-sans text-fine text-ink-faint">문장을 모두 보았어요.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

type Row = Candidate | ComposePick;

function QuoteRow({
  row,
  checked,
  onToggle,
}: {
  row: Row;
  checked: boolean;
  onToggle: () => void;
}) {
  const id = useId();
  const quoteId = `${id}-q`;
  const metaId = `${id}-m`;
  const quoteRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);

  // 세 줄을 넘는 문장에만 '전체 보기'를 둔다
  useLayoutEffect(() => {
    const el = quoteRef.current;
    if (!el || open) return;
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [row.quote, open]);

  return (
    <li className="border-t border-hairline py-3">
      <label className="grid cursor-pointer grid-cols-[28px_minmax(0,1fr)] gap-x-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-labelledby={quoteId}
          aria-describedby={metaId}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={`mt-0.5 grid h-[22px] w-[22px] place-items-center rounded-full border text-ink-invert transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper ${checked ? 'border-accent bg-accent' : 'border-hairline-strong bg-paper'}`}
        >
          {checked && <Check size={14} strokeWidth={2.5} />}
        </span>
        <span className="min-w-0">
          <span
            id={quoteId}
            ref={quoteRef}
            className={`whitespace-pre-wrap break-keep font-serif text-[16px] font-medium leading-[1.55] text-ink [overflow-wrap:anywhere] ${open ? 'block' : 'line-clamp-3'}`}
          >
            {row.quote}
          </span>
          <span id={metaId} className="mt-1 block font-sans text-fine text-ink-faint">
            {row.bookTitle} · {dayLabel(row.date)}
            {row.hasNote && ' · 생각 있음'}
            {row.isPrivate && ' · 비공개'}
          </span>
        </span>
      </label>
      {/* 체크 라벨 안에 버튼을 넣을 수 없어 라벨 바로 아래, 문장 칸에 맞춰 둔다 */}
      {(clamped || open) && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="ml-[38px] min-h-10 font-sans text-fine font-semibold text-accent"
        >
          {open ? '접기' : '전체 보기'}
        </button>
      )}
    </li>
  );
}

function ListSkeleton() {
  return (
    <div role="status" aria-label="문장을 불러오는 중이에요">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="grid grid-cols-[28px_1fr] gap-x-2.5 border-t border-hairline py-3">
          <span className="mt-0.5 h-[22px] w-[22px] rounded-full bg-hairline motion-safe:animate-pulse" />
          <span className="block">
            <span className="block h-4 w-[92%] rounded-sm bg-hairline motion-safe:animate-pulse" />
            <span className="mt-2 block h-4 w-[64%] rounded-sm bg-hairline motion-safe:animate-pulse" />
            <span className="mt-2 block h-3 w-[40%] rounded-sm bg-hairline motion-safe:animate-pulse" />
          </span>
        </div>
      ))}
    </div>
  );
}
