'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Book } from '@/types/book';
import EntryForm, { EntryFormValues } from '@/components/entries/EntryForm';

interface Props {
  userBookId: string;
  userId: string;
  book: Book;
  bookId: string;
}

export default function NewEntryForm({ userBookId, userId, book, bookId }: Props) {
  const router = useRouter();

  const handleSubmit = async (values: EntryFormValues): Promise<string | null> => {
    try {
      const res = await fetch('/api/entries/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          user_book_id: userBookId,
          book_id: bookId,
          user_id: userId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        return data?.error ?? '기록 저장 중 오류가 발생했습니다.';
      }
      toast.success('기록을 남겼어요.');
      router.push(`/protected/books/${bookId}`);
      return null;
    } catch {
      return '서버와 통신 중 오류가 발생했습니다.';
    }
  };

  return (
    <EntryForm book={book} heading="기록 남기기" submitLabel="남기기" onSubmit={handleSubmit} />
  );
}
