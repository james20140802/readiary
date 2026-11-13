'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import clsx from 'clsx';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import { apiFetch, SessionExpiredError } from '@/lib/api/fetch';
import { dayLabel } from '@/lib/monthly-excerpt/month';
import type { MonthKey } from '@/lib/monthly-excerpt/types';
import { monthNumber, pickNotice } from '@/lib/monthly-sentence/model';
import type {
  OwnSentenceRow,
  SentenceCandidate,
  SentenceCandidates,
} from '@/lib/monthly-sentence/types';

type Page = SentenceCandidates & { hasMore: boolean };

const SAVE_FAILED = '문장을 바꾸지 못했어요. 잠시 뒤 다시 해 주세요.';
const LOAD_FAILED = '문장을 불러오지 못했어요.';

async function loadCandidates(month: MonthKey, offset: number): Promise<Page> {
  const res = await apiFetch(`/api/monthly-sentences/candidates?month=${month}&offset=${offset}`);
  if (!res.ok) throw new Error('candidates');
  return (await res.json()) as Page;
}

function Retry({ onRetry }: { onRetry: () => void }) {
  return (
    <p role="alert" className="py-4 font-sans text-body-sm text-ink-sub">
      {LOAD_FAILED}{' '}
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 font-sans text-button-sm text-accent underline-offset-4 hover:underline"
      >
        다시 시도
      </button>
    </p>
  );
}

interface PickerProps {
  onClose: () => void;
  month: MonthKey;
  current: OwnSentenceRow;
  /** 저장한 뒤 바뀐 줄 */
  onPicked: (row: OwnSentenceRow) => void;
}

/**
 * 그 달의 문장 고르기 — 열릴 때 그 달의 내 문장을 불러온다. 지금 문장이 맨 위에 있고,
 * 후보를 누르면 바로 저장한다. 내가 고른 달이면 자동으로 되돌릴 수 있다.
 */
export default function SentencePickerSheet({ open, ...props }: PickerProps & { open: boolean }) {
  return (
    <Sheet open={open} onClose={props.onClose} title={`${monthNumber(props.month)}월의 문장`}>
      {/* 몸은 시트가 열려 있을 때만 생긴다 — 닫힌 시트를 위해 후보를 미리 가져오지 않는다 */}
      <PickerBody key={props.month} {...props} />
    </Sheet>
  );
}

function PickerBody({ onClose, month, current, onPicked }: PickerProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [items, setItems] = useState<SentenceCandidate[]>([]);
  const [publicCount, setPublicCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [more, setMore] = useState<'idle' | 'loading' | 'error'>('idle');
  const [saving, setSaving] = useState(false);
  // 닫힌 뒤에 도착한 응답은 버린다
  const alive = useRef(true);
  const group = useRef<HTMLDivElement>(null);

  useEffect(() => {
    alive.current = true;
    loadCandidates(month, 0).then(
      (page) => {
        if (!alive.current) return;
        setItems(page.items);
        setPublicCount(page.publicCount);
        setHasMore(page.hasMore);
        setStatus('ready');
      },
      () => {
        if (alive.current) setStatus('error');
      }
    );
    return () => {
      alive.current = false;
    };
  }, [month, attempt]);

  const retry = () => {
    setStatus('loading');
    setAttempt((n) => n + 1);
  };

  const loadMore = async () => {
    if (more === 'loading') return;
    setMore('loading');
    try {
      const page = await loadCandidates(month, items.length);
      if (!alive.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((c) => c.entryId));
        return [...prev, ...page.items.filter((c) => !seen.has(c.entryId))];
      });
      setPublicCount(page.publicCount);
      setHasMore(page.hasMore);
      setMore('idle');
    } catch {
      if (alive.current) setMore('error');
    }
  };

  const save = async (entryId: string | null) => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await apiFetch('/api/monthly-sentences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, entryId }),
      });
      if (!res.ok) {
        toast.error(SAVE_FAILED);
        return;
      }
      const body = (await res.json()) as { row: OwnSentenceRow };
      onPicked(body.row);
      onClose();
    } catch (error) {
      if (!(error instanceof SessionExpiredError)) toast.error(SAVE_FAILED);
    } finally {
      setSaving(false);
    }
  };

  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    const radios = Array.from(
      group.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? []
    );
    const index = radios.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault();
    radios[(index + step + radios.length) % radios.length]?.focus();
  };

  return (
    <>
      <div className="border-l-2 border-accent pl-3.5">
        <p className="font-sans text-overline text-ink-sub">지금 문장</p>
        <p className="mt-1 break-words font-serif text-note text-ink">{current.quote}</p>
      </div>

      {current.source === 'picked' && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" disabled={saving} onClick={() => save(null)}>
            자동으로 되돌리기
          </Button>
        </div>
      )}

      <div className="mt-5">
        {status === 'loading' && (
          <div aria-busy="true" aria-label="문장을 불러오는 중" className="space-y-3 py-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 rounded-[6px] bg-ink/[.06]" />
            ))}
          </div>
        )}
        {status === 'error' && <Retry onRetry={retry} />}
        {status === 'ready' && (
          <>
            <div ref={group} role="radiogroup" aria-label="이 달에 남긴 문장" onKeyDown={moveFocus}>
              {items.map((c) => {
                const checked = c.entryId === current.entryId;
                const notice = pickNotice(c, publicCount);
                return (
                  <button
                    key={c.entryId}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    disabled={saving}
                    onClick={() => save(c.entryId)}
                    className={clsx(
                      'block w-full border-t border-hairline py-3.5 text-left',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent',
                      'disabled:opacity-60'
                    )}
                  >
                    <span
                      className={clsx(
                        'line-clamp-2 break-words font-serif text-body',
                        checked ? 'font-semibold text-accent' : 'text-ink'
                      )}
                    >
                      {c.quote}
                    </span>
                    <span className="mt-1 block font-sans text-caption text-ink-sub">
                      {[c.bookTitle, dayLabel(c.date), c.isPrivate ? '나만 보기' : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {notice && (
                      <span className="mt-0.5 block font-sans text-caption text-ink-sub">
                        {notice}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {more === 'error' ? (
              <Retry onRetry={loadMore} />
            ) : (
              hasMore && (
                <div className="border-t border-hairline pt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={more === 'loading'}
                    onClick={loadMore}
                  >
                    더 보기
                  </Button>
                </div>
              )
            )}
          </>
        )}
      </div>
    </>
  );
}
