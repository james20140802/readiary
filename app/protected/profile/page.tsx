import { fetchProfileData } from '@/lib/profile/fetchProfileData';
import ProfileBookshelf from '@/components/profile/ProfileBookshelf';
import ProfileStats from '@/components/profile/ProfileStats';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserStats } from '@/lib/stats/getUserStats';
import ProfileHeader from '@/components/profile/ProfileHeader';
import { notFound } from 'next/navigation';
import AnimatedSection from '@/components/ui/AnimatedSection';

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return <p className="text-center mt-10 text-danger">로그인이 필요합니다.</p>;
  }

  const [{ profile, userBooks, userBadges }, stats] = await Promise.all([
    fetchProfileData(user.id),
    getUserStats(user.id),
  ]);

  if (!profile || !userBooks || !userBadges) {
    return notFound();
  }

  return (
    <div>
      <h1 className="text-page-title text-label dark:text-label-invert mb-2">👤 내 프로필</h1>
      <AnimatedSection>
        <div>
          <ProfileHeader user={user} profile={profile} />
          <ProfileBookshelf userBooks={userBooks} isOwnProfile />
          {stats ? (
            <ProfileStats stats={stats} badges={userBadges} />
          ) : (
            <p className="text-body-sm text-label-muted">통계 정보를 불러올 수 없습니다.</p>
          )}
        </div>
      </AnimatedSection>
    </div>
  );
}
