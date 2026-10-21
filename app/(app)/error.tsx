'use client';

import Button from '@/components/ui/Button';

export default function ProtectedError({ reset }: { reset: () => void }) {
  return (
    <section className="space-y-4 rounded-2xl border border-hairline bg-card p-6" role="alert">
      <h1 className="text-section-title">화면을 불러오지 못했습니다</h1>
      <p className="text-body-sm text-ink-sub">잠시 후 다시 시도해 주세요.</p>
      <Button onClick={reset}>다시 시도</Button>
    </section>
  );
}
