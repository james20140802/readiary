import { fetchFriendBooks } from '@/lib/friends/fetchFriendBooks';

import { notFound } from 'next/navigation';
import BookList from '@/components/books/BookList';
import { isFriendWith } from '@/lib/friends/isFriendWith';
import BackButton from '@/components/ui/BackButton';
import Link from 'next/link';

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
      <header className="flex items-center mb-6">
        <BackButton />
        <h1 className="text-page-title ml-4">
          <Link
            href={`/protected/profile/u/${profile.nickname}-${profile.tag}`}
            className="font-bold text-zinc-900 dark:text-zinc-100 hover:underline"
          >
            {profile.name}
          </Link>
          님의 책장
        </h1>
      </header>
      <div className="mt-6">
        <BookList books={books} isFriend nicknameAndTag={nickname + '-' + tag} />
      </div>
    </>
  );
}
