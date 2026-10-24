'use client';

import Button from '@/components/ui/Button';

/** 오늘을 불러오지 못했을 때 — 쓰던 초안은 이 탭에 남아 있으니 다시 시도하면 이어 쓸 수 있다 */
export default function TodayError({ onRetry }: { onRetry: () => void }) {
  return (
    <section
      role="alert"
      className="px-6 pt-[calc(76px+var(--app-safe-top))] lg:pl-20 lg:pr-14 lg:pt-16"
    >
      <h1 className="font-serif text-section-title text-ink">오늘을 펼치지 못했어요</h1>
      <p className="mt-3 max-w-[32rem] font-sans text-body text-ink-sub">
        잠시 연결이 고르지 않았어요. 쓰던 문장은 이 탭에 그대로 남아 있으니 다시 시도해 주세요.
      </p>
      <Button className="mt-6" onClick={onRetry}>
        다시 시도
      </Button>
    </section>
  );
}
