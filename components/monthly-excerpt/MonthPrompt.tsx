'use client';

import { Suspense, use, useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { promptSummary } from '@/lib/monthly-excerpt/korean-count';
import { shortMonthLabel } from '@/lib/monthly-excerpt/month';
import { dismissPrompt, isPromptDismissed } from '@/lib/monthly-excerpt/promptDismiss';
import type { ExcerptPrompt } from '@/lib/monthly-excerpt/types';

function Slip({ prompt }: { prompt: ExcerptPrompt }) {
  // 서버 렌더와 어긋나지 않게 첫 그림에서는 비워 두고, 브라우저에서 닫은 기억을 본 뒤 나타난다
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // 닫은 기억은 브라우저 저장소에서만 알 수 있다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(!isPromptDismissed(prompt.month));
  }, [prompt.month]);

  if (!visible) return null;

  return (
    <aside aria-label="달의 발췌집 안내" className="vellum-slip my-5">
      <p className="break-keep font-serif text-[20px] font-semibold leading-snug text-ink">
        {shortMonthLabel(prompt.month)}을 엮어 볼까요?
      </p>
      <p className="mt-1.5 break-keep font-sans text-caption text-ink-sub">
        {promptSummary(prompt.bookCount, prompt.quoteCount)}
      </p>
      <div className="mt-3 flex items-center gap-1">
        <Button asChild size="sm">
          <Link href={`/excerpts/${prompt.month}/compose`}>문장 고르기</Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            dismissPrompt(prompt.month);
            setVisible(false);
          }}
        >
          다음에
        </Button>
      </div>
    </aside>
  );
}

function Resolved({ prompt }: { prompt: Promise<ExcerptPrompt | null> }) {
  const value = use(prompt);
  return value ? <Slip prompt={value} /> : null;
}

/**
 * 오늘 화면의 조용한 안내 — 지난달을 엮어 볼까요. 회상처럼 따로 늦게 올 수 있어, 도착하면 나타나고
 * 조회가 실패했거나 안내할 달이 없으면 아무것도 그리지 않는다.
 */
export default function MonthPrompt({ prompt }: { prompt: Promise<ExcerptPrompt | null> }) {
  return (
    <Suspense fallback={null}>
      <Resolved prompt={prompt} />
    </Suspense>
  );
}
