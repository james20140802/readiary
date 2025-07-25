import { redirect, notFound } from 'next/navigation';

import { fetchBookDetail } from '@/lib/books/fetchBookDetail';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import BookDetailContent from '@/components/books/BookDetailContent';
import { toast } from 'sonner';

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
  if (!user) {
    toast.error('로그인 정보를 찾을 수 없습니다. 다시 로그인 해주세요.');
    return redirect('/login');
  }

  const book_id = (await params).book_id;

  const data = await fetchBookDetail(book_id);

  if (!data) return notFound();

  const { userBook, entries } = data;
  const { books: book } = userBook;

  if (!book) return notFound();

  return (
    <div className="w-full">
      <BookDetailContent userBook={userBook} entries={entries} userId={user.id} />
    </div>
  );
}
