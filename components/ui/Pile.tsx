'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  REDUCED_MS,
  FLIP_MS,
  FLIP_TURN,
  SETTLE_MS,
  awayIndexForBack,
  classifyDrag,
  dragLimit,
  dragOffset,
  flipKeyframes,
  flipOutX,
  pileMarginBottom,
  placeSlips,
  randomJitter,
  randomTilt,
  shouldFlip,
  slipTransform,
} from '@/lib/pile/geometry';
import type { Placement, Pose } from '@/lib/pile/geometry';

export interface PileHeaderProps {
  position: string;
  next: () => void;
  canNext: boolean;
  nextLabel: string;
}

interface PileProps<T> {
  /** items[0]이 처음 맨 위 */
  items: T[];
  getKey: (item: T) => string;
  renderSlip: (item: T, state: { isTop: boolean }) => ReactNode;
  /** 묶음 그룹의 aria-label */
  label: string;
  nextLabel?: string;
  /** 위치 표시 앞에 붙는 이름(예: '10월') */
  getName?: (item: T) => string;
  renderHeader?: (h: PileHeaderProps) => ReactNode;
  /** 간지가 묶음 폭보다 좁은 만큼(px) — 비켜 쌓인 장이 들어갈 자리. 시안: 기록 30, 토론 40, 발췌집 50, 기본 52 */
  slipInset?: number;
  className?: string;
}

// 서버와 첫 렌더는 무작위 없이 같은 값을 쓴다(하이드레이션 불일치 방지).
// 위에서부터 ±2도로 번갈아 기울이고, 마운트 뒤 useEffect에서 무작위 자세로 바꾼다.
const initialPose = (fromTop: number): Pose => ({ t: fromTop % 2 === 0 ? 2 : -2, jx: 0, jy: 0 });

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Pile<T>({
  items,
  getKey,
  renderSlip,
  label,
  nextLabel = '다음',
  getName,
  renderHeader,
  slipInset = 52,
  className,
}: PileProps<T>) {
  const keys = items.map(getKey);

  // order: 아래→위 키. DOM 순서는 items 순서로 고정하고 쌓임은 z-index로만 표현한다.
  const [order, setOrder] = useState<string[]>(() => [...keys].reverse());
  const [poses, setPoses] = useState<Record<string, Pose>>(() => {
    const rec: Record<string, Pose> = {};
    keys.forEach((k, i) => {
      rec[k] = initialPose(i);
    });
    return rec;
  });

  // items가 바뀌면 사라진 키는 빼고 새 키는 맨 아래에 넣는다.
  // order는 아래→위라 새 키도 뒤집어 넣는다 — 나중에 받은 items도 앞의 것이 위에 온다.
  const effOrder = (() => {
    const set = new Set(keys);
    const kept = order.filter((k) => set.has(k));
    const have = new Set(kept);
    const added = keys.filter((k) => !have.has(k)).reverse();
    return added.length || kept.length !== order.length ? [...added, ...kept] : order;
  })();
  const n = effOrder.length;
  const poseOf = (k: string): Pose => poses[k] ?? initialPose(0);
  const placements = placeSlips(effOrder.map(poseOf));
  const placementByKey = new Map<string, Placement>();
  effOrder.forEach((k, i) => placementByKey.set(k, placements[i]));

  const els = useRef(new Map<string, HTMLElement>());
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anim = useRef<Animation | null>(null);
  const fadeKey = useRef<string | null>(null);
  const cleanupDrag = useRef<(() => void) | null>(null);
  const latest = useRef({ effOrder, poses, placementByKey });
  // 이벤트 핸들러가 항상 최신 값을 읽도록 커밋 뒤에 갱신한다.
  useLayoutEffect(() => {
    latest.current = { effOrder, poses, placementByKey };
  });

  // 마운트 뒤 무작위 자세로 바꾼다: 위에서부터 바로 위 장과 반대로 기울게.
  useEffect(() => {
    const rec: Record<string, Pose> = {};
    let prev = 0;
    for (let i = 0; i < keys.length; i++) {
      const t = randomTilt(prev, Math.random);
      rec[keys[i]] = { t, jx: randomJitter(Math.random), jy: randomJitter(Math.random) };
      prev = t;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR 일치를 위해 무작위는 마운트 뒤에만
    setPoses(rec);
    // 마운트 때만 한 번
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 동작 줄이기: 새 맨 위 장이 살짝 떠오른다.
  useLayoutEffect(() => {
    const k = fadeKey.current;
    if (!k) return;
    fadeKey.current = null;
    els.current
      .get(k)
      ?.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: REDUCED_MS, easing: 'ease' });
  }, [order]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      anim.current?.cancel();
      cleanupDrag.current?.();
    },
    []
  );

  const next = useCallback(() => {
    const { effOrder: ord, poses: ps, placementByKey: pbk } = latest.current;
    const count = ord.length;
    if (count < 2 || busy.current) return;
    const topKey = ord[count - 1];
    const away = ps[ord[awayIndexForBack(count)]]?.t ?? 0;
    const newPose: Pose = {
      t: randomTilt(away, Math.random),
      jx: randomJitter(Math.random),
      jy: randomJitter(Math.random),
    };
    const newOrder = [topKey, ...ord.slice(0, -1)];
    const newPoses = { ...ps, [topKey]: newPose };

    if (prefersReducedMotion()) {
      fadeKey.current = newOrder[newOrder.length - 1];
      setPoses(newPoses);
      setOrder(newOrder);
      return;
    }

    const el = els.current.get(topKey);
    const below = els.current.get(ord[count - 2]);
    const from = pbk.get(topKey);
    if (!el || !below || !from) {
      setPoses(newPoses);
      setOrder(newOrder);
      return;
    }
    busy.current = true;
    const to = placeSlips(newOrder.map((k) => newPoses[k] ?? initialPose(0)))[0];
    // 끌다 놓았다면 끌린 자리에서 이어서 시작한다(끌린 transform은 측정 전에 읽어 둔다).
    const dragged = el.hasAttribute('data-drag') ? getComputedStyle(el).transform : '';
    el.removeAttribute('data-drag');
    el.style.transition = 'none';
    // 끌린 만큼 어긋나지 않게, 제자리 transform으로 되돌린 뒤 제자리 왼쪽을 잰다.
    el.style.transform = slipTransform(from);
    const slotLeft = el.getBoundingClientRect().left - from.x;
    const ox = flipOutX(slotLeft, below.getBoundingClientRect().right, window.innerWidth);
    const keyframes = flipKeyframes(from, ox, to);
    if (dragged && dragged !== 'none') keyframes[0].transform = dragged;
    const a = el.animate(keyframes, { duration: FLIP_MS });
    anim.current = a;
    const rest = ord.filter((k) => k !== topKey).map((k) => els.current.get(k));
    timer.current = setTimeout(() => {
      timer.current = null;
      rest.forEach((r) => {
        if (r) r.style.transitionDuration = `${SETTLE_MS}ms`;
      });
      setPoses(newPoses);
      setOrder(newOrder);
    }, FLIP_MS * FLIP_TURN);
    const settle = () => {
      el.style.transition = '';
      rest.forEach((r) => {
        if (r) r.style.transitionDuration = '';
      });
      anim.current = null;
      busy.current = false;
    };
    a.onfinish = settle;
    // 도중에 취소(언마운트·항목 제거)돼도 busy가 남지 않게 한다.
    a.oncancel = settle;
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>, key: string) => {
    if (cleanupDrag.current) return; // 끌기가 이미 진행 중이면(두 번째 손가락 등) 새로 시작하지 않는다
    if (e.button > 0 || busy.current || latest.current.effOrder.length < 2) return;
    if (latest.current.effOrder[latest.current.effOrder.length - 1] !== key) return;
    const el = e.currentTarget;
    const x0 = e.clientX;
    const y0 = e.clientY;
    const t0 = e.timeStamp;
    const base = el.getBoundingClientRect();
    const lim = dragLimit(window.innerWidth, base.right);
    const reduce = prefersReducedMotion();
    const pointerId = e.pointerId;
    let dx = 0;
    let live = false;

    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      cleanupDrag.current = null;
    };
    const restore = () => {
      el.removeAttribute('data-drag');
      const p = latest.current.placementByKey.get(key);
      if (p) el.style.transform = slipTransform(p);
    };
    function move(ev: PointerEvent) {
      const mx = ev.clientX - x0;
      const my = ev.clientY - y0;
      if (!live) {
        const kind = classifyDrag(mx, my);
        if (kind === 'scroll') {
          stop();
          return;
        }
        if (kind === 'pending') return;
        live = true;
        try {
          el.setPointerCapture(pointerId);
        } catch {
          /* 포인터가 이미 끝났으면 무시 */
        }
        el.setAttribute('data-drag', '');
      }
      dx = dragOffset(mx, lim);
      if (!reduce) {
        const r = latest.current.placementByKey.get(key)?.r ?? 0;
        el.style.transform = `translate(${dx}px, ${-Math.abs(dx) * 0.08}px) rotate(${r + dx * 0.06}deg)`;
      }
    }
    function up(ev: PointerEvent) {
      stop();
      if (!live) return;
      // 끌고 난 뒤 pointerup 바로 뒤에 따라오는 클릭(링크 열림)은 막는다. 탭(끌지 않음)은 막지 않는다.
      const block = (c: Event) => c.preventDefault();
      el.addEventListener('click', block, { once: true, capture: true });
      setTimeout(() => el.removeEventListener('click', block, { capture: true }), 0);
      const elapsed = Math.max(1, ev.timeStamp - t0);
      if (shouldFlip(dx, lim, elapsed)) {
        if (reduce) restore();
        next();
      } else {
        restore();
      }
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    cleanupDrag.current = stop;
  };

  const topKey = effOrder[n - 1];
  const topIndex = keys.indexOf(topKey);
  const topItem = items[topIndex];
  const name = getName && topItem !== undefined ? getName(topItem) : '';
  const position = `${name ? `${name} · ` : ''}${topIndex + 1}/${n}`;
  const canNext = n >= 2;

  const header = renderHeader ? (
    // eslint-disable-next-line react-hooks/refs -- next는 ref를 이벤트 안에서만 읽는다
    renderHeader({ position, next, canNext, nextLabel })
  ) : (
    <div className="mb-2 flex items-center justify-between">
      <span className="font-mono text-fine text-ink-sub" aria-live="polite">
        {position}
      </span>
      <button
        type="button"
        className="min-h-10 text-button-sm text-accent"
        onClick={next}
        disabled={!canNext}
      >
        {nextLabel}
      </button>
    </div>
  );

  return (
    <div className={className}>
      {header}
      <div
        role="group"
        aria-label={label}
        className="grid"
        style={
          { marginBottom: pileMarginBottom(n), '--pile-inset': `${slipInset}px` } as CSSProperties
        }
      >
        {items.map((item, i) => {
          const key = keys[i];
          const p = placementByKey.get(key)!;
          return (
            <div
              key={key}
              ref={(node) => {
                if (node) els.current.set(key, node);
                else els.current.delete(key);
              }}
              className="vellum-slip pile-slip"
              style={{
                transform: slipTransform(p),
                zIndex: p.z,
                opacity: p.hidden ? 0 : undefined,
              }}
              inert={!p.top}
              aria-hidden={p.top ? undefined : true}
              onPointerDown={(e) => onPointerDown(e, key)}
            >
              {renderSlip(item, { isTop: p.top })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
