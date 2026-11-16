'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Lock, Search } from 'lucide-react';
import Button from '@/components/ui/Button';
import { fetchPickableEntries, type PickableEntry } from '@/lib/debate/client';

interface EntryPickerProps {
  selectedId?: string | null;
  onPick(entry: PickableEntry): void;
  /** 고를 때 비공개 기록에 붙일 안내 */
  privateNote?: string;
}

/**
 * 내 기록 중 문장이 있는 것을 검색해 하나 고른다. 발제의 첫 단계와 답의 근거 붙이기가 함께 쓴다.
 * 한 쪽(20개)씩 가져오고, 불러오기·실패·다시 시도는 이 목록 안에서만 다룬다.
 */
export default function EntryPicker({ selectedId, onPick, privateNote }: EntryPickerProps) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<PickableEntry[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [state, setState] = useState<'loading' | 'idle' | 'error'>('loading');
  const seq = useRef(0);

  const load = useCallback(async (query: string, page: number) => {
    const mine = ++seq.current;
    setState('loading');
    try {
      const res = await fetchPickableEntries(query, page);
      if (mine !== seq.current) return;
      setItems((prev) => (page === 0 ? res.items : [...prev, ...res.items]));
      setNext(res.next);
      setState('idle');
    } catch {
      if (mine === seq.current) setState('error');
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(q, 0), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q, load]);

  return (
    <div>
      <label className="flex items-center gap-2 border-b border-hairline-strong pb-2 focus-within:border-accent">
        <Search size={18} strokeWidth={1.75} className="text-ink-faint" aria-hidden />
        <span className="sr-only">문장 찾기</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="문장으로 찾기"
          className="min-h-10 w-full bg-transparent font-sans text-input text-ink placeholder:text-ink-faint focus:outline-none"
        />
      </label>

      <ul className="mt-2" aria-busy={state === 'loading'}>
        {items.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onPick(e)}
              aria-pressed={selectedId === e.id}
              className={clsx(
                'block w-full border-b border-hairline py-3.5 text-left transition-colors',
                selectedId === e.id ? 'bg-accent/[0.07]' : 'hover:bg-ink/[0.03]'
              )}
            >
              <span className="line-clamp-3 font-serif text-body text-ink">{e.quote}</span>
              <span className="mt-1 flex items-center gap-1.5 font-sans text-fine text-ink-sub">
                {e.bookTitle}
                {e.isPrivate && (
                  <span className="inline-flex items-center gap-0.5 text-ink-faint">
                    <Lock size={12} strokeWidth={1.75} aria-hidden />
                    나만 보기
                  </span>
                )}
              </span>
              {e.isPrivate && privateNote && selectedId === e.id && (
                <span className="mt-1 block font-sans text-fine text-accent">{privateNote}</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {state === 'loading' && (
        <p className="py-4 font-sans text-caption text-ink-faint">불러오는 중…</p>
      )}
      {state === 'error' && (
        <div className="py-4 font-sans text-caption text-ink-sub">
          기록을 불러오지 못했어요.{' '}
          <button
            type="button"
            className="font-semibold text-accent"
            onClick={() => void load(q, 0)}
          >
            다시 시도
          </button>
        </div>
      )}
      {state === 'idle' && items.length === 0 && (
        <p className="py-4 font-sans text-caption text-ink-sub">
          {q ? '찾는 문장이 없어요.' : '문장을 남긴 기록이 아직 없어요.'}
        </p>
      )}
      {state === 'idle' && next !== null && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => void load(q, next)}>
          더 보기
        </Button>
      )}
    </div>
  );
}
