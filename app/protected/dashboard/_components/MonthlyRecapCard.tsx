import Card from '@/components/ui/Card';
import Seal from '@/components/ui/Seal';
import type { MonthlyRecap } from '@/lib/retrospect/fetchMonthlyRecap';

export function MonthlyRecapCard({ recap }: { recap: MonthlyRecap }) {
  const headline =
    recap.quoteCount > 0
      ? `${recap.label}, 문장 ${recap.quoteCount}개를 남겼어요`
      : `${recap.label}, 기록 ${recap.entryCount}개를 남겼어요`;

  return (
    <Card hoverable={false} className="mb-4">
      <div className="mb-3">
        <Seal>지난달의 기록</Seal>
      </div>
      <p className="font-serif text-ink">{headline}</p>
      <p className="mt-1 text-sm text-ink-sub">
        기록 {recap.entryCount}개 · 책 {recap.bookCount}권
      </p>
    </Card>
  );
}
