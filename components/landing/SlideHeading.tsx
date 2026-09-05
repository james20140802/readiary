'use client';

import { motion, useTransform } from 'framer-motion';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useSlideEnter } from './Slide';

interface SlideHeadingProps {
  /** 잉크색 소제목 — '문장', '회고' 같은 장의 이름 */
  eyebrow: string;
  title: ReactNode;
  body?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

/** 랜딩 한 장의 제목 묶음 — 소제목·세리프 표제·설명 한 문단. 장이 올라올 때 실물 UI보다 먼저 떠오른다 */
export default function SlideHeading({
  eyebrow,
  title,
  body,
  align = 'left',
  className,
}: SlideHeadingProps) {
  const { enter, reduced } = useSlideEnter();
  const opacity = useTransform(enter, [0.25, 0.7], [0, 1]);
  const y = useTransform(enter, [0.25, 0.85], [36, 0]);

  return (
    <motion.header
      style={reduced ? undefined : { opacity, y }}
      className={clsx(align === 'center' && 'flex flex-col items-center text-center', className)}
    >
      <p className="text-overline text-accent">{eyebrow}</p>
      <h2 className="mt-3 text-balance font-serif text-2xl font-bold leading-snug text-ink md:text-[2rem] md:leading-snug">
        {title}
      </h2>
      {body && <p className="mt-3 max-w-prose text-body leading-relaxed text-ink-sub">{body}</p>}
    </motion.header>
  );
}
