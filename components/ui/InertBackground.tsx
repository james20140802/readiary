'use client';
import { useLayoutEffect } from 'react';
/**
 * EntryEditSheet의 배경 차단 방식을 이 Dialog의 마운트 수명에 맞춰 적용한다.
 * 반드시 Dialog 안에서 layout effect로 실행해 Headless UI가 배경을 바꾸기 전에
 * 원래 inert/aria-hidden 값을 저장하고, 닫힐 때 그 값으로 복원한다.
 * passive effect에서 저장하면 이미 비활성화된 MAIN을 원래 상태로 잘못 기억할 수 있다.
 */
export default function InertBackground() {
  useLayoutEffect(() => {
    const targets = Array.from(document.body.children).filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement && el.id !== 'headlessui-portal-root' && el.tagName !== 'SCRIPT'
    );
    const previous = targets.map((el) => ({
      el,
      inert: el.inert,
      ariaHidden: el.getAttribute('aria-hidden'),
    }));
    for (const el of targets) {
      el.inert = true;
      el.setAttribute('aria-hidden', 'true');
    }
    return () => {
      for (const { el, inert, ariaHidden } of previous) {
        el.inert = inert;
        if (ariaHidden === null) el.removeAttribute('aria-hidden');
        else el.setAttribute('aria-hidden', ariaHidden);
      }
    };
  }, []);
  return null;
}
