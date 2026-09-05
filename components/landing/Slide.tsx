'use client';

import { motion, MotionConfig } from 'framer-motion';
import clsx from 'clsx';
import type { ReactNode } from 'react';

/** 랜딩의 장 순서 — 접근성 라벨과 첫 장 여부는 여기서 한 번만 정한다 */
export const SLIDES = ['표지', '문장', '회고', '책장', '발췌집', '엽서', '프로필', '시작'] as const;
export type SlideLabel = (typeof SLIDES)[number];

interface SlideProps {
  label: SlideLabel;
  children: ReactNode;
  /** 본문 칸에 얹을 클래스 — 기본은 세로 가운데 정렬 */
  className?: string;
}

/**
 * 랜딩의 한 장 — 화면 높이만큼의 종이 한 장이 `sticky top-0`으로 서 있어,
 * 스크롤하면 다음 장이 이전 장을 덮으며 올라온다(커튼 스택). JS 없이 sticky만으로 넘어가고,
 * 본문은 화면에 들어올 때 한 번 떠오른다. 첫 장 뒤로는 윗변에 얇은 그늘을 두어
 * 올라오는 장이 종이 한 장으로 읽히게 한다.
 */
export default function Slide({ label, children, className }: SlideProps) {
  const index = SLIDES.indexOf(label);

  return (
    <section
      aria-label={label}
      className={clsx(
        'sticky top-0 flex h-[100svh] flex-col overflow-hidden bg-paper',
        index > 0 && 'border-t border-hairline shadow-[0_-24px_48px_-24px_rgb(var(--ink)/0.28)]'
      )}
    >
      <div
        className={clsx(
          'mx-auto flex w-full max-w-screen-md flex-1 flex-col justify-center px-5 pb-12 pt-16 md:px-4 md:pb-14 md:pt-[6rem]',
          className
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}

/** 감축 모션 설정을 모든 장에 한 번에 — 시스템이 움직임을 줄이면 떠오르는 효과도 줄인다 */
export function SlideStack({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative">{children}</div>
    </MotionConfig>
  );
}
