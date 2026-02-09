import { fetchFriendBooks } from '@/lib/friends/fetchFriendBooks';

import { notFound } from 'next/navigation';
import BookList from '@/components/books/BookList';
import FriendProfileHeader from '@/components/social/FriendProfileHeader';
import { isFriendWith } from '@/lib/friends/isFriendWith';

interface Props {
  params: Promise<{ nicknameAndTag: string }>;
}

export default async function FriendBooksPage({ params }: Props) {
  const [nickname, tag] = (await params).nicknameAndTag.split('-');

  const isFriend = await isFriendWith({ nickname, tag });

  if (!isFriend) return notFound();

  const data = await fetchFriendBooks(nickname, tag);
  if (!data) return notFound();
  const { profile, books } = data;

  if (!profile || !books) {
    return notFound();
  }

  return (
    <>
      <h1 className="text-page-title mb-6">{profile.name}님의 책장</h1>
      <FriendProfileHeader profile={profile} />
      <div className="mt-6">
        <BookList books={books} isFriend />
      </div>
    </>
  );
}
