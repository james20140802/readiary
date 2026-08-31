import Link from 'next/link';
import Card from '@/components/ui/Card';
import Seal from '@/components/ui/Seal';
import type { RecallEntry } from '@/lib/recall/fetchRecallEntry';

export function RecallCard({ recall }: { recall: RecallEntry }) {
  const label = recall.yearsAgo != null ? `${recall.yearsAgo}년 전 오늘` : '다시 꺼낸 문장';
  const meta = [recall.bookAuthor, recall.date.replaceAll('-', '. ') + '.']
    .filter(Boolean)
    .join(' · ');
  return (
    <Link href={`/protected/entry/${recall.id}`} className="block">
      <Card hoverable variant="raised" className="px-[26px] pb-6 pt-[30px]">
        <Seal className="mb-3 block">{label}</Seal>
        <span aria-hidden className="mb-2 block font-serif text-[40px] leading-none text-accent">
          “
        </span>
        <blockquote className="line-clamp-3 font-serif text-quote text-ink">
          {recall.quote}
        </blockquote>
        <div className="mt-[18px] flex items-baseline gap-2 border-t border-hairline pt-[14px]">
          <span className="font-serif text-[13px] font-bold text-ink">{recall.bookTitle}</span>
          <span className="text-caption text-ink-faint">{meta}</span>
        </div>
      </Card>
    </Link>
  );
}
