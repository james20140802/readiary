import { fetchFriendEntryDetail } from '@/lib/friends/fetchFriendEntryDetail';

import { notFound } from 'next/navigation';
import { isFriendWith } from '@/lib/friends/isFriendWith';
import FriendProfileHeader from '@/components/social/FriendProfileHeader';
import EntryDetailContent from '@/components/entry/EntryDetailContent';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ nicknameAndTag: string; entry_id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const entryId = (await params).entry_id;
  const [nickname, tag] = (await params).nicknameAndTag.split('-');
  if (!entryId || !nickname || !tag) return notFound();

  const isFriend = await isFriendWith({ nickname, tag });

  if (!isFriend) {
    return notFound();
  }

  const detail = await fetchFriendEntryDetail(nickname, tag, entryId);

  if (!detail) {
    return <p className="p-4 text-red-500">기록을 찾을 수 없습니다.</p>;
  }

  const { entry, profile } = detail;

  if (entry.entry.is_private) {
    return <p className="p-4 text-gray-500">비공개된 기록입니다.</p>;
  }

  return (
    <>
      <FriendProfileHeader profile={profile} />
      <div className="mt-6">
        <EntryDetailContent
          entry={entry.entry}
          book={entry.entry.book}
          friendProfile={profile}
          isFriend
          initialLiked={entry.initialLiked}
          initialLikeCount={entry.initialLikeCount}
          currentUserId={user.id}
        />
      </div>
    </>
  );
}
