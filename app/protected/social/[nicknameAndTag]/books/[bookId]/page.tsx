import { fetchFriendBookEntries } from '@/lib/friends/fetchFriendBookEntries';
import { notFound } from 'next/navigation';
import BookDetailContent from './_components/BookDetailContent';
import { isFriendWith } from '@/lib/friends/isFriendWith';

interface FriendBookDetailPageProps {
  params: Promise<{
    nicknameAndTag: string;
    bookId: string;
  }>;
}

export default async function FriendBookDetailPage({ params }: FriendBookDetailPageProps) {
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

  return (
    <BookDetailContent userBook={data.book} entries={data.entries} friendProfile={data.profile} />
  );
}
