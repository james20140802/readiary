'use client';

import { createContext, useContext, type ReactNode } from 'react';

// 토론 화면을 보는 계정 — 이 기기에 남기는 초안을 계정마다 나눈다
const DebateViewer = createContext<string | null>(null);

export function DebateViewerProvider({
  viewerId,
  children,
}: {
  viewerId: string | null;
  children: ReactNode;
}) {
  return <DebateViewer.Provider value={viewerId}>{children}</DebateViewer.Provider>;
}

export const useDebateViewer = () => useContext(DebateViewer);
