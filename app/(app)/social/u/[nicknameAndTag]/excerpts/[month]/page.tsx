import { notFound, redirect } from 'next/navigation';
import MonthlyExcerptReader from '@/components/monthly-excerpt/MonthlyExcerptReader';
import SocialTopBar from '@/components/social/SocialTopBar';
import { isMonthKey } from '@/lib/monthly-excerpt/month';
import { fetchExcerptOwner, fetchFriendMonthlyExcerpt } from '@/lib/monthly-excerpt/server';
import { parseNicknameAndTagSlug } from '@/lib/social/invite';
import { getServerUser } from '@/lib/supabase/getServerUser';

interface Props {
  params: Promise<{ nicknameAndTag: string; month: string }>;
}

/**
 * 친구의 달의 발췌집을 읽는다. 내보내기와 고치기가 없고, 공개 문장만 온다.
 * 볼 수 있는지는 RPC가 정한다. 친구가 아니거나, 나만 보기거나, 공개 문장이 없거나, 없는 달이면 모두 같은 404다.
 * 불러오지 못한 것은 "없음"으로 오해하지 않도록 error.tsx에 맡긴다.
 */
export default async function FriendExcerptPage({ params }: Props) {
  const { nicknameAndTag: slug, month } = await params;
  const parsed = parseNicknameAndTagSlug(slug);
  if (!parsed || !isMonthKey(month)) notFound();

  const {
    data: { user },
  } = await getServerUser();
  if (!user) notFound();

  const owner = await fetchExcerptOwner(parsed.nickname, parsed.tag);
  if (!owner) notFound();
  if (owner.id === user.id) redirect(`/excerpts/${month}`);

  const excerpt = await fetchFriendMonthlyExcerpt(owner.id, month);
  if (!excerpt) notFound();

  return (
    <>
      <SocialTopBar
        title="달의 발췌집"
        back={{ href: `/social/u/${slug}/excerpts`, label: `${owner.name}의 달의 발췌집` }}
      />
      <MonthlyExcerptReader
        month={excerpt.month}
        items={excerpt.items}
        viewer="friend"
        ownerName={owner.name}
      />
    </>
  );
}
