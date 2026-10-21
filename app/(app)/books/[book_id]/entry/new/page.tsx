import { notFound } from 'next/navigation';
import NewEntryForm from './_components/NewEntryForm';
import { fetchBookBasicInfo } from '@/lib/books/fetchBookBasicInfo';

export default async function NewEntryPage({ params }: { params: Promise<{ book_id: string }> }) {
  const book_id = (await params).book_id;
  const detail = await fetchBookBasicInfo(book_id);
  if (!detail) return notFound();

  return (
    <NewEntryForm
      userBookId={detail.userBookId}
      userId={detail.userId}
      book={detail.book}
      bookId={detail.book.id}
    />
  );
}
