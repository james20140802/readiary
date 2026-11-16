'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import type { Range } from '@/lib/debate/types';
import { MAX_UNDERLINES, planStroke, toChars, trimRange, wordAt } from '@/lib/debate/underline';

interface UnderlinePenProps {
  /** 고정할 문장 */
  quote: string;
  value: Range[];
  onChange(next: Range[]): void;
}

const GUIDE = '문장 위를 손가락으로 그어요. 한 번 누르면 그 어절만';
const GUIDE_AWAY = '손을 떼면 취소돼요';
const GUIDE_SELECTED = '이 밑줄을 지울까요?';
const LIMIT = '밑줄은 3개까지예요. 하나를 지우고 그어요';
/** 문장 상자에서 이만큼 벗어나면 "빼서 취소" 상태가 된다(px) */
const AWAY = 28;

interface Drawing {
  pointerId: number;
  start: number;
  cur: number;
  moved: boolean;
  away: boolean;
}

const inRange = (i: number, r: Range) => i >= r.start && i <= r.end;

/**
 * 펜처럼 긋는 밑줄 — 발제자가 문장 위를 그어 함께 볼 곳(최대 3개)을 짚는다.
 * 시안: docs/design/sentence-debate-2026-11/underline-draw.html의 C.
 * - 긋기: 누른 채 움직이면 글자 단위로 따라오고, 떼면 그어진다. 움직임 없이 누르면 그 어절.
 * - 겹치면 하나로 잇는다(개수는 늘지 않는다). 넷째는 막는다.
 * - 취소: 긋다가 문장 밖으로 빼서 떼기, Esc. 그은 밑줄을 누르면 [밑줄 지우기 | 취소]. 되돌리기는 여러 번.
 * - 키보드: 문장에 초점을 두고 ←/→ 글자 이동, Shift+←/→ 넓히기, Enter 긋기(고른 곳이 없으면 그 어절), Esc 취소.
 */
export default function UnderlinePen({ quote, value, onChange }: UnderlinePenProps) {
  const chars = useMemo(() => toChars(quote), [quote]);
  const sentenceRef = useRef<HTMLParagraphElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const drawing = useRef<Drawing | null>(null);
  const [preview, setPreview] = useState<{ range: Range; away: boolean } | null>(null);
  const [history, setHistory] = useState<Range[][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState('');
  const [caret, setCaret] = useState(0);
  const [kbAnchor, setKbAnchor] = useState<number | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = useCallback((text: string) => {
    setHint(text);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(''), 2400);
  }, []);
  useEffect(() => () => void (hintTimer.current && clearTimeout(hintTimer.current)), []);

  const commit = useCallback(
    (next: Range[]) => {
      setHistory((h) => [...h, value]);
      setSelected(null);
      onChange(next);
    },
    [onChange, value]
  );

  const addStroke = useCallback(
    (stroke: Range | null) => {
      if (!stroke) return;
      const plan = planStroke(value, stroke, MAX_UNDERLINES);
      if (!plan.ok) {
        say(LIMIT);
        return;
      }
      commit(plan.ranges);
      if (plan.merged > 0) say('밑줄을 하나로 이었어요');
    },
    [commit, say, value]
  );

  const removeAt = (index: number) => {
    const gone = value[index];
    commit(value.filter((_, i) => i !== index));
    if (gone) say(`“${chars.slice(gone.start, gone.end + 1).join('')}” 밑줄을 지웠어요`);
  };

  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setSelected(null);
    onChange(prev);
  };

  // ── 포인터 긋기 ─────────────────────────────────────────────
  const indexAt = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y);
    const span = el instanceof HTMLElement ? el.closest<HTMLElement>('[data-i]') : null;
    if (!span || !sentenceRef.current?.contains(span)) return null;
    const i = Number(span.dataset.i);
    return Number.isInteger(i) ? i : null;
  };

  const isAway = (x: number, y: number) => {
    const b = sentenceRef.current?.getBoundingClientRect();
    if (!b) return false;
    return x < b.left - AWAY || x > b.right + AWAY || y < b.top - AWAY || y > b.bottom + AWAY;
  };

  const showPreview = (d: Drawing) => {
    const raw = { start: Math.min(d.start, d.cur), end: Math.max(d.start, d.cur) };
    const trimmed = d.moved ? trimRange(chars, raw) : wordAt(chars, d.start);
    if (!trimmed) return setPreview(null);
    const plan = planStroke(value, trimmed);
    setPreview({
      range: plan.ok && !d.away ? plan.ranges.find((r) => inRange(trimmed.start, r))! : trimmed,
      away: d.away,
    });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLParagraphElement>) => {
    if (drawing.current || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const i = indexAt(e.clientX, e.clientY);
    if (i === null) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drawing.current = { pointerId: e.pointerId, start: i, cur: i, moved: false, away: false };
    setKbAnchor(null);
    if (selected !== null) setSelected(null);
    showPreview(drawing.current);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLParagraphElement>) => {
    const d = drawing.current;
    if (!d || e.pointerId !== d.pointerId) return;
    d.away = isAway(e.clientX, e.clientY);
    const i = indexAt(e.clientX, e.clientY);
    if (i !== null && i !== d.cur) {
      d.cur = i;
      d.moved = true;
    }
    showPreview(d);
  };

  const finish = (e: React.PointerEvent<HTMLParagraphElement>) => {
    const d = drawing.current;
    if (!d || e.pointerId !== d.pointerId) return;
    drawing.current = null;
    setPreview(null);
    if (d.away) {
      say('긋기를 취소했어요');
      return;
    }
    if (!d.moved) {
      const hit = value.findIndex((r) => inRange(d.start, r));
      if (hit >= 0) {
        setSelected(hit);
        return;
      }
      addStroke(wordAt(chars, d.start));
      return;
    }
    addStroke(trimRange(chars, { start: Math.min(d.start, d.cur), end: Math.max(d.start, d.cur) }));
  };

  const cancelPointer = (e: React.PointerEvent<HTMLParagraphElement>) => {
    if (drawing.current?.pointerId === e.pointerId) {
      drawing.current = null;
      setPreview(null);
    }
  };

  // 긋는 도중 Esc, 고른 밑줄이 있을 때 Esc·바깥 누름은 취소
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (drawing.current) {
        drawing.current = null;
        setPreview(null);
        say('긋기를 취소했어요');
      }
      setSelected(null);
    };
    const onDown = (e: PointerEvent) => {
      if (selected !== null && rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setSelected(null);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [say, selected]);

  // ── 키보드 ─────────────────────────────────────────────────
  const onKeyDown = (e: React.KeyboardEvent<HTMLParagraphElement>) => {
    const last = chars.length - 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = Math.min(last, Math.max(0, caret + (e.key === 'ArrowRight' ? 1 : -1)));
      if (e.shiftKey) setKbAnchor((a) => (a === null ? caret : a));
      else setKbAnchor(null);
      setCaret(next);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const stroke =
        kbAnchor === null
          ? wordAt(chars, caret)
          : trimRange(chars, { start: Math.min(kbAnchor, caret), end: Math.max(kbAnchor, caret) });
      setKbAnchor(null);
      addStroke(stroke);
      return;
    }
    if (e.key === 'Escape') {
      e.stopPropagation();
      setKbAnchor(null);
      setSelected(null);
    }
  };
  const kbRange =
    kbAnchor === null ? null : { start: Math.min(kbAnchor, caret), end: Math.max(kbAnchor, caret) };

  const underlineOf = (i: number) =>
    value.findIndex((r) => (chars[i] === ' ' ? i > r.start && i < r.end : inRange(i, r)));

  const guide = preview?.away ? GUIDE_AWAY : selected !== null ? GUIDE_SELECTED : GUIDE;
  const selectedRange = selected !== null ? value[selected] : null;

  return (
    <div ref={rootRef}>
      <p className="font-sans text-caption text-ink-sub" aria-live="polite">
        {guide}
      </p>

      <div className="relative mt-4">
        <p
          ref={sentenceRef}
          data-testid="underline-sentence"
          tabIndex={0}
          aria-label={`밑줄을 그을 문장: ${quote}. 왼쪽·오른쪽 화살표로 글자를 옮기고, Shift와 함께 넓힌 뒤 Enter로 그어요`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finish}
          onPointerCancel={cancelPointer}
          onKeyDown={onKeyDown}
          className={clsx(
            'group touch-none select-none break-keep font-serif text-quote leading-[2] text-ink',
            '[-webkit-touch-callout:none] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-paper',
            'cursor-text'
          )}
        >
          {chars.map((c, i) => {
            const u = underlineOf(i);
            const inPreview = preview && inRange(i, preview.range) && c !== ' ';
            return (
              <span
                key={i}
                data-i={i}
                aria-hidden
                className={clsx(
                  'transition-colors duration-100',
                  u >= 0 && 'underline decoration-accent decoration-[2.5px] underline-offset-[7px]',
                  u >= 0 && u === selected && 'bg-accent/15',
                  inPreview && !preview.away && 'bg-accent/15',
                  inPreview &&
                    preview.away &&
                    'underline decoration-ink-faint decoration-dashed decoration-[1.5px] underline-offset-[7px]',
                  kbRange && inRange(i, kbRange) && 'bg-accent/15',
                  kbAnchor === null &&
                    i === caret &&
                    'group-focus-visible:shadow-[inset_2px_0_0_rgb(var(--accent))]'
                )}
              >
                {c}
              </span>
            );
          })}
        </p>

        {selectedRange && (
          <div
            role="group"
            aria-label="고른 밑줄"
            className="mt-3 inline-flex overflow-hidden rounded-full bg-ink font-sans text-button-sm text-ink-invert"
          >
            <button
              type="button"
              className="min-h-10 px-4 active:scale-[0.97]"
              onClick={() => selected !== null && removeAt(selected)}
            >
              밑줄 지우기
            </button>
            <button
              type="button"
              className="min-h-10 border-l border-ink-invert/25 px-4 text-ink-invert/80 active:scale-[0.97]"
              onClick={() => setSelected(null)}
            >
              취소
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center gap-1.5 font-sans text-caption text-ink-sub">
        {Array.from({ length: MAX_UNDERLINES }, (_, i) => (
          <i
            key={i}
            aria-hidden
            className={clsx(
              'h-[3px] w-[22px] rounded-full transition-colors duration-150',
              i < value.length ? 'bg-accent' : 'bg-hairline-strong'
            )}
          />
        ))}
        <span className="ml-1">{`밑줄 ${value.length}/${MAX_UNDERLINES}`}</span>
        <button
          type="button"
          onClick={undo}
          disabled={history.length === 0}
          className="ml-auto min-h-10 px-1 font-semibold text-accent disabled:text-ink-faint"
        >
          되돌리기
        </button>
      </div>

      <p role="status" className="mt-1 min-h-5 font-sans text-fine text-ink-sub">
        {hint}
      </p>

      {value.length > 0 && (
        <ol className="mt-2">
          {value.map((r, i) => {
            const text = chars.slice(r.start, r.end + 1).join('');
            return (
              <li
                key={`${r.start}-${r.end}`}
                className="flex items-center gap-3 border-t border-hairline-strong py-2.5"
              >
                <span className="w-4 font-sans text-fine font-bold text-accent">{i + 1}</span>
                <span className="font-serif text-body text-ink">{text}</span>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label={`“${text}” 지우기`}
                  className="ml-auto min-h-10 px-2 font-sans text-caption text-ink-sub hover:text-ink"
                >
                  지우기
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
