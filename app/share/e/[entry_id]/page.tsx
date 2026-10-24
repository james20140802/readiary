import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ShareEntryView from '@/components/tools/ShareEntryView';
import { fetchPublicEntry } from '@/lib/share/fetchPublicEntry';

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

  return <ShareEntryView entry={entry} />;
}
