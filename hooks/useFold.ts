'use client';

import { useReducedMotion, type Variants } from 'framer-motion';
import { EASE_IN_OUT, FOLD_DURATION } from '@/lib/motion';

interface FoldOptions {
  /** 처음 나타날 때도 펼칠지 — 목록에 이미 있던 항목은 움직이지 않고 그 자리에 놓는다 */
  appear?: boolean;
  /**
   * 사라질 때 접을지 — AnimatePresence의 custom을 받아 판단한다. 기본은 늘 접는다.
   * false면 지금처럼 바로 사라진다(필터로 빠지는 항목처럼 자주 일어나는 제거).
   */
  foldOnExit?: (custom: unknown) => boolean;
}

/**
 * 지우거나 펼칠 때 아래 내용이 툭 튀지 않도록 높이째 접고 펼친다 — motion 요소에 그대로 펼쳐 쓴다.
 * 사라지는 쪽은 AnimatePresence 안에 둔다. 접히는 상자 자체에는 margin·padding·border를 주지 말고
 * 안쪽 요소에 준다(높이 0이 되어도 남는다).
 *
 * overflow는 움직이는 동안만 clip — hidden은 스크롤 상자가 되어, 펼치는 중 autoFocus된 입력칸 쪽으로
 * 안쪽이 스크롤돼 버린다. 다 펼친 뒤에는 원래대로 두어 포커스 링·그림자를 자르지 않는다.
 *
 * MotionConfig의 reducedMotion은 transform·layout만 끄므로 height는 여기서 끈다 —
 * 줄이는 모션에서는 높이는 한 번에 바뀌고 흐려지고 나타나는 것만 남는다.
 */
export function useFold({ appear = false, foldOnExit }: FoldOptions = {}) {
  const reduce = useReducedMotion();
  const base = { duration: FOLD_DURATION, ease: EASE_IN_OUT };

  const variants: Variants = {
    open: {
      height: 'auto',
      opacity: 1,
      transition: reduce ? { ...base, height: { duration: 0 } } : base,
      transitionEnd: { overflow: 'visible' },
    },
    folded: (custom: unknown) =>
      foldOnExit && !foldOnExit(custom)
        ? { opacity: 0, transition: { duration: 0 } }
        : {
            height: 0,
            opacity: 0,
            overflow: 'clip',
            // 줄이는 모션: 다 흐려진 뒤에 자리를 비운다
            transition: reduce ? { ...base, height: { duration: 0, delay: FOLD_DURATION } } : base,
          },
  };

  return {
    variants,
    initial: appear ? 'folded' : false,
    animate: 'open',
    exit: 'folded',
  } as const;
}
