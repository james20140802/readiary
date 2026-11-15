import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';
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
  const supabase = await createSupabaseServerClient();
  // 책갈피는 곁다리다 — 읽지 못해도 책은 그대로 열리고 꽂히지 않은 것으로 본다
  const [data, { data: profile }] = await Promise.all([
    fetchBookDetail(book_id),
    supabase.from('profiles').select('bookmark_user_book_id').eq('id', user.id).maybeSingle(),
  ]);
  if (!data) return notFound();

  const { userBook, entries } = data;
  if (!userBook.books) return notFound();

  return (
    <BookDetailContent
      userBook={userBook}
      entries={entries}
      userId={user.id}
      isBookmarked={profile?.bookmark_user_book_id === userBook.id}
    />
  );
}
