'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { apiFetch } from '@/lib/api/fetch';
import { monthLabel } from '@/lib/monthly-excerpt/month';
import type { MonthKey } from '@/lib/monthly-excerpt/types';
import { friendMeta, yearLabels } from '@/lib/monthly-sentence/model';
import type {
  FriendSentenceRow,
  FriendSentences,
  OwnSentences,
} from '@/lib/monthly-sentence/types';
import SentenceRows, { ROW_ACTION, type SentenceRowView } from './SentenceRows';

type Sentences = OwnSentences | FriendSentences;

/**
 * 서재에 보일 줄 — 읽기 전용이라 내 응답도 친구 응답의 모양으로 줄인다.
 * 문장이 없는 달은 빼고, 정해진 방식·기록 수·나만 보기 안내는 싣지 않는다.
 */
export function libraryRows(data: Sentences): FriendSentenceRow[] {
  if (data.mode === 'friend') return data.rows;
  return data.rows.flatMap((row) =>
    row.entryId && row.quote !== null
      ? [
          {
            month: row.month,
            entryId: row.entryId,
            quote: row.quote,
            bookTitle: row.bookTitle,
            fromPage: row.fromPage,
            toPage: row.toPage,
            hasExcerpt: row.excerpt === 'made',
          },
        ]
      : []
  );
}

/** 서재의 달마다 한 문장 — 문장은 기록 한 장으로, 발췌집을 보여 준 달은 펼치기로 이어진다. */
export default function LibrarySentences({
  initial,
  ownerId,
  entryBase,
  excerptsBase,
}: {
  initial: Sentences;
  ownerId: string;
  /** 기록 한 장 주소의 앞부분 — 본인 '/entry', 친구 '{서재}/entry' */
  entryBase: string;
  /** 달의 발췌집 주소의 앞부분 — 본인 '/excerpts', 친구 '{서재}/excerpts' */
  excerptsBase: string;
}) {
  const [seen, setSeen] = useState(initial);
  const [rows, setRows] = useState(() => libraryRows(initial));
  const [nextBefore, setNextBefore] = useState<MonthKey | null>(initial.nextBefore);
  const [more, setMore] = useState<'idle' | 'loading' | 'error'>('idle');

  if (initial !== seen) {
    setSeen(initial);
    setRows(libraryRows(initial));
    setNextBefore(initial.nextBefore);
    setMore('idle');
  }

  const loadMore = async () => {
    if (more === 'loading' || !nextBefore) return;
    setMore('loading');
    try {
      const res = await apiFetch(`/api/monthly-sentences?owner=${ownerId}&before=${nextBefore}`);
      if (!res.ok) throw new Error('sentences');
      const next = (await res.json()) as Sentences | { mode: 'none' };
      if (next.mode === 'none') {
        // 그사이 볼 수 없는 사이가 됐다 — 더 불러올 것이 없다
        setNextBefore(null);
      } else {
        setRows((prev) => [...prev, ...libraryRows(next)]);
        setNextBefore(next.nextBefore);
      }
      setMore('idle');
    } catch {
      setMore('error');
    }
  };

  const years = yearLabels(rows.map((r) => r.month));
  const views: SentenceRowView[] = rows.map((row, i) => ({
    month: row.month,
    year: years[i],
    quote: row.quote,
    placeholder: null,
    href: `${entryBase}/${row.entryId}`,
    meta: friendMeta(row),
    notice: null,
    actions: row.hasExcerpt ? (
      <Link
        href={`${excerptsBase}/${row.month}`}
        aria-label={`${monthLabel(row.month)} 펼치기`}
        className={ROW_ACTION}
      >
        펼치기
      </Link>
    ) : undefined,
  }));

  if (views.length === 0) return null;

  return (
    <>
      <SentenceRows rows={views} label="달마다 한 문장" />
      {more === 'error' ? (
        <p
          role="alert"
          className="border-t border-hairline pt-3 font-sans text-body-sm text-ink-sub"
        >
          문장을 불러오지 못했어요.{' '}
          <button
            type="button"
            onClick={loadMore}
            className="min-h-11 font-sans text-button-sm text-accent underline-offset-4 hover:underline"
          >
            다시 시도
          </button>
        </p>
      ) : (
        nextBefore && (
          <div className="border-t border-hairline pt-3">
            <Button variant="secondary" size="sm" disabled={more === 'loading'} onClick={loadMore}>
              더 보기
            </Button>
          </div>
        )
      )}
    </>
  );
}

/** 구역 머리의 '모두 보기'를 둘지 — 친구는 보여 준 발췌집이, 본인은 엮은 달이 하나라도 있을 때. */
export function hasLibraryExcerpts(data: Sentences): boolean {
  return data.mode === 'friend'
    ? data.hasAnyExcerpt
    : data.rows.some((row) => row.excerpt === 'made');
}
