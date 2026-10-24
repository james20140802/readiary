'use client';

import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import styles from './books.module.css';
import { spineColor } from './shelfStyle';
import { FLAG_HIDDEN, clusterFlags, layoutFlags, type BookFlag } from './flags';
import { shortDate, splitTitle, titleTier } from './bookFormat';

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

/** 큰 제목 글자 크기 — 시안 26/30px에서 길이에 따라 줄인다 */
const TITLE_SIZE = {
  lg: 'text-[26px] lg:text-[30px]',
  md: 'text-[23px] lg:text-[27px]',
  sm: 'text-[20px] lg:text-[24px]',
} as const;

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
  const heading = splitTitle(title);

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
        <Heading
          className={clsx(
            'mt-[18px] font-serif font-bold leading-[1.3] tracking-[-0.01em] text-ink',
            TITLE_SIZE[titleTier(heading.main)]
          )}
        >
          <span className="line-clamp-3">{heading.main}</span>
          {heading.sub && (
            <span className="mt-1 line-clamp-2 font-serif text-[16px] font-semibold leading-[1.45] text-ink-sub lg:text-[18px]">
              {heading.sub}
            </span>
          )}
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

  const layout = layoutFlags(flags, height);
  const clusters = clusterFlags(layout);
  const byId = new Map(flags.map((f) => [f.id, f]));
  const layoutById = new Map(layout.map((l) => [l.id, l]));
  // 묶음의 키는 맨 앞 플래그의 id
  const clusterByKey = new Map(clusters.map((c) => [c.ids[0], c]));

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

  const currentGroup = open
    ? (clusterByKey.get(open.id)?.ids.map((id) => byId.get(id)!) ?? null)
    : null;

  return (
    <>
      <div
        ref={rackRef}
        className={styles.flagRack}
        role="group"
        aria-label={flags.length ? `기록을 남긴 쪽마다 꽂힌 플래그 ${flags.length}개` : undefined}
      >
        {clusters.map((c) => {
          const key = c.ids[0];
          const members = c.ids.map((id) => byId.get(id)!);
          const first = members[0];
          const last = members[members.length - 1];
          const label =
            members.length === 1
              ? `${first.page}쪽, ${shortDate(first.day)}의 ${first.source.quote ? '문장' : '생각'}`
              : `${first.page === last.page ? `${first.page}쪽` : `${first.page}~${last.page}쪽`} 기록 ${members.length}개`;
          return (
            <span key={key} className={styles.flagGroup}>
              <button
                type="button"
                ref={(el) => {
                  if (el) buttons.current.set(key, el);
                  else buttons.current.delete(key);
                }}
                aria-label={label}
                aria-expanded={open?.id === key}
                aria-controls={open?.id === key ? popId : undefined}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(key);
                }}
                className={styles.flagHit}
                style={{
                  marginLeft: c.hit.x0,
                  width: c.hit.x1 - c.hit.x0,
                  top: c.hit.y0,
                  height: c.hit.y1 - c.hit.y0,
                  zIndex: FLAG_HIT_Z,
                }}
              />
              {c.ids.map((id) => {
                const l = layoutById.get(id)!;
                return (
                  <span key={id} className={styles[`c-${byId.get(id)!.color}`]}>
                    <span
                      aria-hidden
                      className={styles.flag}
                      style={{ top: l.y, width: l.len + FLAG_HIDDEN, zIndex: l.z }}
                    />
                  </span>
                );
              })}
            </span>
          );
        })}
      </div>
      {open && currentGroup && (
        <div
          ref={popRef}
          id={popId}
          role="dialog"
          aria-label={
            currentGroup.length === 1
              ? `${currentGroup[0].page}쪽 기록`
              : `${currentGroup[0].page}쪽 근처 기록 ${currentGroup.length}개`
          }
          className={clsx(
            'vellum',
            styles.fpop,
            currentGroup.length === 1 && styles[`c-${currentGroup[0].color}`]
          )}
          style={
            {
              left: open.left,
              top: open.top,
              '--ox': `${open.ox}px`,
            } as React.CSSProperties
          }
          onPointerDown={(e) => e.stopPropagation()}
        >
          {currentGroup.length === 1 ? (
            <FlagNote flag={currentGroup[0]} lines={6} />
          ) : (
            <ul className={styles.fpopList}>
              {currentGroup.map((f) => (
                <li key={f.id} className={styles[`c-${f.color}`]}>
                  <FlagNote flag={f} lines={3} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

/** 누름 영역이 플래그 그림보다 앞에 온다 — 묶음끼리는 겹치지 않으므로 하나의 값이면 된다 */
const FLAG_HIT_Z = 10;

/** 플래그를 눌러 펼친 기록 한 개 — 문장(없으면 생각), 쪽·날짜, 펼치기 */
function FlagNote({ flag, lines }: { flag: BookFlag<FlagEntry>; lines: 3 | 6 }) {
  return (
    <>
      <p
        className={clsx(
          'font-serif text-[17px] leading-[1.55]',
          lines === 6 ? 'line-clamp-6' : 'line-clamp-3',
          flag.source.quote ? 'text-ink' : 'text-ink-sub'
        )}
      >
        {flag.source.quote ?? flag.source.note}
      </p>
      <div className="mt-2 flex items-center justify-between font-mono text-[12px] font-medium text-ink-sub">
        <span>
          <i aria-hidden className={styles.swatch} />
          p.{flag.page} · {shortDate(flag.day)}
        </span>
        <Link
          href={flag.source.href}
          className="inline-flex min-h-8 items-center font-sans text-[14px] font-semibold text-accent"
        >
          펼치기
        </Link>
      </div>
    </>
  );
}
