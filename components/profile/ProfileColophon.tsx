import type { Stats } from '@/types/profile';

interface Props {
  stats: Stats;
}

/**
 * 판권면 — 책 맨 뒤 판권지처럼, 이 서재가 쌓아온 숫자를 세리프로 한 줄.
 * 홈 장서표와 같은 숫자 언어. 아이콘도 카드도 없다.
 */
export default function ProfileColophon({ stats }: Props) {
  const items = [
    { n: stats.totalBooks, label: '함께한 책' },
    { n: stats.totalEntries, label: '남긴 문장' },
    { n: stats.finishedBooks, label: '완독' },
    { n: stats.totalPages, label: '읽은 쪽' },
  ];

  return (
    <dl className="mt-12 flex items-start justify-between border-y border-hairline px-1 py-5 sm:px-6">
      {items.map((item) => (
        <div key={item.label} className="min-w-[64px] text-center">
          <dd className="font-serif text-[22px] leading-none tabular-nums text-accent">
            {item.n.toLocaleString('ko-KR')}
          </dd>
          <dt className="mt-2 text-caption text-ink-faint">{item.label}</dt>
        </div>
      ))}
    </dl>
  );
}
