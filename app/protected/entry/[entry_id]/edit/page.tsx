import { fetchEntryDetail } from '@/lib/entries/fetchEntryDetail';
import { notFound } from 'next/navigation';
import EditEntryForm from './_components/EditEntryForm';

interface Props {
  params: { entry_id: string };
}

export default async function EditEntryPage({ params }: Props) {
  const detail = await fetchEntryDetail(params.entry_id);
  if (!detail) return notFound();

  const { entry } = detail;

  return (
    <main className="max-w-2xl mx-auto space-y-6">
      <EditEntryForm
        entryId={entry.id}
        initialSummary={entry.summary ?? ''}
        initialFromPage={entry.from_page ?? null}
        initialToPage={entry.to_page ?? null}
        initialDate={entry.date}
        initialIsPrivate={entry.is_private}
        book={entry.book}
      />
    </main>
  );
}
