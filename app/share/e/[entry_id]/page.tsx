import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SentenceCard from '@/components/entries/SentenceCard';
import { fetchPublicEntry } from '@/lib/share/fetchPublicEntry';
import { formatDateLabel } from '@/lib/share/format';

type Props = { params: Promise<{ entry_id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { entry_id } = await params;
  const entry = await fetchPublicEntry(entry_id);
  if (!entry) return { title: 'Readiary' };
  return {
    title: `${entry.nickname}님의 문장 | Readiary`,
    description: (entry.quote ?? entry.note ?? '').slice(0, 120),
  };
}

export default async function ShareEntryPage({ params }: Props) {
  const { entry_id } = await params;
  const entry = await fetchPublicEntry(entry_id);
  if (!entry) notFound();

  return (
    <div className="max-w-md mx-auto py-10 space-y-6">
      <div className="bg-card border border-hairline rounded-2xl p-6">
        <SentenceCard
          quote={entry.quote}
          note={entry.note}
          bookTitle={entry.bookTitle}
          bookAuthor={entry.bookAuthor}
          dateLabel={formatDateLabel(entry.date)}
          nickname={entry.nickname}
          showWordmark
        />
      </div>
      <Link
        href="/"
        className="block text-center text-button text-accent hover:text-accent-hover transition-colors"
      >
        Readiary에서 나의 문장 기록하기
      </Link>
    </div>
  );
}
