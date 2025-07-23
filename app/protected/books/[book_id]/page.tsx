import { redirect, notFound } from 'next/navigation';
import BookDetailContent from './_components/BookDetailContent';
import { fetchBookDetail } from '@/lib/books/fetchBookDetail';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface Props {
  params: Promise<{
    book_id: string;
  }>;
}

export default async function BookDetailPage({ params }: Props) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect('/');

  const book_id = (await params).book_id;

  const data = await fetchBookDetail(book_id);

  if (!data) return redirect('/');

  const { userBook, entries } = data;
  const { books: book } = userBook;

  if (!book) return notFound();

  return (
    <div className="w-full">
      <BookDetailContent userBook={userBook} entries={entries} userId={user.id} />
    </div>
  );
}
