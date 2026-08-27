import { redirect, notFound } from 'next/navigation';

import { fetchBookDetail } from '@/lib/books/fetchBookDetail';
import { hasEntryContent } from '@/lib/entries/validation';
import ExcerptReader from '@/components/books/ExcerptReader';

interface Props {
  params: Promise<{
    book_id: string;
  }>;
}

export default async function BookExcerptsPage({ params }: Props) {
  const book_id = (await params).book_id;

  const data = await fetchBookDetail(book_id);

  if (!data) return notFound();

  const { userBook, entries } = data;
  const { books: book } = userBook;

  if (!book) return notFound();

  if (!userBook.is_finished) {
    redirect(`/protected/books/${book_id}`);
  }

  const allEntries = entries ?? [];

  const quotes = allEntries
    .filter((e) => hasEntryContent(e.entry.quote, null))
    .sort((a, b) => {
      if (a.entry.date !== b.entry.date) {
        return a.entry.date < b.entry.date ? -1 : 1;
      }
      const createdA = new Date(a.entry.created_at).getTime();
      const createdB = new Date(b.entry.created_at).getTime();
      return createdA - createdB;
    })
    .map((e) => ({
      id: e.entry.id,
      date: e.entry.date,
      quote: e.entry.quote as string,
    }));

  const lastDate =
    allEntries.length > 0
      ? allEntries.reduce((latest, e) => (e.entry.date > latest ? e.entry.date : latest), allEntries[0].entry.date)
      : null;

  return (
    <ExcerptReader
      bookTitle={book.title}
      author={book.author}
      quotes={quotes}
      lastDate={lastDate}
    />
  );
}
