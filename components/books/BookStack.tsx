'use client';

import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import styles from './books.module.css';
import { spineColor } from './shelfStyle';
import { FLAG_HIDDEN, layoutFlags, type BookFlag, type FlagLayout } from './flags';
import { shortDate } from './bookFormat';

export interface FlagEntry {
  id: string;
  date: string | null;
  createdAt?: string | null;
  fromPage: number | null;
  toPage: number | null;
  quote: string | null;
  note: string | null;
  href: string;
}

interface Props {
  title: string;
  author: string | null;
  coverUrl: string | null | undefined;
  /** 간지 맨 위 작은 글 — '읽는 중 · 기록 14장' */
  kicker: string;
  /** 잉크 분수 [읽은 쪽, 전체] — 전체를 모르면 null */
  frac: [number, number | null] | null;
  /** 간지 아래쪽의 문장(가장 최근 기록) */
  quote: string | null;
  metaStart: string | null;
  metaEnd: string | null;
  flags: BookFlag<FlagEntry>[];
  /** 큰 제목을 h1로 — 한 화면에 둘(모바일·데스크톱)이 있으면 하나만 h1 */
  headingLevel?: 1 | 2;
}

/** 간지를 왼쪽으로 밀 수 있는 한계(px) — 시안 room() */
const roomFor = (velWidth: number) => -Math.min(110, velWidth * 0.42);

/**
 * 표지 위 간지 — 시안 book-layer.html `.bstack`. 실제 표지 위에 기록 간지가 반쯤 얹히고,
 * 표지 오른쪽 옆면에서 기록한 쪽마다 플래그가 나온다. 간지를 왼쪽으로 밀면 간지는 왼쪽으로,
 * 책(과 꽂힌 플래그)은 오른쪽으로 벌어진다. 놓으면 다시 겹친다. 키보드는 Enter·Space로 벌렸다 겹친다.
 */
export default function BookStack({
  title,
  author,
  coverUrl,
  kicker,
  frac,
  quote,
  metaStart,
  metaEnd,
  flags,
  headingLevel = 1,
}: Props) {
  const stackRef = useRef<HTMLDivElement>(null);
  const velRef = useRef<HTMLDivElement>(null);
  const [apart, setApart] = useState(false);
  const Heading = headingLevel === 1 ? 'h1' : 'h2';

  const set = useCallback((d: number) => {
    const st = stackRef.current;
    if (!st) return;
    st.style.setProperty('--vx', `${d}px`);
    st.style.setProperty('--vr', `${d * 0.08}deg`);
    st.style.setProperty('--cx', `${-d * 0.35}px`);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button > 0) return;
    const st = stackRef.current;
    const vel = velRef.current;
    if (!st || !vel) return;
    const x0 = e.clientX;
    const y0 = e.clientY;
    const lim = roomFor(vel.offsetWidth);
    let live = false;
    const move = (ev: PointerEvent) => {
      const mx = ev.clientX - x0;
      const my = ev.clientY - y0;
      if (!live) {
        if (Math.abs(my) > Math.abs(mx) && Math.abs(my) > 6) return end();
        if (Math.abs(mx) < 6) return;
        live = true;
        st.setPointerCapture?.(e.pointerId);
        st.classList.add(styles.dragging);
      }
      set(mx < 0 ? lim * (1 - Math.exp(mx / -lim)) : Math.min(12, mx * 0.2));
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      st.classList.remove(styles.dragging);
      setApart(false);
      set(0);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    const next = !apart;
    setApart(next);
    set(next ? roomFor(velRef.current?.offsetWidth ?? 0) : 0);
  };

  const [bg, fg] = spineColor(title);

  return (
    <div
      ref={stackRef}
      className={styles.bstack}
      tabIndex={0}
      role="group"
      aria-label={`${title}. 표지 위에 기록 간지가 얹혀 있어요. Enter를 누르거나 간지를 왼쪽으로 밀면 표지가 드러나요`}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    >
      <FlagRack flags={flags} stackRef={stackRef} />
      <div className={styles.bstackCover}>
        {coverUrl ? (
          <Image src={coverUrl} alt={`${title} 표지`} width={240} height={360} sizes="240px" />
        ) : (
          <div
            role="img"
            aria-label={`${title} 표지`}
            className={clsx(styles.coverPh, 'h-full w-full text-[18px]')}
            style={{ background: bg, color: fg }}
          >
            {title}
          </div>
        )}
      </div>
      <div ref={velRef} className={styles.vel}>
        <div className="font-sans text-[12px] font-semibold tracking-[0.04em] text-ink-sub">
          {kicker}
        </div>
        <Heading className="mt-[18px] font-serif text-[26px] font-bold leading-[1.3] tracking-[-0.01em] text-ink lg:text-[30px]">
          {title}
        </Heading>
        {author && (
          <div className="mt-1 font-sans text-[14px] font-medium text-ink-sub">{author}</div>
        )}
        {frac && (
          <div className={clsx(styles.frac, 'mt-4 text-[30px] text-ink lg:text-[34px]')}>
            {frac[0]} {frac[1] != null ? <span>/ {frac[1]}</span> : <span>쪽</span>}
          </div>
        )}
        {quote && (
          <p className="mt-auto line-clamp-4 border-t border-[rgb(127_127_127/.22)] pt-[18px] font-serif text-[17px] leading-[1.6] text-ink">
            {quote}
          </p>
        )}
        {(metaStart || metaEnd) && (
          <div
            className={clsx(
              'flex justify-between font-mono text-[12px] font-medium text-ink-sub',
              quote ? 'mt-3' : 'mt-auto pt-[18px]'
            )}
          >
            <span>{metaStart}</span>
            <span>{metaEnd}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 플래그 ── */

function FlagRack({
  flags,
  stackRef,
}: {
  flags: BookFlag<FlagEntry>[];
  stackRef: React.RefObject<HTMLDivElement | null>;
}) {
  const rackRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [open, setOpen] = useState<{
    id: string;
    left: number;
    top: number;
    ox: number;
  } | null>(null);
  const popId = useId();
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const popRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = rackRef.current;
    if (!el) return;
    const measure = () => setHeight(el.offsetHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout: FlagLayout[] = layoutFlags(flags, height);
  const byId = new Map(flags.map((f) => [f.id, f]));

  const close = useCallback((refocus: boolean) => {
    setOpen((cur) => {
      if (cur && refocus) buttons.current.get(cur.id)?.focus();
      return null;
    });
  }, []);

  // 바깥을 누르거나 Esc로 닫는다
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t)) return;
      if ([...buttons.current.values()].some((b) => b.contains(t))) return;
      close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(true);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  // 열리면 펼치기 링크로 초점을 옮긴다 — 키보드로 바로 이어 갈 수 있게
  useEffect(() => {
    if (open) popRef.current?.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });
  }, [open]);

  const toggle = (id: string) => {
    if (open?.id === id) return close(false);
    const st = stackRef.current;
    const b = buttons.current.get(id);
    if (!st || !b) return;
    const sr = st.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    const pw = Math.min(280, window.innerWidth - 48);
    const cx = br.right - sr.left - 6;
    const left = Math.max(-4, Math.min(cx - pw + 14, window.innerWidth - sr.left - pw - 12));
    setOpen({ id, left, top: br.bottom - sr.top + 8, ox: cx - left });
  };

  const current = open ? byId.get(open.id) : null;

  return (
    <>
      <div
        ref={rackRef}
        className={styles.flagRack}
        role="group"
        aria-label={flags.length ? `기록을 남긴 쪽마다 꽂힌 플래그 ${flags.length}개` : undefined}
      >
        {layout.map((l) => {
          const f = byId.get(l.id)!;
          const kind = f.source.quote ? '문장' : '생각';
          return (
            <span key={l.id} className={styles[`c-${f.color}`]}>
              <button
                type="button"
                ref={(el) => {
                  if (el) buttons.current.set(l.id, el);
                  else buttons.current.delete(l.id);
                }}
                aria-label={`${f.page}쪽, ${shortDate(f.day)}의 ${kind}`}
                aria-expanded={open?.id === l.id}
                aria-controls={open?.id === l.id ? popId : undefined}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(l.id);
                }}
                className={styles.flagHit}
                style={{
                  marginLeft: l.hit.x0,
                  width: l.hit.x1 - l.hit.x0,
                  top: l.hit.y0,
                  height: l.hit.y1 - l.hit.y0,
                  zIndex: l.z + 3,
                }}
              />
              <span
                aria-hidden
                className={styles.flag}
                style={{ top: l.y, width: l.len + FLAG_HIDDEN, zIndex: l.z }}
              />
            </span>
          );
        })}
      </div>
      {open && current && (
        <div
          ref={popRef}
          id={popId}
          role="dialog"
          aria-label={`${current.page}쪽 기록`}
          className={clsx('vellum', styles.fpop, styles[`c-${current.color}`])}
          style={
            {
              left: open.left,
              top: open.top,
              '--ox': `${open.ox}px`,
            } as React.CSSProperties
          }
          onPointerDown={(e) => e.stopPropagation()}
        >
          <p
            className={clsx(
              'line-clamp-6 font-serif text-[17px] leading-[1.55]',
              current.source.quote ? 'text-ink' : 'text-ink-sub'
            )}
          >
            {current.source.quote ?? current.source.note}
          </p>
          <div className="mt-2 flex items-center justify-between font-mono text-[12px] font-medium text-ink-sub">
            <span>
              <i aria-hidden className={styles.swatch} />
              p.{current.page} · {shortDate(current.day)}
            </span>
            <Link
              href={current.source.href}
              className="inline-flex min-h-8 items-center font-sans text-[14px] font-semibold text-accent"
            >
              펼치기
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
