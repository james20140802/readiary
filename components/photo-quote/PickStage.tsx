'use client';

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  DOUBLE_ZOOM,
  HOLD_MS,
  LOUPE_SCALE,
  SLOP,
  baseSize,
  clampView,
  insideWord,
  orderRange,
  toImagePoint,
  wordAt,
  zoomAt,
} from '@/lib/photo-quote/select';
import type { PhotoWord, Size, View } from '@/lib/photo-quote/types';
import s from './photoQuote.module.css';

export interface PickStageHandle {
  zoomBy(factor: number): void;
  fit(): void;
  panBy(dx: number, dy: number): void;
}

export interface PickStageProps {
  src: string;
  /** 사진의 픽셀 크기 — 낱말 상자의 좌표계 */
  image: Size;
  words: PhotoWord[];
  /** 고른 구간 [처음 잡은 낱말, 지금 닿은 낱말]. 끄는 중에는 뒤집혀 있을 수 있다 */
  range: [number, number] | null;
  onRange(range: [number, number] | null): void;
  ref?: React.Ref<PickStageHandle>;
  className?: string;
}

type Mode = 'idle' | 'pending' | 'pan' | 'pinch' | 'select' | 'knob';
type Point = { x: number; y: number };

const LOUPE_W = 168;
const LOUPE_H = 76;
/** 두 번 두드리기로 치는 간격(ms) */
const DOUBLE_TAP_MS = 320;
const KEY_PAN = 48;
const KEY_ZOOM = 1.5;

/**
 * 사진을 키우고 옮기며 낱말 구간을 고르는 판. 조작은 실험(docs/design/photo-quote-2026-11/pick-spike.html)에서
 * 사용자가 실기기로 확정한 것을 옮겼다.
 *
 * 손가락: 한 손가락으로 끌면 옮기고, 낱말을 0.32초 누른 채 끌면 고른다. 두 손가락으로 키운다.
 * 마우스: 낱말 위에서 누른 채 끌면 바로 고르고, 빈 곳을 끌면 옮긴다. 휠은 옮기기, Ctrl/⌘+휠은 키우기.
 * 손가락인지 마우스인지는 화면 폭이 아니라 그 조작의 pointerType으로 가른다.
 */
export default function PickStage({
  src,
  image,
  words,
  range,
  onRange,
  ref,
  className,
}: PickStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const loupeRef = useRef<HTMLDivElement>(null);
  const loupeInnerRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Size>({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ x: 0, y: 0, z: 1 });
  const base = baseSize(stage, image);

  // 포인터 처리기는 한 번만 붙이므로, 늘 최신 값을 읽도록 ref에 비춘다
  const live = useRef({ view, stage, base, image, words, range, onRange });
  useLayoutEffect(() => {
    live.current = { view, stage, base, image, words, range, onRange };
  });

  const commit = useCallback((next: View) => {
    const { stage: st, base: b } = live.current;
    const clamped = clampView(next, st, b);
    live.current.view = clamped;
    setView(clamped);
  }, []);

  // 판의 크기를 재고, 바뀌면 사진을 다시 맞춘다
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setStage((prev) =>
        prev.w === r.width && prev.h === r.height ? prev : { w: r.width, h: r.height }
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const st = stage;
    const b = baseSize(st, image);
    live.current.stage = st;
    live.current.base = b;
    setView((v) => {
      const clamped = clampView(v, st, b);
      live.current.view = clamped;
      return clamped;
    });
  }, [stage, image]);

  // 다른 사진으로 바뀌면 처음 크기로
  useLayoutEffect(() => {
    commit({ x: 0, y: 0, z: 1 });
  }, [src, commit]);

  useImperativeHandle(
    ref,
    () => ({
      zoomBy(factor) {
        const { view: v, stage: st, base: b } = live.current;
        commit(zoomAt(v, st.w / 2, st.h / 2, v.z * factor, st, b));
      },
      fit() {
        commit({ x: 0, y: 0, z: 1 });
      },
      panBy(dx, dy) {
        const v = live.current.view;
        commit({ ...v, x: v.x + dx, y: v.y + dy });
      },
    }),
    [commit]
  );

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const points = new Map<number, Point>();
    let mode: Mode = 'idle';
    let sel: [number, number] | null = null;
    let knobEnd: 0 | 1 = 1;
    let start: Point = { x: 0, y: 0 };
    let last: Point | null = null;
    let touchLike = false;
    let pinch: { d: number; z: number; mx: number; my: number } | null = null;
    let lastTap = 0;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    let edgeTimer: ReturnType<typeof setInterval> | undefined;

    /** 화면 좌표 → 판 좌표 */
    const local = (p: Point): Point => {
      const r = el.getBoundingClientRect();
      return { x: p.x - r.left, y: p.y - r.top };
    };
    const imagePoint = (p: Point) => {
      const { view: v, base: b, image: img } = live.current;
      const l = local(p);
      return toImagePoint(v, l.x, l.y, b, img);
    };
    const wordUnder = (p: Point) => {
      const q = imagePoint(p);
      return wordAt(live.current.words, q.x, q.y);
    };
    /** 마우스가 낱말 위(조금의 여유 포함)에 있는지 */
    const onWord = (p: Point): number => {
      const { words: ws, view: v, base: b, image: img } = live.current;
      const q = imagePoint(p);
      const i = wordAt(ws, q.x, q.y);
      if (i < 0) return -1;
      const pad = b.w > 0 ? (4 * img.w) / (b.w * v.z) : 0;
      const [x0, y0, x1, y1] = ws[i].box;
      return insideWord({ ...ws[i], box: [x0 - pad, y0 - pad, x1 + pad, y1 + pad] }, q.x, q.y)
        ? i
        : -1;
    };
    const emit = () => live.current.onRange(sel ? [sel[0], sel[1]] : null);

    const hideLoupe = () => {
      if (loupeRef.current) loupeRef.current.hidden = true;
    };
    const showLoupe = (p: Point) => {
      const loupe = loupeRef.current;
      const inner = loupeInnerRef.current;
      if (!touchLike || !loupe || !inner) return;
      const { view: v, base: b, image: img } = live.current;
      if (b.w <= 0) return;
      // 지금 보이는 크기의 1.6배. 글자가 너무 작게 보이지 않도록 사진 원본의 0.9배 이상으로 키운다
      const scale = Math.max(((b.w * v.z) / img.w) * LOUPE_SCALE, 0.9);
      const q = imagePoint(p);
      inner.style.transform = `translate(${LOUPE_W / 2 - q.x * scale}px, ${LOUPE_H / 2 - q.y * scale}px) scale(${scale})`;
      const left = Math.min(window.innerWidth - LOUPE_W - 4, Math.max(4, p.x - LOUPE_W / 2));
      // 위에 자리가 없으면 손가락 아래에 둔다
      const top = p.y - LOUPE_H - 34 >= 4 ? p.y - LOUPE_H - 34 : p.y + 44;
      loupe.style.transform = `translate(${left}px, ${top}px)`;
      loupe.hidden = false;
    };

    const extend = (p: Point) => {
      const i = wordUnder(p);
      if (i < 0 || !sel) return;
      const index = mode === 'select' ? 1 : knobEnd;
      if (sel[index] === i) return;
      sel[index] = i;
      emit();
    };

    /** 고르는 중 손가락이 가장자리에 닿으면 사진을 조금씩 밀어 준다 */
    const startEdgeScroll = () => {
      clearInterval(edgeTimer);
      edgeTimer = setInterval(() => {
        if ((mode !== 'select' && mode !== 'knob') || !last) return;
        const r = el.getBoundingClientRect();
        const dy = last.y < r.top + 36 ? 6 : last.y > r.bottom - 36 ? -6 : 0;
        const dx = last.x < r.left + 24 ? 6 : last.x > r.right - 24 ? -6 : 0;
        if (!dx && !dy) return;
        const before = live.current.view;
        commit({ ...before, x: before.x + dx, y: before.y + dy });
        const after = live.current.view;
        if (before.x === after.x && before.y === after.y) return;
        extend(last);
        showLoupe(last);
      }, 16);
    };

    const finish = () => {
      clearInterval(edgeTimer);
      hideLoupe();
      if (!sel) return;
      sel = orderRange(sel[0], sel[1]);
      emit();
    };

    const beginSelect = (i: number, p: Point) => {
      mode = 'select';
      sel = [i, i];
      emit();
      startEdgeScroll();
      showLoupe(p);
    };

    const toggleZoom = (p: Point) => {
      const { view: v, stage: st, base: b } = live.current;
      const l = local(p);
      commit(zoomAt(v, l.x, l.y, v.z > 1.2 ? 1 : DOUBLE_ZOOM, st, b));
    };

    const down = (ev: PointerEvent) => {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      try {
        el.setPointerCapture(ev.pointerId);
      } catch {
        // 포인터 잡기를 지원하지 않아도 판 안에서는 동작한다
      }
      const p = { x: ev.clientX, y: ev.clientY };
      points.set(ev.pointerId, p);
      clearTimeout(holdTimer);

      if (points.size === 2) {
        const [a, b] = [...points.values()];
        if (mode === 'select' || mode === 'knob') finish();
        pinch = {
          d: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          z: live.current.view.z,
          mx: (a.x + b.x) / 2,
          my: (a.y + b.y) / 2,
        };
        mode = 'pinch';
        return;
      }
      if (points.size > 2) return;

      start = last = p;
      touchLike = ev.pointerType !== 'mouse';
      const knob = (ev.target as Element | null)?.getAttribute?.('data-knob');
      const current = live.current.range;
      if (knob && current) {
        sel = orderRange(current[0], current[1]);
        knobEnd = knob === 'start' ? 0 : 1;
        mode = 'knob';
        startEdgeScroll();
        showLoupe(p);
        return;
      }

      if (!touchLike) {
        // 마우스는 가리는 것이 없으니 길게 누르지 않고 글 선택처럼 바로 고른다
        const i = onWord(p);
        if (i >= 0) {
          beginSelect(i, p);
          return;
        }
      }

      mode = 'pending';
      if (!touchLike) return;
      holdTimer = setTimeout(() => {
        if (mode !== 'pending') return;
        const i = wordUnder(start);
        if (i < 0) return;
        navigator.vibrate?.(8);
        beginSelect(i, start);
      }, HOLD_MS);
    };

    const move = (ev: PointerEvent) => {
      const prev = points.get(ev.pointerId);
      if (!prev) return;
      const p = { x: ev.clientX, y: ev.clientY };
      points.set(ev.pointerId, p);

      if (mode === 'pinch' && points.size >= 2 && pinch) {
        const [a, b] = [...points.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const { view: v, stage: st, base: bs } = live.current;
        const moved = { ...v, x: v.x + mx - pinch.mx, y: v.y + my - pinch.my };
        pinch.mx = mx;
        pinch.my = my;
        const l = local({ x: mx, y: my });
        commit(zoomAt(moved, l.x, l.y, (pinch.z * d) / pinch.d, st, bs));
        return;
      }

      last = p;
      if (mode === 'pending' && Math.hypot(p.x - start.x, p.y - start.y) > SLOP) {
        clearTimeout(holdTimer);
        mode = 'pan';
      }
      if (mode === 'pan') {
        const v = live.current.view;
        commit({ ...v, x: v.x + p.x - prev.x, y: v.y + p.y - prev.y });
      }
      if (mode === 'select' || mode === 'knob') {
        extend(p);
        showLoupe(p);
      }
    };

    const up = (ev: PointerEvent) => {
      if (!points.has(ev.pointerId)) return;
      points.delete(ev.pointerId);
      clearTimeout(holdTimer);
      const p = { x: ev.clientX, y: ev.clientY };
      const still = Math.hypot(p.x - start.x, p.y - start.y) <= SLOP;
      const tapped =
        ev.type === 'pointerup' &&
        still &&
        (mode === 'pending' || (mode === 'select' && !touchLike));

      if (mode === 'select' || mode === 'knob') finish();
      if (tapped) {
        // 짧게 두 번 두드리면(더블클릭) 그 자리를 키우거나 원래대로 돌린다
        const now = performance.now();
        if (now - lastTap < DOUBLE_TAP_MS) {
          toggleZoom(p);
          lastTap = 0;
        } else lastTap = now;
      }
      if (points.size === 1 && mode === 'pinch') {
        mode = 'pan';
        return;
      }
      if (points.size === 0) mode = 'idle';
    };

    const wheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const { view: v, stage: st, base: b } = live.current;
      if (ev.ctrlKey || ev.metaKey) {
        // 트랙패드 벌리기도 ctrl+휠로 온다. 마우스 휠 한 칸이 너무 크게 뛰지 않게 누른다
        const delta = Math.max(-30, Math.min(30, ev.deltaY));
        const l = local({ x: ev.clientX, y: ev.clientY });
        commit(zoomAt(v, l.x, l.y, v.z * Math.exp(-delta * 0.01), st, b));
      } else {
        commit({ ...v, x: v.x - ev.deltaX, y: v.y - ev.deltaY });
      }
    };

    const block = (ev: Event) => ev.preventDefault();

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    // React의 터치 처리기는 passive라 기본 동작을 막지 못한다 — 직접 붙인다
    el.addEventListener('touchstart', block, { passive: false });
    el.addEventListener('touchmove', block, { passive: false });
    for (const type of ['selectstart', 'contextmenu', 'dragstart'])
      el.addEventListener(type, block);

    return () => {
      clearTimeout(holdTimer);
      clearInterval(edgeTimer);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('touchstart', block);
      el.removeEventListener('touchmove', block);
      for (const type of ['selectstart', 'contextmenu', 'dragstart'])
        el.removeEventListener(type, block);
    };
  }, [commit]);

  const onKeyDown = (ev: React.KeyboardEvent) => {
    const { view: v, stage: st, base: b } = live.current;
    const center = (factor: number) => commit(zoomAt(v, st.w / 2, st.h / 2, v.z * factor, st, b));
    const pan = (dx: number, dy: number) => commit({ ...v, x: v.x + dx, y: v.y + dy });
    switch (ev.key) {
      case '+':
      case '=':
        center(KEY_ZOOM);
        break;
      case '-':
      case '_':
        center(1 / KEY_ZOOM);
        break;
      case '0':
        commit({ x: 0, y: 0, z: 1 });
        break;
      case 'ArrowLeft':
        pan(KEY_PAN, 0);
        break;
      case 'ArrowRight':
        pan(-KEY_PAN, 0);
        break;
      case 'ArrowUp':
        pan(0, KEY_PAN);
        break;
      case 'ArrowDown':
        pan(0, -KEY_PAN);
        break;
      default:
        return;
    }
    ev.preventDefault();
  };

  const ordered = range && words.length ? orderRange(range[0], range[1]) : null;
  const picked = ordered
    ? words.slice(Math.max(0, ordered[0]), ordered[1] + 1).map((w, i) => {
        const [x0, y0, x1, y1] = w.box;
        return <rect key={i} className={s.picked} x={x0} y={y0} width={x1 - x0} height={y1 - y0} />;
      })
    : null;
  // 화면 1px이 사진 몇 px인가 — 손잡이를 화면에서 늘 같은 크기로 그린다
  const k = base.w > 0 ? image.w / (base.w * view.z) : 1;
  const first = ordered ? words[ordered[0]] : undefined;
  const lastWord = ordered ? words[ordered[1]] : undefined;
  const knob = (x: number, top: number, bottom: number, which: 'start' | 'end') => (
    <g key={which}>
      <line className={s.stem} x1={x} y1={top} x2={x} y2={bottom + 6 * k} />
      <circle className={s.knob} cx={x} cy={bottom + 12 * k} r={7 * k} />
      <circle className={s.hit} data-knob={which} cx={x} cy={bottom + 12 * k} r={24 * k} />
    </g>
  );
  const viewBox = `0 0 ${image.w} ${image.h}`;

  return (
    <div
      ref={stageRef}
      role="application"
      aria-label="사진에서 문장 고르기"
      aria-roledescription="사진"
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={`${s.stage} ${className ?? ''}`}
    >
      <div
        data-pick-inner
        className={s.inner}
        style={{
          width: base.w,
          height: base.h,
          transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.z})`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 기기 안에서 만든 blob 주소라 최적화 대상이 아니다 */}
        <img src={src} alt="" draggable={false} />
        <svg className={s.overlay} viewBox={viewBox} preserveAspectRatio="none" aria-hidden>
          {picked}
          {first && lastWord && (
            <>
              {knob(first.box[0], first.box[1], first.box[3], 'start')}
              {knob(lastWord.box[2], lastWord.box[1], lastWord.box[3], 'end')}
            </>
          )}
        </svg>
      </div>
      <div ref={loupeRef} className={s.loupe} hidden aria-hidden>
        <div
          ref={loupeInnerRef}
          className={s.loupeInner}
          style={{ width: image.w, height: image.h }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 위와 같다 */}
          <img src={src} alt="" draggable={false} />
          <svg className={s.overlay} viewBox={viewBox} preserveAspectRatio="none">
            {picked}
          </svg>
        </div>
      </div>
    </div>
  );
}
