'use client';

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
    try {
      const res = await fetch(`/api/entries/${entryId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        return data?.error ?? '수정에 실패했어요.';
      }
      router.push(`/protected/entry/${entryId}`);
      return null;
    } catch {
      return '서버와 통신 중 오류가 발생했습니다.';
    }
  };

  return (
    <EntryForm
      book={book}
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
