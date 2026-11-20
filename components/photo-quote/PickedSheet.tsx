'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import s from './photoQuote.module.css';

interface PickedSheetProps {
  /** 고른 글. 비어 있으면 children(안내·상태)을 보인다 */
  text: string;
  expanded: boolean;
  onExpanded(expanded: boolean): void;
  /** 글이 접힌 높이를 넘는지 알려 준다 — 버튼 줄 위의 흐림을 켜는 데 쓴다 */
  onOverflow?(overflow: boolean): void;
  children?: React.ReactNode;
}

/** 접힌 높이 — photoQuote.module.css의 .sheetSlot과 같다. 손잡이 24 + 두 줄 56 + 셋째 줄이 비치는 16 */
const COLLAPSED = 96;
/** 이보다 덜 움직이면 두드린 것으로 본다 */
const TAP_SLOP = 6;
/** 이보다 빠르게 튕기면(px/ms) 거리가 짧아도 그 방향으로 보낸다 */
const FLICK = 0.11;
/** 끝을 넘겨 끌 때 따라오는 비율 */
const FRICTION = 0.2;

type Drag = { id: number; y0: number; t0: number; from: number; moved: boolean };

/**
 * 고른 문장을 보여 주는 시트. 접혀 있을 때는 앞의 두 줄만 보이고, 끌어 올리거나 두드리면 사진 위로
 * 올라와 전부 읽을 수 있다. 끄는 동안에는 손가락을 그대로 따라가고, 놓으면 빠르기와 위치로 자리를 정한다.
 */
export default function PickedSheet({
  text,
  expanded,
  onExpanded,
  onOverflow,
  children,
}: PickedSheetProps) {
  const sheet = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  /** 펼쳤을 때 올라가는 거리 */
  const [travel, setTravel] = useState(0);

  useLayoutEffect(() => {
    const el = sheet.current;
    if (!el) return;
    const measure = () => setTravel(Math.max(0, el.offsetHeight - COLLAPSED));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  const expandable = text !== '' && travel > 0;
  const open = expandable && expanded;

  const notify = useRef(onOverflow);
  useLayoutEffect(() => {
    notify.current = onOverflow;
  });
  useLayoutEffect(() => {
    notify.current?.(expandable);
  }, [expandable]);

  const place = (y: number) => {
    if (sheet.current) sheet.current.style.transform = `translateY(${y}px)`;
  };

  useLayoutEffect(() => {
    place(open ? -travel : 0);
    if (!open && body.current) body.current.scrollTop = 0;
  }, [open, travel]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!expandable || drag.current) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    // 펼친 동안 글은 읽고 넘기는 자리다 — 손잡이로만 접는다
    if (open && !(event.target as Element).closest('[data-grip]')) return;
    drag.current = {
      id: event.pointerId,
      y0: event.clientY,
      t0: event.timeStamp,
      from: open ? -travel : 0,
      moved: false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 포인터 잡기를 지원하지 않아도 시트 안에서는 동작한다
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dy = event.clientY - d.y0;
    if (!d.moved && Math.abs(dy) < TAP_SLOP) return;
    d.moved = true;
    let y = d.from + dy;
    if (y > 0) y *= FRICTION;
    else if (y < -travel) y = -travel + (y + travel) * FRICTION;
    sheet.current?.classList.add(s.sheetDragging);
    place(y);
  };

  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    drag.current = null;
    sheet.current?.classList.remove(s.sheetDragging);
    let next = open;
    if (event.type === 'pointerup') {
      const dy = event.clientY - d.y0;
      if (!d.moved) next = !open;
      else {
        const speed = Math.abs(dy) / Math.max(1, event.timeStamp - d.t0);
        next = speed > FLICK ? dy < 0 : d.from + dy < -travel / 2;
      }
    }
    place(next ? -travel : 0);
    if (next !== open) onExpanded(next);
  };

  return (
    <div className={s.sheetSlot}>
      <div
        ref={sheet}
        data-testid="picked-sheet"
        className={`${s.sheet} ${expandable ? s.sheetDraggable : ''} ${open ? s.sheetOpen : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {expandable ? (
          <button
            type="button"
            data-grip
            aria-expanded={open}
            aria-label={open ? '고른 문장 접기' : '고른 문장 펼치기'}
            className={s.grip}
            // 손가락·마우스는 위의 포인터 처리가 맡는다. 여기는 키보드와 보조 기술의 누름만 받는다
            onClick={(event) => {
              if (event.detail === 0) onExpanded(!open);
            }}
          />
        ) : (
          <div className={s.gripSpace} />
        )}
        <div ref={body} className={s.sheetBody}>
          {text === '' ? (
            children
          ) : (
            <p className="whitespace-pre-wrap font-serif text-[17px] leading-[28px] text-ink lg:mx-auto lg:max-w-[720px]">
              {text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
