'use client';

import { updateEntry } from '@/lib/actions/updateEntry';
import { useRouter } from 'next/navigation';
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

  const handleSubmit = async (values: EntryFormValues): Promise<string | null> => {
    const error = await updateEntry(entryId, values);
    if (error) return error;
    router.push(`/protected/entry/${entryId}`);
    return null;
  };

  return (
    <EntryForm
      book={book}
      successHref={`/protected/entry/${entryId}`}
      heading="기록 고치기"
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
