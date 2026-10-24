'use client';

import type { ReactNode } from 'react';
import Pile from '@/components/ui/Pile';
import Button from '@/components/ui/Button';
import { slipLabel } from '@/components/entry/dates';
import type { EntryReflection } from '@/lib/reflections/types';
import { thoughtDate } from './thoughtDate';

interface ReflectionPileProps {
  /** 맨 위(가장 최근)부터 */
  items: EntryReflection[];
  /** 기록한 날 — 있으면 간지 머리를 '이틀 뒤 · 9월 18일'로 쓴다 */
  entryDate?: string;
  today: string;
  canWrite: boolean;
  entryIsPrivate: boolean;
  /** 고치기·지우기를 잠시 막는다(쓰는 중·지우는 중) */
  actionsDisabled?: boolean;
  onEdit?: (item: EntryReflection) => void;
  onDelete?: (item: EntryReflection, trigger: HTMLButtonElement) => void;
  /** '지금의 생각 덧붙이기' 같은 묶음 아래 동작 */
  addAction?: ReactNode;
  /** 덧붙인 생각이 없을 때 */
  emptyText?: string;
}

const HEAD = 'font-sans text-[14px] font-semibold text-ink-sub';

/**
 * 덧붙인 생각 = 그때의 생각 아래 간지 묶음(시안 entry-layer.html). 맨 위가 가장 최근이고,
 * 밀거나 '다음 간지'로 한 장씩 뒤로 넘긴다. 머리줄과 아래 동작 줄은 묶음과 같은 상자 안에서
 * 순서만 바꿔 그린다 — 키보드 순서는 머리 → 동작 → 맨 위 간지.
 */
export default function ReflectionPile({
  items,
  entryDate,
  today,
  canWrite,
  entryIsPrivate,
  actionsDisabled = false,
  onEdit,
  onDelete,
  addAction,
  emptyText,
}: ReflectionPileProps) {
  const label = (item: EntryReflection) =>
    entryDate ? slipLabel(entryDate, item.created_at, today) : thoughtDate(item.created_at);

  if (items.length === 0)
    return (
      <div>
        <h3 className={`mt-[22px] ${HEAD}`}>덧붙인 생각</h3>
        {emptyText && (
          <p className="mt-2 font-serif text-[17px] leading-[1.6] text-ink-sub lg:text-note">
            {emptyText}
          </p>
        )}
        {addAction && <div className="mt-[26px] flex flex-wrap gap-2">{addAction}</div>}
      </div>
    );

  return (
    <Pile
      // 개수나 구성이 바뀌면(덧붙이기·지우기·더 불러오기) 처음처럼 가장 최근 장을 맨 위로 다시 쌓는다
      key={items.map((i) => i.id).join('|')}
      items={items}
      getKey={(i) => i.id}
      label="덧붙인 생각 묶음. 맨 위 간지를 옆으로 밀면 아래로 넘어가요"
      nextLabel="다음 간지"
      slipInset={30}
      className="flex flex-col"
      renderHeader={({ position, next, canNext, nextLabel }) => (
        <>
          <div className="order-first mb-2.5 mt-[22px] flex items-baseline gap-2">
            <h3 className={HEAD}>덧붙인 생각</h3>
            {canNext && (
              <span aria-live="polite" className="font-mono text-[13px] text-ink-faint">
                {position}
              </span>
            )}
          </div>
          {(addAction || canNext) && (
            <div className="order-last mt-[26px] flex flex-wrap gap-2">
              {addAction}
              {canNext && (
                <Button size="sm" variant="secondary" onClick={next}>
                  {nextLabel}
                </Button>
              )}
            </div>
          )}
        </>
      )}
      renderSlip={(item) => (
        <article>
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-sans text-[13px] font-semibold text-ink-sub">
              <time dateTime={item.created_at}>{label(item)}</time>
              {canWrite && (entryIsPrivate || item.is_private) && <span> · 나만 보기</span>}
              {item.updated_at !== item.created_at && <span> · 고침</span>}
            </p>
            {canWrite && (
              <span className="-my-2 flex shrink-0 gap-3">
                <button
                  type="button"
                  className="min-h-10 font-sans text-[13px] font-semibold text-ink-sub hover:text-accent disabled:opacity-50"
                  disabled={actionsDisabled}
                  onClick={() => onEdit?.(item)}
                >
                  고치기
                </button>
                <button
                  type="button"
                  className="min-h-10 font-sans text-[13px] font-semibold text-ink-sub hover:text-danger disabled:opacity-50"
                  disabled={actionsDisabled}
                  onClick={(e) => onDelete?.(item, e.currentTarget)}
                >
                  지우기
                </button>
              </span>
            )}
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words font-serif text-note leading-[1.55] text-ink lg:text-[21px]">
            {item.body}
          </p>
        </article>
      )}
    />
  );
}

/** 덧붙인 생각을 불러오는 중·못 불러온 상태 — 이미 보이는 묶음이 있으면 불러오는 중은 읽어 주기만 한다 */
export function ReflectionLoadState({
  loading,
  hasPage,
  error,
  onRetry,
}: {
  loading: boolean;
  hasPage: boolean;
  error: string;
  onRetry: () => void;
}) {
  return (
    <>
      {loading && (
        <p
          role="status"
          className={hasPage ? 'sr-only' : 'mt-[22px] font-sans text-caption text-ink-sub'}
        >
          생각을 불러오는 중입니다.
        </p>
      )}
      {error && (
        <div className="mt-[22px]" role="alert">
          <p className="font-sans text-caption text-danger">{error}</p>
          <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
            다시 불러오기
          </Button>
        </div>
      )}
    </>
  );
}
