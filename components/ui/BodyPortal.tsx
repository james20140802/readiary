'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const subscribe = () => () => {};

/**
 * fixed로 뜨는 시트를 body로 옮긴다 — 목록 항목의 등장 애니메이션(ink-in)처럼 조상에 transform·opacity가
 * 걸려 있으면 fixed 자손은 뷰포트 대신 그 조상을 기준으로 놓이고 쌓임 순서도 그 안에 갇힌다.
 * 서버와 첫 hydration에서는 그리지 않는다(시트는 사용자가 연 뒤에만 보이므로 잃는 것이 없다).
 */
export default function BodyPortal({ children }: { children: ReactNode }) {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  return isClient ? createPortal(children, document.body) : null;
}
