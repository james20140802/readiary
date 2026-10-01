'use client';

import { MotionConfig } from 'framer-motion';
import type { PropsWithChildren } from 'react';

/** 기기가 '동작 줄이기'를 켰다면 framer의 이동·크기 변화는 빼고 나타남(opacity)만 남긴다 */
export default function MotionProvider({ children }: PropsWithChildren) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
