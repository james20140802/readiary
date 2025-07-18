import { fetchProfileData } from '@/lib/profile/fetchProfileData';
import ProfileHeader from './_components/ProfileHeader';
import ProfileBookshelf from '@/components/profile/ProfileBookshelf';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileBadges from '@/components/profile/ProfileBadges';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserStats } from '@/lib/stats/getUserStats';

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return <p className="text-center mt-10 text-red-500">로그인이 필요합니다.</p>;
  }

  const { profile, userBooks, userBadges } = await fetchProfileData(user.id);
  const stats = await getUserStats(user.id);

  if (!profile || !userBooks || !userBadges) {
    return <p className="text-center mt-10 text-gray-400">로딩 중...</p>;
  }

  return (
    <div className="max-w-3xl w-full mx-auto px-4 py-6">
      <h1 className="text-center text-xl font-semibold mb-6">👤 내 프로필</h1>
      <div className="space-y-6">
        <ProfileHeader user={user} profile={profile} />
        <ProfileBookshelf userBooks={userBooks} />
        {stats ? (
          <ProfileStats stats={stats} />
        ) : (
          <p className="text-sm text-gray-500">통계 정보를 불러올 수 없습니다.</p>
        )}
        <ProfileBadges userBadges={userBadges} />
      </div>
    </div>
  );
}
