import Link from 'next/link';
import Card from '@/components/ui/Card';
import Seal from '@/components/ui/Seal';
import ClampedText from '@/components/ui/ClampedText';
import type { RecallEntry } from '@/lib/recall/fetchRecallEntry';

export function RecallCard({ recall }: { recall: RecallEntry }) {
  const label = recall.yearsAgo != null ? `${recall.yearsAgo}년 전 오늘` : '다시 꺼낸 문장';
  const meta = [recall.bookAuthor, recall.date.replaceAll('-', '. ') + '.']
    .filter(Boolean)
    .join(' · ');
  // 카드 전체가 기록으로 가는 링크지만, 긴 문장의 '계속 읽기' 버튼이 <a> 안에 중첩되면
  // 링크와 버튼 의미가 겹친다(접근성). 링크는 카드 위에 깔린 overlay로 두고,
  // 버튼은 그 형제로서 overlay 위(z-10)에 올려 서로 포함 관계가 아니게 한다.
  return (
    <Card hoverable variant="raised" className="relative px-[26px] pb-6 pt-[30px]">
      <Link
        href={`/protected/entry/${recall.id}`}
        aria-label={`${recall.bookTitle}의 기록 보기`}
        className="absolute inset-0 rounded-[inherit]"
      />
      <Seal className="mb-3 block">{label}</Seal>
      <span aria-hidden className="mb-2 block font-serif text-[40px] leading-none text-accent">
        “
      </span>
      <ClampedText fadeFromClassName="from-card">
        <blockquote className="font-serif text-quote text-ink">{recall.quote}</blockquote>
      </ClampedText>
      <div className="mt-[18px] flex items-baseline gap-2 border-t border-hairline pt-[14px]">
        <span className="font-serif text-[13px] font-bold text-ink">{recall.bookTitle}</span>
        <span className="text-caption text-ink-faint">{meta}</span>
      </div>
    </Card>
  );
}
