'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

export interface TopBarConfig {
  title?: string;
  brand?: boolean;
  back?: { href: string; label: string };
}

const DEFAULT_CONFIG: TopBarConfig = { brand: true, title: '' };

interface TopBarState {
  config: TopBarConfig;
  scrolled: boolean;
  leafTitle: string | null;
  setConfig(c: TopBarConfig | ((prev: TopBarConfig) => TopBarConfig)): void;
  /** 화면이 넣은 동작 버튼을 꽂을 자리(TopBar가 등록) */
  actionsSlot: HTMLElement | null;
  setActionsSlot(el: HTMLElement | null): void;
  /** TopBarActions가 마운트되어 있는 수 — 0이면 기본 찾기·알림을 보인다 */
  actionsCount: number;
  setActionsCount(update: (n: number) => number): void;
  setScrolled(v: boolean): void;
  /** LargeTitle·Leaves가 scrolled를 직접 정할 때 부른다. 돌려받은 함수로 해제한다 */
  claimScroll(): () => void;
  setLeafTitle(t: string | null): void;
}

const TopBarContext = createContext<TopBarState | null>(null);

export function TopBarProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<TopBarConfig>(DEFAULT_CONFIG);
  const [scrolled, setScrolled] = useState(false);
  const [leafTitle, setLeafTitle] = useState<string | null>(null);
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null);
  const [actionsCount, setActionsCount] = useState(0);
  const [scrollOwners, setScrollOwners] = useState(0);
  const claimScroll = useCallback(() => {
    setScrollOwners((n) => n + 1);
    return () => setScrollOwners((n) => n - 1);
  }, []);

  // 큰 제목 표식·장 묶음이 없는 화면(아직 이전하지 않은 화면)은 창 스크롤로 재질을 바꾼다
  useEffect(() => {
    if (scrollOwners > 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scrollOwners]);

  const value = useMemo(
    () => ({
      config,
      scrolled,
      leafTitle,
      setConfig,
      setScrolled,
      claimScroll,
      setLeafTitle,
      actionsSlot,
      setActionsSlot,
      actionsCount,
      setActionsCount,
    }),
    [config, scrolled, leafTitle, actionsSlot, actionsCount, claimScroll]
  );
  return <TopBarContext.Provider value={value}>{children}</TopBarContext.Provider>;
}

export function useTopBarState(): TopBarState {
  const ctx = useContext(TopBarContext);
  if (!ctx) throw new Error('useTopBarState는 TopBarProvider 안에서만 쓸 수 있다');
  return ctx;
}

/**
 * 화면이 상단 바의 제목·뒤로를 정한다. 언마운트하면 기본값(브랜드)으로 돌아간다.
 *
 * 호출하는 쪽은 렌더마다 새 객체를 넘기므로 객체 자체를 effect 의존성으로 쓰면
 * setConfig → 리렌더 → 새 객체 → setConfig … 로 무한 반복한다. 그래서 값으로 비교할 수 있는
 * title·brand·back.href·back.label만 의존성으로 쓴다. 동작 버튼(ReactNode)은 config에 넣지 않고
 * TopBarActions 포털로 그린다.
 * 되돌릴 때는 내가 설정한 config가 아직 그대로일 때만 기본값으로 돌린다 —
 * 다음 화면이 먼저 마운트해 덮어썼다면 그 화면의 설정을 지우지 않는다.
 */
export function useTopBar(config: TopBarConfig): void {
  const { setConfig } = useTopBarState();
  const { title, brand, back } = config;
  const backHref = back?.href;
  const backLabel = back?.label;

  useEffect(() => {
    const mine: TopBarConfig = {
      title: title ?? '',
      // 뒤로 링크가 있으면 브랜드는 자리를 내준다. 명시하면 그 값을 따른다.
      brand: brand ?? !backHref,
      back: backHref !== undefined ? { href: backHref, label: backLabel ?? '' } : undefined,
    };
    setConfig(mine);
    return () => setConfig((c) => (c === mine ? DEFAULT_CONFIG : c));
  }, [title, brand, backHref, backLabel, setConfig]);
}

/**
 * 화면이 상단 바 오른쪽에 둘 동작 버튼. 포털로 그려 늘 최신 렌더 결과(클로저)가 보인다.
 * 하나라도 마운트되어 있으면 기본 찾기·알림은 숨는다. 상태에는 개수만 둔다(ReactNode 금지).
 */
export function TopBarActions({ children }: { children: React.ReactNode }) {
  const { actionsSlot, setActionsCount } = useTopBarState();
  useLayoutEffect(() => {
    setActionsCount((n) => n + 1);
    return () => setActionsCount((n) => n - 1);
  }, [setActionsCount]);
  return actionsSlot ? createPortal(children, actionsSlot) : null;
}
