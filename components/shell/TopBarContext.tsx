'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

export interface TopBarConfig {
  title?: string;
  brand?: boolean;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}

const DEFAULT_CONFIG: TopBarConfig = { brand: true, title: '' };

interface TopBarState {
  config: TopBarConfig;
  scrolled: boolean;
  leafTitle: string | null;
  setConfig(c: TopBarConfig): void;
  setScrolled(v: boolean): void;
  setLeafTitle(t: string | null): void;
}

const TopBarContext = createContext<TopBarState | null>(null);

export function TopBarProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<TopBarConfig>(DEFAULT_CONFIG);
  const [scrolled, setScrolled] = useState(false);
  const [leafTitle, setLeafTitle] = useState<string | null>(null);
  const value = useMemo(
    () => ({ config, scrolled, leafTitle, setConfig, setScrolled, setLeafTitle }),
    [config, scrolled, leafTitle]
  );
  return <TopBarContext.Provider value={value}>{children}</TopBarContext.Provider>;
}

export function useTopBarState(): TopBarState {
  const ctx = useContext(TopBarContext);
  if (!ctx) throw new Error('useTopBarState는 TopBarProvider 안에서만 쓸 수 있다');
  return ctx;
}

/**
 * 화면이 상단 바의 제목·뒤로·동작을 정한다. 언마운트하면 기본값(브랜드 + 찾기·알림)으로 돌아간다.
 *
 * 호출하는 쪽은 렌더마다 새 객체와 새 ReactNode를 넘기므로, 객체 자체를 effect 의존성으로 쓰면
 * setConfig → 리렌더 → 새 객체 → setConfig … 로 무한 반복한다. 그래서 값으로 비교할 수 있는
 * title·brand·back.href·back.label만 의존성으로 쓰고, actions는 ref에 최신 값을 담아 두었다가
 * 그 의존성이 바뀌어 effect가 돌 때 함께 반영한다. 즉 actions만 바뀌는 경우는 반영되지 않으므로
 * (동작 버튼의 모양이 바뀌어야 하면 title 등 다른 값과 함께 바뀌게 하거나 key를 쓴다) 모양이
 * 자주 바뀌는 동작은 상단 바에 넣지 않는 것을 전제로 한다.
 */
export function useTopBar(config: TopBarConfig): void {
  const { setConfig } = useTopBarState();
  const actionsRef = useRef(config.actions);
  // 렌더 중에는 ref를 건드리지 않고, 아래 반영 effect보다 먼저 선언한 effect에서 최신 값을 담는다
  useEffect(() => {
    actionsRef.current = config.actions;
  });

  const { title, brand, back } = config;
  const backHref = back?.href;
  const backLabel = back?.label;

  useEffect(() => {
    setConfig({
      title: title ?? '',
      // 뒤로 링크가 있으면 브랜드는 자리를 내준다. 명시하면 그 값을 따른다.
      brand: brand ?? !backHref,
      back: backHref !== undefined ? { href: backHref, label: backLabel ?? '' } : undefined,
      actions: actionsRef.current,
    });
    return () => setConfig(DEFAULT_CONFIG);
  }, [title, brand, backHref, backLabel, setConfig]);
}
