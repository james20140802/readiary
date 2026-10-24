'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button';
import { useTopBar } from '@/components/shell/TopBarContext';

export default function EntryNotFound() {
  useTopBar({ title: '기록', back: { href: '/today', label: '오늘' } });

  return (
    <div className="py-16">
      <h1 className="font-serif text-[26px] font-bold leading-[1.3] text-ink">
        이 기록을 찾을 수 없어요
      </h1>
      <p className="mt-3 font-serif text-note text-ink-sub">지워졌거나, 볼 수 없는 기록이에요.</p>
      <div className="mt-8 flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/today">오늘로 가기</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/books">책장 보기</Link>
        </Button>
      </div>
    </div>
  );
}
