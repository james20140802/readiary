'use client';

import type { CSSProperties } from 'react';
import clsx from 'clsx';
import { CircleAlert } from 'lucide-react';
import { Toaster as SonnerToaster } from 'sonner';

const ALERT = <CircleAlert aria-hidden strokeWidth={1.75} className="h-[18px] w-[18px]" />;

/** 토스트 상자 폭. 알약은 글자만큼만 넓어지고 이 폭에서 줄을 바꾼다 */
const WIDTH = { '--width': 'min(420px, calc(100vw - 32px))' } as CSSProperties;

interface ToasterProps {
  /** 사이드바가 보이는 화면인지 — 데스크톱에서 사이드바를 뺀 본문 가운데에 놓는다 */
  nav: boolean;
}

/**
 * 토스트 — 시안의 먹 알약(docs/design/concept-2026-10/app.css `.toast`). 자리는 시안과 달리 위 가운데에서 내려온다.
 * 쌓기·스와이프·타이머·호버 멈춤·스크린 리더 알림은 sonner가 맡고, 겉모습과 자리는 globals.css의 `.ink-toast`가 맡는다.
 * 부르는 쪽은 그대로 `import { toast } from 'sonner'`다.
 *
 * 성공·안내는 글자만 둔다. 잘 된 일은 조용히 지나가고, 오류·경고에만 적갈 표시를 붙인다.
 */
export default function Toaster({ nav }: ToasterProps) {
  return (
    <SonnerToaster
      position="top-center"
      duration={4000}
      visibleToasts={3}
      gap={8}
      containerAriaLabel="알림"
      className={clsx('ink-toaster', nav && 'ink-toaster--nav')}
      style={WIDTH}
      icons={{ success: null, info: null, error: ALERT, warning: ALERT }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'ink-toast',
          icon: 'ink-toast__icon',
          content: 'ink-toast__content',
        },
      }}
    />
  );
}
