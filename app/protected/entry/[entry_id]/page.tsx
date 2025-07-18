import { fetchEntryDetail } from '@/lib/entries/fetchEntryDetail';
import EntryDetailContent from './_components/EntryDetailContent';

export default async function EntryDetailPage({ params }: { params: { entry_id: string } }) {
  const detail = await fetchEntryDetail(params.entry_id);

  if (!detail) {
    return <p className="p-4 text-red-500">기록을 찾을 수 없습니다.</p>;
  }

  return <EntryDetailContent entry={detail.entry} book={detail.entry.book} />;
}
