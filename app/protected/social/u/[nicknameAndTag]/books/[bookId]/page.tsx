import { fetchFriendBookEntries } from '@/lib/friends/fetchFriendBookEntries';
import { notFound } from 'next/navigation';
import { isFriendWith } from '@/lib/friends/isFriendWith';
import FriendProfileHeader from '@/components/social/FriendProfileHeader';
import BookDetailContent from '@/components/books/BookDetailContent';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface FriendBookDetailPageProps {
  params: Promise<{
    nicknameAndTag: string;
    bookId: string;
  }>;
}

export default async function FriendBookDetailPage({ params }: FriendBookDetailPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { nicknameAndTag, bookId } = await params;
  const [nickname, tag] = nicknameAndTag.split('-');

  const isFriend = await isFriendWith({ nickname, tag });

  if (!isFriend) {
    return notFound();
  }

  const data = await fetchFriendBookEntries({ nickname, tag, bookId });

  if (!data) {
    return notFound();
  }

  const { profile, book, entries } = data;

  return (
    <>
      <FriendProfileHeader profile={profile} />
      <div className="mt-6">
        <BookDetailContent
          userBook={book}
          userId={user.id}
          entries={entries}
          friendProfile={profile}
          isFriend
        />
      </div>
    </>
  );
}
