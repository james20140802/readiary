import type { Stats } from '@/types/profile';

interface Props {
  stats: Stats;
}

/**
 * 판권면 — 책 맨 뒤 판권지처럼, 이 서재가 쌓아온 숫자를 세리프로.
 * 좁은 화면에서는 한 줄에 넷, 넓은 화면에서는 표지 옆에 세로 목록으로 선다.
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
    <dl className="flex items-start justify-between border-y border-hairline px-1 py-5 sm:flex-col sm:items-stretch sm:justify-start sm:border-y-0 sm:px-0 sm:py-0">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-w-[64px] flex-col items-center sm:flex-row sm:items-baseline sm:justify-between sm:border-b sm:border-hairline sm:py-4 sm:first:border-t"
        >
          <dt className="order-2 mt-2 text-caption text-ink-faint sm:order-1 sm:mt-0 sm:text-[13px]">
            {item.label}
          </dt>
          <dd className="order-1 font-serif text-[22px] leading-none tabular-nums text-accent sm:order-2 sm:text-[24px]">
            {item.n.toLocaleString('ko-KR')}
          </dd>
        </div>
      ))}
    </dl>
  );
}
