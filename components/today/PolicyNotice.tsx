'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { LEGAL_REVISION } from '@/lib/legal/texts';

const STORAGE_KEY = `readiary:policy-notice:${LEGAL_REVISION.id}`;

/** 공고일부터 시행일 하루가 끝날 때까지, 이 기기에서 닫지 않았으면 보인다 */
export function shouldShowPolicyNotice(now: number, dismissed: boolean): boolean {
  return !dismissed && now < Date.parse(LEGAL_REVISION.noticeUntil);
}

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * 약관·개인정보처리방침 개정을 오늘 화면에서 한 줄로 알린다 — 처리방침 제11조의 "서비스 화면에 알립니다".
 * 서버 렌더와 어긋나지 않게 첫 그림에서는 비워 두고, 브라우저에서 날짜와 닫음 여부를 본 뒤 나타난다.
 */
export default function PolicyNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 기기 시계와 저장소는 브라우저에서만 알 수 있다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(shouldShowPolicyNotice(Date.now(), readDismissed()));
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // 저장하지 못하면 다음에 다시 보일 뿐이다
    }
  };

  return (
    <aside
      aria-label="약관과 개인정보처리방침 개정 안내"
      className="flex items-center gap-2 border-y border-hairline py-1 font-sans text-caption text-ink-sub"
    >
      <p className="min-w-0 flex-1 break-keep py-2">
        약관과 개인정보처리방침이 {LEGAL_REVISION.effective.replace(/^\d{4}년 /, '')}부터 바뀌어요.{' '}
        <Link
          href="/privacy"
          className="whitespace-nowrap rounded-sm text-ink underline underline-offset-[3px] hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          자세히 보기
        </Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="개정 안내 닫기"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-sub hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <X size={18} strokeWidth={1.75} aria-hidden />
      </button>
    </aside>
  );
}
