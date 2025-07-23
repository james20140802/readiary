import EntryDetailContent from '@/components/entry/EntryDetailContent';
import { fetchEntryDetail } from '@/lib/entries/fetchEntryDetail';
import { notFound } from 'next/navigation';

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ entry_id: string }>;
}) {
  const entryId = (await params).entry_id;
  if (!entryId) return notFound();

  const detail = await fetchEntryDetail(entryId);

  if (!detail) {
    return <p className="p-4 text-red-500">기록을 찾을 수 없습니다.</p>;
  }

  return <EntryDetailContent entry={detail.entry} book={detail.entry.book} />;
}
