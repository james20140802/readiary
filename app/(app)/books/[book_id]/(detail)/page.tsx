import { getServerUser } from '@/lib/supabase/getServerUser';
import { redirect, notFound } from 'next/navigation';
import { fetchBookDetail } from '@/lib/books/fetchBookDetail';
import BookDetailContent from '@/components/books/BookDetailContent';

interface Props {
  params: Promise<{
    book_id: string;
  }>;
}

export default async function BookDetailPage({ params }: Props) {
  const {
    data: { user },
  } = await getServerUser();
  if (!user) return redirect('/login');

  const book_id = (await params).book_id;
  const data = await fetchBookDetail(book_id);
  if (!data) return notFound();

  const { userBook, entries } = data;
  if (!userBook.books) return notFound();

  return <BookDetailContent userBook={userBook} entries={entries} userId={user.id} />;
}
