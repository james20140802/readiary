'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useStableViewportHeight } from '@/hooks/useStableViewportHeight';
import { useTopBarState } from './TopBarContext';

/* ── 모바일: 한 화면씩 끊기는 장 ── */

interface LeavesRegistry {
  titles: Map<Element, string>;
  attach(io: IntersectionObserver | null): void;
  register(el: HTMLElement, title: string): () => void;
}
const LeavesContext = createContext<LeavesRegistry | null>(null);

function createRegistry(): LeavesRegistry {
  let observer: IntersectionObserver | null = null;
  const reg: LeavesRegistry = {
    titles: new Map(),
    attach(io) {
      observer = io;
      if (io) reg.titles.forEach((_, el) => io.observe(el));
    },
    register(el, title) {
      reg.titles.set(el, title);
      observer?.observe(el);
      return () => {
        reg.titles.delete(el);
        observer?.unobserve(el);
      };
    },
  };
  return reg;
}

/**
 * 모바일 장 묶음. 각 Leaf를 관찰해 60% 이상 보이는 장 중 DOM 순서로 가장 뒤의 장(없으면 첫 장)을
 * 현재 장으로 보고 상단 바 제목·재질(scrolled)에 알린다. sticky로 덮인 장도 보이는 것으로 잡힌다.
 */
export function Leaves({
  children,
  desktop = false,
  className = '',
}: {
  children: React.ReactNode;
  /** 같은 입력 DOM을 데스크톱에서도 유지하는 반응형 장 묶음 */
  desktop?: boolean;
  className?: string;
}) {
  useStableViewportHeight();
  const { setLeafTitle, setScrolled, claimScroll } = useTopBarState();
  const [registry] = useState(createRegistry);

  useEffect(() => {
    const release = claimScroll();
    const seen = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.intersectionRatio >= 0.6) seen.add(e.target);
          else seen.delete(e.target);
        }
        const all = [...registry.titles.keys()].sort((a, b) =>
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
        );
        if (all.length === 0) return;
        const current = all.filter((l) => seen.has(l)).pop() ?? all[0];
        setLeafTitle(registry.titles.get(current) ?? null);
        setScrolled(current !== all[0]);
      },
      { threshold: [0, 0.6, 1] }
    );
    registry.attach(io);
    return () => {
      io.disconnect();
      registry.attach(null);
      release();
      setLeafTitle(null);
      setScrolled(false);
    };
  }, [registry, setLeafTitle, setScrolled, claimScroll]);

  return (
    <LeavesContext.Provider value={registry}>
      <div className={`leaves ${desktop ? '' : 'lg:hidden'} ${className}`}>{children}</div>
    </LeavesContext.Provider>
  );
}

export function Leaf({
  title,
  label,
  vellum = false,
  free = false,
  children,
}: {
  title: string;
  label?: string;
  vellum?: boolean;
  free?: boolean;
  children: React.ReactNode;
}) {
  const ctx = useContext(LeavesContext);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!ctx || !el) return;
    return ctx.register(el, title);
  }, [ctx, title]);

  const cls = ['leaf', vellum && 'vellum', free && 'leaf--free'].filter(Boolean).join(' ');
  return (
    <section ref={ref} className={cls} data-title={title} aria-label={label ?? title}>
      <div className="leaf-in">{children}</div>
    </section>
  );
}

/** 덮기 관계: 첫 장이 고정되고 뒤 장들이 간지로 그 위를 덮는다 */
export function LeafStack({ children }: { children: React.ReactNode }) {
  return <div className="leaf-stack">{children}</div>;
}

/* ── 데스크톱: 한 화면씩 끊기는 장 + 오른쪽 위 전환 버튼 ── */

export function DesktopLeaves({ children }: { children: React.ReactNode }) {
  return <div className="dleaves hidden lg:block">{children}</div>;
}

export function DesktopLeaf({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="dleaf">
      {children}
    </section>
  );
}

export function LeafSwitch({
  label,
  items,
}: {
  label: string;
  items: { id: string; label: string }[];
}) {
  const [current, setCurrent] = useState(items[0]?.id ?? '');
  const ids = items.map((i) => i.id).join('|');

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent(e.target.id);
      },
      { threshold: 0.55 }
    );
    ids.split('|').forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ids]);

  return (
    <nav
      aria-label={label}
      className="dseg bar-material fixed right-8 top-6 z-30 hidden h-10 grid-flow-col rounded-xl p-[3px] lg:grid"
    >
      {items.map((it) => (
        <a
          key={it.id}
          href={`#${it.id}`}
          aria-current={current === it.id ? 'true' : undefined}
          className="dseg-item flex items-center rounded-[9px] px-4 text-[14px] font-semibold text-ink-sub"
        >
          {it.label}
        </a>
      ))}
    </nav>
  );
}
