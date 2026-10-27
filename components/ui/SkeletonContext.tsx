'use client';

import { createContext, useContext } from 'react';

const InSkeleton = createContext(false);

/** SkeletonScope 안임을 알린다 — 범위 밖(상단 바)으로 나가는 화면 조각이 스스로 멈추게 */
export function SkeletonProvider({ children }: { children: React.ReactNode }) {
  return <InSkeleton.Provider value>{children}</InSkeleton.Provider>;
}

/** 자리용 데이터로 그리는 중이면 true — 뒤로 링크·동작 버튼은 보이기만 하고 누를 수 없다 */
export function useInSkeleton(): boolean {
  return useContext(InSkeleton);
}
