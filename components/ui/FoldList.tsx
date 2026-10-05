'use client';

import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useIsPresent, type HTMLMotionProps } from 'framer-motion';

interface FoldListProps {
  as?: 'div' | 'ul';
  className?: string;
  /** AnimatePresence의 custom — 지금 빠지는 항목을 접을지 판단할 때(useFold의 foldOnExit) */
  custom?: unknown;
  isEmpty: boolean;
  /** 목록이 비었을 때 목록 상자 아래에 놓을 문구 */
  empty: ReactNode;
  children: ReactNode;
}

/**
 * 항목이 접히며 빠지는 목록 상자. 상자는 비어도 남겨 두어 마지막 항목도 접히며 빠지게 하고,
 * 빈 문구는 그 마지막 항목이 다 접힌 뒤에 놓는다 — 함께 놓으면 접히는 행 아래에 문구가 먼저 붙어
 * 영역이 잠깐 늘었다 줄어든다. 문구의 상태를 목록과 함께 마운트해야, 화면에 없는 사이(다른 탭)
 * 비게 된 목록도 다시 열 때 문구가 바로 보인다.
 */
export function FoldList({
  as = 'div',
  className,
  custom,
  isEmpty,
  empty,
  children,
}: FoldListProps) {
  const [exitsDone, setExitsDone] = useState(isEmpty);
  // 항목이 다시 생기면 되돌린다 — 다음에 비워질 때도 접힘이 끝나기를 기다리도록
  if (!isEmpty && exitsDone) setExitsDone(false);

  const Box = as;
  return (
    <>
      <Box className={className}>
        <AnimatePresence initial={false} custom={custom} onExitComplete={() => setExitsDone(true)}>
          {children}
        </AnimatePresence>
      </Box>
      {isEmpty && exitsDone && empty}
    </>
  );
}

/*
 * 접히며 빠지는 항목 — 빠지기 시작한 순간부터 inert로 둔다. 접히는 동안(FOLD_DURATION)에도 안의
 * 버튼이 눌리고 포커스가 들어가면, 이미 지운 댓글·기록에 요청을 다시 보내거나 수정 시트를 열 수 있다.
 * AnimatePresence의 바로 아래 자식으로 쓴다(useIsPresent가 그 자리를 본다).
 */
export function FoldDiv(props: HTMLMotionProps<'div'>) {
  const isPresent = useIsPresent();
  return <motion.div {...props} inert={!isPresent || undefined} />;
}

export function FoldLi(props: HTMLMotionProps<'li'>) {
  const isPresent = useIsPresent();
  return <motion.li {...props} inert={!isPresent || undefined} />;
}
