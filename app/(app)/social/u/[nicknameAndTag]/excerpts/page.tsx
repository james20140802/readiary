import { notFound, redirect } from 'next/navigation';
import { FriendMonthlyExcerptArchive } from '@/components/monthly-excerpt/MonthlyExcerptArchive';
import { isFriendWith } from '@/lib/friends/isFriendWith';
import {
  fetchExcerptOwner,
  fetchFriendExcerptYear,
  fetchFriendExcerptYears,
} from '@/lib/monthly-excerpt/server';
import { parseNicknameAndTagSlug } from '@/lib/social/invite';
import { getServerUser } from '@/lib/supabase/getServerUser';

interface Props {
  params: Promise<{ nicknameAndTag: string }>;
}

/**
 * 친구의 달의 발췌집 모아 보기. 친구가 아니거나 없는 사람이면 같은 404다.
 * 친구인데 보여 준 달이 없으면 빈 화면이다. 해 목록을 불러오지 못하면 error.tsx가 받는다.
 * 첫 해의 달만 실패하면 그 해 안에서 다시 시도하게 한다.
 */
export default async function FriendExcerptsPage({ params }: Props) {
  const slug = (await params).nicknameAndTag;
  const parsed = parseNicknameAndTagSlug(slug);
  if (!parsed) notFound();

  const {
    data: { user },
  } = await getServerUser();
  if (!user) notFound();

  const owner = await fetchExcerptOwner(parsed.nickname, parsed.tag);
  if (!owner) notFound();
  if (owner.id === user.id) redirect('/excerpts');
  if (!(await isFriendWith(parsed))) notFound();

  const years = await fetchFriendExcerptYears(owner.id);
  const firstYearMonths = years[0]
    ? await fetchFriendExcerptYear(owner.id, years[0].year).catch(() => null)
    : [];

  return (
    <FriendMonthlyExcerptArchive
      ownerId={owner.id}
      ownerName={owner.name}
      slug={slug}
      years={years}
      firstYearMonths={firstYearMonths}
    />
  );
}
