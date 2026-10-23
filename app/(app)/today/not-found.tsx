'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

export default function TodayNotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-start px-6 pt-[calc(64px+var(--app-safe-top))] lg:pl-20 lg:pt-11">
      <h1 className="font-sans text-page-title text-ink">페이지를 찾을 수 없어요</h1>
      <p className="mt-3 font-sans text-body text-ink-sub">
        찾으시는 화면이 없거나 열어 볼 수 없어요.
      </p>
      <Button className="mt-6" onClick={() => router.back()}>
        돌아가기
      </Button>
    </div>
  );
}
