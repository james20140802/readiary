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

  if (!profile) throw new Error('Profile not found');
  const stats = await getUserStats(profile.id);

  return (
    <main className="max-w-screen-md w-full mx-auto px-4 pt-6 pb-24">
      <div className="max-w-3xl w-full mx-auto px-4 py-6">
        <h1 className="text-center text-xl font-semibold mb-6">👤 내 프로필</h1>
        <div className="space-y-6">
          <ProfileHeader user={user} profile={profile} />
          <ProfileBookshelf
            userBooks={userBooks}
            baseLink={`/protected/social/${(await params).nicknameAndTag}/books`}
          />
          {stats ? (
            <ProfileStats stats={stats} />
          ) : (
            <p className="text-sm text-gray-500">통계 정보를 불러올 수 없습니다.</p>
          )}
          <ProfileBadges userBadges={userBadges} />
        </div>
      </div>
    </main>
  );
}
