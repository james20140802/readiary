'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { movePick, reorderPick } from '@/lib/monthly-excerpt/compose';
import type { ComposePick } from '@/lib/monthly-excerpt/compose';
import { dayLabel } from '@/lib/monthly-excerpt/month';

interface OrderStepProps {
  picks: ComposePick[];
  onChange: (next: ComposePick[]) => void;
}

interface Drag {
  id: string;
  from: number;
  to: number;
  dy: number;
}

interface DragSession {
  id: string;
  from: number;
  /** 끌기 시작 때의 문서 기준 포인터 y */
  startDocY: number;
  /** 각 줄의 문서 기준 가운데 y (끌기 시작 때) */
  mids: number[];
  clientY: number;
}

const ICON_BUTTON =
  'grid h-10 w-10 flex-none place-items-center rounded-full text-ink-sub transition-colors hover:bg-card-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent aria-disabled:opacity-30 aria-disabled:hover:bg-transparent';

/**
 * 2단계 — 고른 문장의 순서를 정한다. 위·아래 버튼이 기본이고(키보드·낭독기),
 * 오른쪽 손잡이를 끌어 옮길 수도 있다(포인터 이벤트로 직접 구현, 새 의존성 없음).
 */
export default function OrderStep({ picks, onChange }: OrderStepProps) {
  const [announce, setAnnounce] = useState({ text: '', tick: 0 });
  const [drag, setDrag] = useState<Drag | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  // 옮긴 뒤 키보드 초점을 같은 버튼에 돌려줄 표식 — 목록이 다시 그려지며 초점이 풀릴 수 있다
  const refocus = useRef<string | null>(null);
  const session = useRef<DragSession | null>(null);
  const frame = useRef(0);
  const latest = useRef({ picks, onChange });
  useEffect(() => {
    latest.current = { picks, onChange };
  });

  const say = (text: string) => setAnnounce((a) => ({ text, tick: a.tick + 1 }));

  useLayoutEffect(() => {
    if (!refocus.current) return;
    buttons.current.get(refocus.current)?.focus();
    refocus.current = null;
  }, [picks]);

  const moveBy = (id: string, delta: -1 | 1) => {
    const from = picks.findIndex((p) => p.entryId === id);
    const next = movePick(picks, id, delta);
    refocus.current = `${id}:${delta < 0 ? 'up' : 'down'}`;
    if (next === picks) {
      say(delta < 0 ? '맨 위예요' : '맨 아래예요');
      return;
    }
    onChange(next);
    say(`${from + delta + 1}번째로 옮겼어요`);
  };

  // 포인터 위치 → 끌고 있는 줄의 이동량과 놓일 자리
  const track = useCallback(() => {
    const s = session.current;
    if (!s) return;
    const docY = s.clientY + window.scrollY;
    // 끌고 있는 줄을 뺀 나머지 중 가운데가 포인터 위에 있는 줄의 수가 놓일 자리다
    const to = s.mids.filter((m, i) => i !== s.from && m < docY).length;
    setDrag({ id: s.id, from: s.from, to, dy: docY - s.startDocY });
  }, []);

  const stop = useCallback(() => {
    session.current = null;
    cancelAnimationFrame(frame.current);
    setDrag(null);
  }, []);

  // 화면 가장자리에서는 끄는 동안 쪽이 따라 스크롤된다. 스스로를 다시 예약하므로 ref로 둔다
  const tick = useRef<() => void>(() => {});
  useEffect(() => {
    tick.current = () => {
      const s = session.current;
      if (!s) return;
      const edge = 90;
      let step = 0;
      if (s.clientY < edge) step = -14;
      else if (s.clientY > window.innerHeight - edge - 70) step = 14;
      if (step) {
        window.scrollBy(0, step);
        track();
      }
      frame.current = requestAnimationFrame(() => tick.current());
    };
  }, [track]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const onDown = (e: ReactPointerEvent<HTMLElement>, id: string, index: number) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const mids = picks.map((p) => {
      const r = rows.current.get(p.entryId)?.getBoundingClientRect();
      return r ? r.top + window.scrollY + r.height / 2 : 0;
    });
    session.current = {
      id,
      from: index,
      startDocY: e.clientY + window.scrollY,
      mids,
      clientY: e.clientY,
    };
    setDrag({ id, from: index, to: index, dy: 0 });
    frame.current = requestAnimationFrame(() => tick.current());
  };

  const onMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (!session.current) return;
    session.current.clientY = e.clientY;
    track();
  };

  const onUp = () => {
    const s = session.current;
    if (!s) return;
    const { picks: current, onChange: change } = latest.current;
    const d = drag;
    stop();
    if (d && d.to !== d.from) {
      change(reorderPick(current, d.from, d.to));
      say(`${d.to + 1}번째로 옮겼어요`);
    }
  };

  const marker = (i: number) => {
    if (!drag || drag.to === drag.from) return '';
    if (i === drag.to) {
      return drag.to < drag.from
        ? 'shadow-[inset_0_2px_0_0_rgb(var(--accent))]'
        : 'shadow-[inset_0_-2px_0_0_rgb(var(--accent))]';
    }
    return '';
  };

  return (
    <div>
      <ol className="list-none">
        {picks.map((p, i) => {
          const dragging = drag?.id === p.entryId;
          return (
            <li
              key={p.entryId}
              ref={(el) => {
                if (el) rows.current.set(p.entryId, el);
                else rows.current.delete(p.entryId);
              }}
              style={dragging ? { transform: `translateY(${drag.dy}px)` } : undefined}
              className={`relative grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 border-t border-hairline py-2 ${dragging ? 'z-10 bg-paper ring-1 ring-hairline-strong' : ''} ${marker(i)}`}
            >
              <span className="font-sans text-fine text-ink-sub">{i + 1}</span>
              <span className="min-w-0">
                <span className="line-clamp-2 break-keep font-serif text-[15px] font-medium leading-[1.5] text-ink [overflow-wrap:anywhere]">
                  {p.quote}
                </span>
                <span className="mt-0.5 block truncate font-sans text-fine text-ink-faint">
                  {p.bookTitle} · {dayLabel(p.date)}
                </span>
              </span>
              <span className="flex items-center">
                <button
                  type="button"
                  ref={(el) => {
                    if (el) buttons.current.set(`${p.entryId}:up`, el);
                    else buttons.current.delete(`${p.entryId}:up`);
                  }}
                  aria-label={`${i + 1}번째 문장 위로`}
                  aria-disabled={i === 0}
                  onClick={() => moveBy(p.entryId, -1)}
                  className={ICON_BUTTON}
                >
                  <ChevronUp size={20} strokeWidth={1.75} aria-hidden />
                </button>
                <button
                  type="button"
                  ref={(el) => {
                    if (el) buttons.current.set(`${p.entryId}:down`, el);
                    else buttons.current.delete(`${p.entryId}:down`);
                  }}
                  aria-label={`${i + 1}번째 문장 아래로`}
                  aria-disabled={i === picks.length - 1}
                  onClick={() => moveBy(p.entryId, 1)}
                  className={ICON_BUTTON}
                >
                  <ChevronDown size={20} strokeWidth={1.75} aria-hidden />
                </button>
                {/* 끌어서 옮기기 — 포인터 전용이다. 키보드와 낭독기는 위·아래 버튼을 쓴다 */}
                <span
                  aria-hidden
                  onPointerDown={(e) => onDown(e, p.entryId, i)}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={stop}
                  className={`grid h-10 w-9 flex-none touch-none select-none place-items-center text-ink-faint ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                >
                  <GripVertical size={20} strokeWidth={1.75} />
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <p role="status" aria-live="polite" className="sr-only">
        {announce.text}
        {announce.tick % 2 === 0 ? '' : '​'}
      </p>
    </div>
  );
}
