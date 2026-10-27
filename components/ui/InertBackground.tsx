'use client';
import { useLayoutEffect } from 'react';

type Saved = { el: HTMLElement; inert: boolean; ariaHidden: string | null };

// 겹친 시트(예: 수정 시트 위의 삭제 확인창)가 닫히는 순서와 상관없이 처음 값으로 돌아가도록
// 모듈 수준으로 깊이를 센다. 처음 열릴 때(0→1)만 원래 값을 저장·적용하고, 깊이가 0으로 돌아올 때만 복원한다.
let depth = 0;
let saved: Saved[] = [];

/**
 * EntryEditSheet의 배경 차단 방식을 이 Dialog의 마운트 수명에 맞춰 적용한다.
 * 반드시 Dialog 안에서 layout effect로 실행해 Headless UI가 배경을 바꾸기 전에
 * 원래 inert/aria-hidden 값을 저장하고, 닫힐 때 그 값으로 복원한다.
 * passive effect에서 저장하면 이미 비활성화된 MAIN을 원래 상태로 잘못 기억할 수 있다.
 */
export default function InertBackground() {
  useLayoutEffect(() => {
    if (depth === 0) {
      const targets = Array.from(document.body.children).filter(
        (el): el is HTMLElement =>
          el instanceof HTMLElement && el.id !== 'headlessui-portal-root' && el.tagName !== 'SCRIPT'
      );
      saved = targets.map((el) => ({
        el,
        inert: el.inert,
        ariaHidden: el.getAttribute('aria-hidden'),
      }));
      for (const el of targets) {
        el.inert = true;
        el.setAttribute('aria-hidden', 'true');
      }
    }
    depth += 1;
    return () => {
      depth -= 1;
      if (depth > 0) return;
      for (const { el, inert, ariaHidden } of saved) {
        el.inert = inert;
        if (ariaHidden === null) el.removeAttribute('aria-hidden');
        else el.setAttribute('aria-hidden', ariaHidden);
      }
      saved = [];
    };
  }, []);
  return null;
}
