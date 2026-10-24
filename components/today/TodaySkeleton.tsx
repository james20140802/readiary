import clsx from 'clsx';
import s from './today.module.css';

function Block({ className }: { className: string }) {
  return <div className={clsx('rounded-[3px] bg-hairline/70', className)} />;
}

/** 오늘을 불러오는 동안 — 큰 날짜와 쓰기 자리만 먼저. 화면 틀(leaves)은 여백을 장이 잡으므로 여기서 둔다 */
export default function TodaySkeleton() {
  return (
    <div role="status" aria-label="오늘을 불러오는 중입니다" className="motion-safe:animate-pulse">
      <div className="px-6 pt-[calc(72px+var(--app-safe-top))] lg:hidden">
        <Block className="h-24 w-40" />
        <div className={s.write}>
          <Block className="h-6 w-3/4" />
          <Block className="mt-4 h-6 w-1/2" />
          <Block className="mt-10 h-9 w-36" />
        </div>
      </div>
      <div className={clsx('hidden lg:grid', s.spread)}>
        <div>
          <Block className="h-36 w-64" />
          <Block className="mt-14 h-7 w-3/4" />
          <Block className="mt-4 h-7 w-1/2" />
        </div>
        <div>
          <Block className="h-56 w-full" />
          <Block className="mt-11 h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
