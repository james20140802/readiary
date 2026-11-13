'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import { apiFetch, SessionExpiredError } from '@/lib/api/fetch';
import { monthLabel } from '@/lib/monthly-excerpt/month';
import {
  availableRules,
  fallbackNotice,
  ownMeta,
  placeholder,
  ruleLabel,
  ruleSentence,
  shownRule,
  yearLabels,
} from '@/lib/monthly-sentence/model';
import type { OwnSentenceRow, OwnSentences, SentenceRule } from '@/lib/monthly-sentence/types';
import SentencePickerSheet from './SentencePickerSheet';
import SentenceRows, { ROW_ACTION, type SentenceRowView } from './SentenceRows';

const CAP = 'font-sans text-[14px] font-medium leading-normal text-ink-sub';
const TEXT_LINK = 'font-sans text-button-sm text-accent underline-offset-4 hover:underline';
const RULE_FAILED = '기준을 바꾸지 못했어요. 잠시 뒤 다시 해 주세요.';

async function loadPage(before: string | null): Promise<OwnSentences> {
  const res = await apiFetch(
    before ? `/api/monthly-sentences?before=${before}` : '/api/monthly-sentences'
  );
  if (!res.ok) throw new Error('sentences');
  const body = (await res.json()) as OwnSentences;
  if (body.mode !== 'own') throw new Error('sentences');
  return body;
}

/** 지금 펼쳐 둔 줄 수만큼 처음부터 다시 받는다 — 기준이 바뀌면 여러 달의 문장이 함께 바뀐다. */
async function reload(shown: number): Promise<OwnSentences> {
  let data = await loadPage(null);
  while (data.rows.length < shown && data.nextBefore) {
    const next = await loadPage(data.nextBefore);
    data = { ...next, rows: [...data.rows, ...next.rows] };
  }
  return data;
}

/**
 * 내 일기장의 달마다 한 문장 — 자동 기준 한 줄, 달 목록, 더 보기, 문장 고르기.
 * 모바일 장과 데스크톱 장에 한 번씩 그려지므로, 저장한 뒤 router.refresh()로 다른 쪽도 새 값을 받게 한다.
 */
export default function MySentences({ initial }: { initial: OwnSentences | null }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [seen, setSeen] = useState(initial);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [more, setMore] = useState<'idle' | 'loading' | 'error'>('idle');
  const [picking, setPicking] = useState<OwnSentenceRow | null>(null);
  // 닫히는 동안에도 시트가 마지막 달을 들고 있도록 열림 여부를 따로 둔다
  const [pickerOpen, setPickerOpen] = useState(false);

  // 서버가 새 값을 내려 주면(다른 쪽에서 저장했거나 화면을 다시 열었을 때) 그 값으로 맞춘다
  if (initial !== seen) {
    setSeen(initial);
    setData(initial);
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

  const rule = shownRule(data.rule, data.reflectionsOn);

  const changeRule = async (next: SentenceRule) => {
    if (savingRule || next === rule) return;
    const previous = data;
    setSavingRule(true);
    setData({ ...data, rule: next });
    try {
      const res = await apiFetch('/api/monthly-sentences/rule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule: next }),
      });
      if (!res.ok) throw new Error('rule');
      setData(await reload(previous.rows.length));
      setRulesOpen(false);
      router.refresh();
    } catch (error) {
      setData(previous);
      if (!(error instanceof SessionExpiredError)) toast.error(RULE_FAILED);
    } finally {
      setSavingRule(false);
    }
  };

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
      <button
        type="button"
        aria-expanded={rulesOpen}
        onClick={() => setRulesOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-1 text-left font-sans text-caption text-ink-sub underline decoration-hairline-strong underline-offset-4 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        {ruleSentence(rule)}
      </button>
      {rulesOpen && (
        <div
          role="radiogroup"
          aria-label="고르지 않은 달을 채우는 기준"
          className="mb-3 flex flex-wrap gap-2"
        >
          {availableRules(data.reflectionsOn).map((option) => (
            <Chip
              key={option}
              role="radio"
              aria-checked={option === rule}
              selected={option === rule}
              disabled={savingRule}
              onClick={() => changeRule(option)}
            >
              {ruleLabel(option)}
            </Chip>
          ))}
        </div>
      )}

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
