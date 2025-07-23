import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileBookshelf from '@/components/profile/ProfileBookshelf';
import ProfileBadges from '@/components/profile/ProfileBadges';
import { getUserStats } from '@/lib/stats/getUserStats';
import ProfileHeader from '@/components/profile/ProfileHeader';
import { fetchProfileData } from '@/lib/profile/fetchProfileData';

interface FriendProfilePageProps {
  params: Promise<{ nicknameAndTag: string }>;
}

export default async function FriendProfilePage({ params }: FriendProfilePageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return notFound();

  const [nickname, tag] = (await params).nicknameAndTag.split('-');
  if (!nickname || !tag) return notFound();

  const { profile, userBooks, userBadges } = await fetchProfileData(nickname, tag);
  if (!profile) return notFound();

  const { data: friendRecord } = await supabase
    .from('friends')
    .select('id')
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${profile.id}),and(user_id.eq.${profile.id},friend_id.eq.${user.id})`
    )
    .eq('status', 'accepted')
    .maybeSingle();

  const isFriend = !!friendRecord;

  if (!isFriend && user.id !== profile.id) return notFound();

  const stats = await getUserStats(profile.id);

  return (
    <div>
      <h1 className="text-page-title text-label dark:text-white mb-6">👤 친구 프로필</h1>

      <ProfileHeader user={user} profile={profile} />
      <ProfileBookshelf
        userBooks={userBooks}
        baseLink={`/protected/social/${(await params).nicknameAndTag}/books`}
      />
      {stats ? (
        <ProfileStats stats={stats} />
      ) : (
        <p className="text-sm text-secondary">통계 정보를 불러올 수 없습니다.</p>
      )}
      <ProfileBadges userBadges={userBadges} />
    </div>
  );
}
