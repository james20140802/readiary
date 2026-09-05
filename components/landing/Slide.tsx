'use client';

import {
  motion,
  MotionConfig,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import clsx from 'clsx';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

/** 랜딩의 장 순서 — 접근성 라벨과 진행도 계산의 기준 */
export const SLIDES = ['표지', '문장', '회고', '책장', '발췌집', '엽서', '프로필', '시작'] as const;
export type SlideLabel = (typeof SLIDES)[number];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

interface StackContextValue {
  /** 스택 전체의 스크롤 진행도 0→1 (첫 장이 꽉 찼을 때 0, 마지막 장이 꽉 찼을 때 1) */
  progress: MotionValue<number>;
  /** 시스템이 움직임을 줄이면 스크롤 결합 효과를 모두 끈다 */
  reduced: boolean;
}
const StackContext = createContext<StackContextValue | null>(null);

interface SlideContextValue {
  /** 이 장이 화면에 올라온 정도 0→1 — 이전 장을 다 덮으면 1 */
  enter: MotionValue<number>;
  reduced: boolean;
}
const SlideContext = createContext<SlideContextValue | null>(null);

/**
 * 감축 모션과 스크롤 진행도를 모든 장에 한 번에 — 스택 높이는 장 수 × 100svh이므로
 * 컨테이너 윗변이 화면 위에 닿은 뒤 (높이 − 화면 높이)만큼 내려가는 동안이 0→1이고,
 * 여기에 (장 수 − 1)을 곱하면 "몇 번째 장을 지나는 중"이 된다.
 * 컨테이너 위치는 직접 재서 쓴다(framer의 target 측정은 개발 모드에서 static 컨테이너 경고를 낸다).
 */
export function SlideStack({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const reduced = useReducedMotion() ?? false;
  const [bounds, setBounds] = useState({ top: 0, span: 1 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      setBounds({ top, span: Math.max(1, el.offsetHeight - window.innerHeight) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const progress = useTransform(scrollY, (y) => clamp01((y - bounds.top) / bounds.span));

  return (
    <MotionConfig reducedMotion="user">
      <StackContext.Provider value={{ progress, reduced }}>
        <div ref={ref} className="relative">
          {children}
        </div>
      </StackContext.Provider>
    </MotionConfig>
  );
}

interface SlideProps {
  label: SlideLabel;
  children: ReactNode;
  /** 본문 칸에 얹을 클래스 — 기본은 세로 가운데 정렬 */
  className?: string;
}

/**
 * 랜딩의 한 장 — 화면 높이만큼의 종이 한 장이 `sticky top-0`으로 서 있어,
 * 스크롤하면 다음 장이 이전 장을 덮으며 올라온다(커튼 스택). 덮이는 동안 이 장의 본문은
 * 스크롤 양만큼 조금 작아지고 흐려지며 위로 물러나, 종이 한 장이 위에 얹히는 인상을 준다.
 * 들어오는 본문은 SlideHeading(제목)과 SlideBody(실물 UI)가 이 장의 등장 진행도를 읽어 두 단계로 올라온다.
 */
export default function Slide({ label, children, className }: SlideProps) {
  const stack = useContext(StackContext);
  if (!stack) throw new Error('Slide는 SlideStack 안에서만 쓴다');
  const { progress, reduced } = stack;
  const index = SLIDES.indexOf(label);
  const span = SLIDES.length - 1;

  // 덮임: 다음 장이 올라오는 정도. 등장: 이전 장을 덮은 정도(첫 장은 늘 1)
  const cover = useTransform(progress, (p) => clamp01(p * span - index));
  const enter = useTransform(progress, (p) => (index === 0 ? 1 : clamp01(p * span - index + 1)));
  const one = useMotionValue(1);

  const scale = useTransform(cover, [0, 1], [1, 0.94]);
  const opacity = useTransform(cover, [0, 0.75], [1, 0.3]);
  const y = useTransform(cover, [0, 1], [0, -28]);

  return (
    <SlideContext.Provider value={{ enter: reduced ? one : enter, reduced }}>
      <section
        aria-label={label}
        className={clsx(
          // 내용이 한 화면을 넘는 짧은 화면(가로 폰·큰 글자)에서는 장 안에서 스크롤해 끝까지 닿을 수 있게 한다
          'sticky top-0 flex h-[100svh] flex-col overflow-x-hidden overflow-y-auto bg-paper [scrollbar-width:thin]',
          index > 0 && 'shadow-[0_-24px_64px_-32px_rgb(var(--ink)/0.22)]'
        )}
      >
        <motion.div
          style={reduced ? undefined : { scale, opacity, y }}
          className={clsx(
            // my-auto — 들어맞으면 세로 가운데, 넘치면 위부터(justify-center는 넘친 윗부분을 닿을 수 없게 만든다)
            'mx-auto my-auto flex w-full max-w-screen-md flex-col px-5 pb-12 pt-16 md:px-4 md:pb-14 md:pt-[6rem]',
            className
          )}
        >
          {children}
        </motion.div>
      </section>
    </SlideContext.Provider>
  );
}

/** 이 장의 등장 진행도 — SlideHeading·SlideBody가 읽는다 */
export function useSlideEnter(): SlideContextValue {
  const ctx = useContext(SlideContext);
  if (!ctx) throw new Error('useSlideEnter는 Slide 안에서만 쓴다');
  return ctx;
}

interface StageProps {
  children: ReactNode;
  className?: string;
}

/**
 * 장의 실물 UI 묶음 — 제목보다 반 박자 늦게, 스크롤에 붙어 올라온다.
 * 장의 본문 레이아웃(그리드 등)에서 UI 쪽 칸을 이 컴포넌트로 감싼다.
 */
export function SlideBody({ children, className }: StageProps) {
  const { enter, reduced } = useSlideEnter();
  const opacity = useTransform(enter, [0.4, 0.85], [0, 1]);
  const y = useTransform(enter, [0.4, 1], [48, 0]);
  return (
    <motion.div style={reduced ? undefined : { opacity, y }} className={className}>
      {children}
    </motion.div>
  );
}
