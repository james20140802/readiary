'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { apiFetch } from '@/lib/api/fetch';
import { monthLabel } from '@/lib/monthly-excerpt/month';
import { fallbackNotice, ownMeta, placeholder, yearLabels } from '@/lib/monthly-sentence/model';
import type { OwnSentenceRow, OwnSentences } from '@/lib/monthly-sentence/types';
import SentencePickerSheet from './SentencePickerSheet';
import SentenceRows, { ROW_ACTION, type SentenceRowView } from './SentenceRows';

const CAP = 'font-sans text-[14px] font-medium leading-normal text-ink-sub';
const TEXT_LINK = 'font-sans text-button-sm text-accent underline-offset-4 hover:underline';

async function loadPage(before: string | null): Promise<OwnSentences> {
  const res = await apiFetch(
    before ? `/api/monthly-sentences?before=${before}` : '/api/monthly-sentences'
  );
  if (!res.ok) throw new Error('sentences');
  const body = (await res.json()) as OwnSentences;
  if (body.mode !== 'own') throw new Error('sentences');
  return body;
}

/**
 * 서버가 첫 쪽을 새로 내려 줬을 때(저장 뒤 router.refresh 등) 펼쳐 둔 목록에 합친다.
 * 같은 기준이면 앞쪽 줄만 새 값으로 갈고 더 펼친 줄과 다음 위치는 그대로 둔다 — 저장할 때마다 목록이 접히지 않게.
 * 기준이 달라졌으면 펼친 줄의 문장도 달라졌을 수 있으므로 새 값으로 통째로 맞춘다.
 */
export function mergeFresh(
  shown: OwnSentences | null,
  fresh: OwnSentences | null
): OwnSentences | null {
  if (!shown || !fresh || shown.rule !== fresh.rule || shown.rows.length <= fresh.rows.length) {
    return fresh;
  }
  const head = new Set(fresh.rows.map((r) => r.month));
  const oldest = fresh.rows.at(-1)?.month;
  if (!oldest) return fresh;
  // 새 첫 쪽보다 오래된 줄만 뒤에 잇는다(달이 바뀌어 첫 쪽이 한 칸 밀려도 겹치지 않는다)
  const tail = shown.rows.filter((r) => !head.has(r.month) && r.month < oldest);
  if (tail.length === 0) return fresh;
  return { ...fresh, rows: [...fresh.rows, ...tail], nextBefore: shown.nextBefore };
}

/**
 * 내 일기장의 달마다 한 문장 — 달 목록, 더 보기, 문장 고르기. 고르지 않은 달을 채우는 기준은 설정에서 고른다.
 * 모바일 장과 데스크톱 장에 한 번씩 그려지므로, 저장한 뒤 router.refresh()로 다른 쪽도 새 값을 받게 한다.
 */
export default function MySentences({ initial }: { initial: OwnSentences | null }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [seen, setSeen] = useState(initial);
  const [more, setMore] = useState<'idle' | 'loading' | 'error'>('idle');
  const [picking, setPicking] = useState<OwnSentenceRow | null>(null);
  // 닫히는 동안에도 시트가 마지막 달을 들고 있도록 열림 여부를 따로 둔다
  const [pickerOpen, setPickerOpen] = useState(false);

  // 서버가 새 값을 내려 주면(다른 쪽에서 저장했거나 화면을 다시 열었을 때) 그 값으로 맞춘다
  if (initial !== seen) {
    setSeen(initial);
    setData(mergeFresh(data, initial));
    setMore('idle');
  }

  if (!data) {
    return (
      <p className={`${CAP} mt-3.5`}>
        달마다 남긴 문장을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.
      </p>
    );
  }
  if (data.rows.length === 0) {
    return (
      <p className={`${CAP} mt-3.5`}>
        첫 문장을 남기면 이 일기장의 첫 장이 생겨요.{' '}
        <Link href="/today" className={TEXT_LINK}>
          오늘 남기기
        </Link>
      </p>
    );
  }

  const loadMore = async () => {
    if (more === 'loading' || !data.nextBefore) return;
    setMore('loading');
    try {
      const next = await loadPage(data.nextBefore);
      setData((prev) =>
        prev ? { ...prev, rows: [...prev.rows, ...next.rows], nextBefore: next.nextBefore } : prev
      );
      setMore('idle');
    } catch {
      setMore('error');
    }
  };

  const onPicked = (row: OwnSentenceRow) => {
    setData((prev) =>
      prev ? { ...prev, rows: prev.rows.map((r) => (r.month === row.month ? row : r)) } : prev
    );
    router.refresh();
  };

  const years = yearLabels(data.rows.map((r) => r.month));
  const views: SentenceRowView[] = data.rows.map((row, i) => {
    const label = monthLabel(row.month);
    return {
      month: row.month,
      year: years[i],
      quote: row.quote,
      placeholder: placeholder(row),
      href: row.entryId ? `/entry/${row.entryId}` : null,
      meta: ownMeta(row),
      notice: fallbackNotice(row.friendFallback),
      actions:
        row.entryId || row.excerpt !== 'none' ? (
          <>
            {row.excerpt === 'unmade' && (
              <Link
                href={`/excerpts/${row.month}/compose`}
                aria-label={`${label} 엮기`}
                className={ROW_ACTION}
              >
                엮기
              </Link>
            )}
            {row.excerpt === 'made' && (
              <Link
                href={`/excerpts/${row.month}`}
                aria-label={`${label} 펼치기`}
                className={ROW_ACTION}
              >
                펼치기
              </Link>
            )}
            {row.entryId && (
              <button
                type="button"
                aria-label={`${label} 문장 바꾸기`}
                onClick={() => {
                  setPicking(row);
                  setPickerOpen(true);
                }}
                className={ROW_ACTION}
              >
                바꾸기
              </button>
            )}
          </>
        ) : undefined,
    };
  });

  return (
    <div className="mt-3.5">
      <SentenceRows rows={views} label="달마다 한 문장" />

      {more === 'error' ? (
        <p role="alert" className={`${CAP} border-t border-hairline pt-3`}>
          문장을 불러오지 못했어요.{' '}
          <button type="button" onClick={loadMore} className={`${TEXT_LINK} min-h-11`}>
            다시 시도
          </button>
        </p>
      ) : (
        data.nextBefore && (
          <div className="border-t border-hairline pt-3">
            <Button variant="secondary" size="sm" disabled={more === 'loading'} onClick={loadMore}>
              더 보기
            </Button>
          </div>
        )
      )}

      <Link href="/excerpts" className={`${TEXT_LINK} mt-2 inline-flex min-h-11 items-center`}>
        달의 발췌집 모두 보기
      </Link>

      {picking && (
        <SentencePickerSheet
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          month={picking.month}
          current={picking}
          onPicked={onPicked}
        />
      )}
    </div>
  );
}
