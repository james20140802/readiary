import { getServerUser } from '@/lib/supabase/getServerUser';
import { fetchFriendEntryDetail } from '@/lib/friends/fetchFriendEntryDetail';

import { notFound } from 'next/navigation';
import { isFriendWith } from '@/lib/friends/isFriendWith';
import { parseNicknameAndTagSlug } from '@/lib/social/invite';
import FriendProfileHeader from '@/components/social/FriendProfileHeader';
import EntryDetailContent from '@/components/entry/EntryDetailContent';
import EntryUnavailable from '@/components/social/EntryUnavailable';

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ nicknameAndTag: string; entry_id: string }>;
}) {
  const {
    data: { user },
  } = await getServerUser();

  if (!user) return null;

  const { entry_id: entryId, nicknameAndTag } = await params;
  const parsed = parseNicknameAndTagSlug(nicknameAndTag);
  if (!entryId || !parsed) return notFound();
  const { nickname, tag } = parsed;

  const isFriend = await isFriendWith({ nickname, tag });

  if (!isFriend) {
    return notFound();
  }

  const detail = await fetchFriendEntryDetail(nickname, tag, entryId);

  if (!detail) {
    return (
      <EntryUnavailable
        libraryHref={`/social/u/${nicknameAndTag}`}
        message="기록을 찾을 수 없어요. 지워졌거나 주소가 바뀌었을 수 있어요."
      />
    );
  }

  const { entry, profile } = detail;

  if (entry.entry.is_private) {
    return (
      <EntryUnavailable
        libraryHref={`/social/u/${nicknameAndTag}`}
        message="나만 보기로 바뀐 기록이에요."
      />
    );
  }

  return (
    <>
      <FriendProfileHeader profile={profile} title="기록" />
      <div className="mt-6">
        <EntryDetailContent
          entry={entry.entry}
          book={entry.entry.book}
          friendProfile={profile}
          isFriend
          initialLiked={entry.initialLiked}
          initialLikeCount={entry.initialLikeCount}
          initialCommentCount={entry.initialCommentCount}
          currentUserId={user.id}
        />
      </div>
    </>
  );
}
