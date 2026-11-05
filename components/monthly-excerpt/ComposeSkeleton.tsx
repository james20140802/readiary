'use client';

import { SkeletonScope, filler } from '@/components/ui/Skeleton';
import { useTopBar } from '@/components/shell/TopBarContext';

const LENS = [34, 58, 24, 46, 40];

/** 엮기 화면을 불러오는 동안 — 단계 머리와 책 칩, 문장 몇 줄의 자리 */
export default function ComposeSkeleton() {
  useTopBar({ title: '엮기', back: { href: '/excerpts', label: '모아 보기' } });
  return (
    <SkeletonScope label="엮기 화면을 펼치는 중" className="mx-auto w-full max-w-[640px]">
      <div className="flex items-baseline justify-between font-sans text-caption">
        <span data-skeleton className="font-semibold">
          {filler(6)}
        </span>
        <span data-skeleton>{filler(8)}</span>
      </div>
      <h2 data-skeleton className="mt-3 font-serif text-[20px] font-bold leading-[1.4]">
        {filler(12)}
      </h2>
      <p data-skeleton className="mb-3 mt-0.5 font-sans text-caption">
        {filler(18)}
      </p>
      <div className="flex gap-1.5">
        {[4, 7, 6].map((n, i) => (
          <span
            key={i}
            data-skeleton
            className="rounded-full border border-hairline-strong px-3 py-1.5 font-sans text-button-sm"
          >
            {filler(n)}
          </span>
        ))}
      </div>
      <ul className="mt-2">
        {LENS.map((n, i) => (
          <li key={i} className="grid grid-cols-[28px_1fr] gap-x-2.5 border-t border-hairline py-3">
            <span className="mt-0.5 h-[22px] w-[22px] rounded-full border border-hairline-strong" />
            <span>
              <span data-skeleton className="block font-serif text-[16px] leading-[1.55]">
                {filler(n)}
              </span>
              <span data-skeleton className="mt-1 block font-sans text-fine">
                {filler(16)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </SkeletonScope>
  );
}
