import { clsx } from 'clsx';
import type { Stats } from '@/types/profile';

interface Props {
  stats: Stats;
  className?: string;
}

/**
 * 판권면 — 책 맨 뒤 판권지처럼, 이 서재가 쌓아온 숫자를 세리프로. 프로필 책을 펼치면 첫 장에 있다.
 * 홈 장서표와 같은 숫자 언어. 아이콘도 카드도 없다.
 */
export default function ProfileColophon({ stats, className }: Props) {
  const items = [
    { n: stats.totalBooks, label: '함께한 책' },
    { n: stats.totalEntries, label: '남긴 문장' },
    { n: stats.finishedBooks, label: '완독' },
    { n: stats.totalPages, label: '읽은 쪽' },
  ];

  return (
    <dl className={clsx('flex flex-col', className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-baseline justify-between border-b border-hairline py-3.5 first:border-t"
        >
          <dt className="text-[13px] text-ink-faint">{item.label}</dt>
          <dd className="font-serif text-[22px] leading-none tabular-nums text-accent">
            {item.n.toLocaleString('ko-KR')}
          </dd>
        </div>
      ))}
    </dl>
  );
}
