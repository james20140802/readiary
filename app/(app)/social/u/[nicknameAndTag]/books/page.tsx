import { fetchFriendBooks } from '@/lib/friends/fetchFriendBooks';

import { notFound } from 'next/navigation';
import BookList from '@/components/books/BookList';
import { isFriendWith } from '@/lib/friends/isFriendWith';
import { parseNicknameAndTagSlug } from '@/lib/social/invite';
import SocialTopBar from '@/components/social/SocialTopBar';
import { LargeTitle } from '@/components/shell/LargeTitle';

interface Props {
  params: Promise<{ nicknameAndTag: string }>;
}

export default async function FriendBooksPage({ params }: Props) {
  const parsed = parseNicknameAndTagSlug((await params).nicknameAndTag);
  if (!parsed) return notFound();
  const { nickname, tag } = parsed;

  const isFriend = await isFriendWith({ nickname, tag });

  if (!isFriend) return notFound();

  const data = await fetchFriendBooks(nickname, tag);
  if (!data) return notFound();
  const { profile, books } = data;

  if (!profile || !books) {
    return notFound();
  }

  const libraryHref = `/social/u/${profile.nickname}-${profile.tag}`;

  return (
    <>
      <SocialTopBar
        title={`${profile.name}의 서가`}
        back={{ href: libraryHref, label: `${profile.name}의 서재` }}
      />
      <LargeTitle>{profile.name}의 서가</LargeTitle>
      <p className="mt-1 font-sans text-[15px] font-medium text-ink-sub">
        {books.length}권 · 친구에게 보이는 기록만 열려요
      </p>
      <div className="mt-6">
        <BookList books={books} isFriend nicknameAndTag={nickname + '-' + tag} />
      </div>
    </>
  );
}
