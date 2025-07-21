import { fetchFriendBooks } from '@/lib/friends/fetchFriendBooks';
import FriendBookList from './_components/FriendBookList';
import { notFound } from 'next/navigation';

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
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-4">{profile.name}님의 책장</h1>
      <FriendBookList books={books} profile={profile} />
    </main>
  );
}
