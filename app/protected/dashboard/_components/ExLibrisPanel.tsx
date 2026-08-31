import Seal from '@/components/ui/Seal';
import type { Stats } from '@/types/profile';

interface Props {
  name: string | null;
  stats: Stats;
}

/**
 * 장서표(Ex Libris) 패널 — 발췌집 표지의 이중 보더 어휘를 빌린 서재 명패.
 * 홈의 맨 아래에서 "이 서재가 쌓아온 것"을 조용히 말한다.
 */
export function ExLibrisPanel({ name, stats }: Props) {
  const items = [
    { n: stats.totalBooks, label: '함께한 책' },
    { n: stats.totalEntries, label: '남긴 문장' },
    { n: stats.finishedBooks, label: '완독' },
  ];

  return (
    <section className="rounded-sm border border-hairline-strong bg-card p-[5px]">
      <div className="rounded-[2px] border border-hairline px-6 py-7 text-center">
        <Seal>Ex Libris</Seal>
        <p className="mt-1 font-serif text-[15px] font-bold text-ink">
          {name ? `${name}의 서재` : '나의 서재'}
        </p>
        <div className="mx-auto mt-5 flex max-w-[360px] items-start justify-between">
          {items.map((item) => (
            <div key={item.label} className="min-w-[72px]">
              <p className="font-serif text-xl leading-none text-accent">{item.n}</p>
              <p className="mt-1.5 text-caption text-ink-faint">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
