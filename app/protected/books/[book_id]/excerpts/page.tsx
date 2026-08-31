import { redirect, notFound } from 'next/navigation';

import { fetchBookExcerpts } from '@/lib/books/fetchBookExcerpts';
import { hasEntryContent } from '@/lib/entries/validation';
import ExcerptReader from '@/components/books/ExcerptReader';

interface Props {
  params: Promise<{
    book_id: string;
  }>;
}

export default async function BookExcerptsPage({ params }: Props) {
  const book_id = (await params).book_id;

  const data = await fetchBookExcerpts(book_id);

  if (!data) return notFound();

  if (!data.isFinished) {
    redirect(`/protected/books/${book_id}`);
  }

  // 쿼리가 date asc, created_at asc로 정렬해 오므로 추가 정렬이 필요 없다.
  const quotes = data.entries
    .filter((e) => hasEntryContent(e.quote, null))
    .map((e) => ({
      id: e.id,
      date: e.date,
      quote: e.quote as string,
    }));

  const entryDates = data.entries.map((e) => e.date);

  return (
    <ExcerptReader
      bookTitle={data.bookTitle}
      author={data.author}
      quotes={quotes}
      entryDates={entryDates}
    />
  );
}
