import { fetchFriendBooks } from '@/lib/friends/fetchFriendBooks';

import { notFound } from 'next/navigation';
import BookList from '@/components/books/BookList';
import FriendProfileHeader from '@/components/social/FriendProfileHeader';

interface Props {
  params: Promise<{ nicknameAndTag: string }>;
}

export default async function FriendBooksPage({ params }: Props) {
  const [nickname, tag] = (await params).nicknameAndTag.split('-');

  const data = await fetchFriendBooks(nickname, tag);
  if (!data) return notFound();
  const { profile, books } = data;

  if (!profile || !books) {
    return <div className="text-center mt-10 text-gray-500">존재하지 않는 사용자입니다.</div>;
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
