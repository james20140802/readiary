'use client';

import { updateEntry } from '@/lib/actions/updateEntry';
import { useRouter } from 'next/navigation';
import { usePrefetchDestination } from '@/hooks/usePrefetchDestination';
import { Book } from '@/types/book';
import EntryForm, { EntryFormValues } from '@/components/entries/EntryForm';

interface Props {
  entryId: string;
  book: Book;
  initialQuote: string;
  initialNote: string;
  initialFromPage: number | null;
  initialToPage: number | null;
  initialIsPrivate: boolean;
  initialDate: string;
}

export default function EditEntryForm({
  entryId,
  book,
  initialQuote,
  initialNote,
  initialFromPage,
  initialToPage,
  initialIsPrivate,
  initialDate,
}: Props) {
  const router = useRouter();
  usePrefetchDestination(`/entry/${entryId}`);

  const handleSubmit = async (values: EntryFormValues): Promise<string | null> => {
    const error = await updateEntry(entryId, values);
    if (error) return error;
    router.push(`/entry/${entryId}`);
    return null;
  };

  return (
    <EntryForm
      entryId={entryId}
      book={book}
      successHref={`/entry/${entryId}`}
      heading="기록 고치기"
      back={{ href: `/entry/${entryId}`, label: '기록' }}
      submitLabel="고쳐 남기기"
      initial={{
        quote: initialQuote,
        note: initialNote,
        fromPage: initialFromPage,
        toPage: initialToPage,
        date: initialDate,
        isPrivate: initialIsPrivate,
      }}
      onSubmit={handleSubmit}
    />
  );
}
