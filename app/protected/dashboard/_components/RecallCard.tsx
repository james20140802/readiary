import Link from 'next/link';
import Card from '@/components/ui/Card';
import Seal from '@/components/ui/Seal';
import type { RecallEntry } from '@/lib/recall/fetchRecallEntry';

export function RecallCard({ recall }: { recall: RecallEntry }) {
  const label = recall.yearsAgo != null ? `${recall.yearsAgo}년 전 오늘` : '다시 꺼낸 기록';
  const body = recall.quote ?? recall.note ?? '';
  return (
    <Link href={`/protected/entry/${recall.id}`} className="block">
      <Card hoverable className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <Seal>{label}</Seal>
          <span className="text-xs text-ink-faint">{recall.date.replaceAll('-', '.')}</span>
        </div>
        <p className={`font-serif text-ink line-clamp-3 ${recall.quote ? 'text-quote' : ''}`}>
          {recall.quote ? `“${body}”` : body}
        </p>
        <p className="mt-3 text-sm text-ink-sub">『{recall.bookTitle}』</p>
      </Card>
    </Link>
  );
}
